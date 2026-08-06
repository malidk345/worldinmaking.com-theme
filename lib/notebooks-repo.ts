/**
 * Server-side WIM notebooks repository (Supabase service role).
 * Used only by API routes — never import from client components.
 */
import { supabaseAdmin } from './supabase-admin'

export type NotebookPublishMeta = {
    publicTitle?: string
    subtitle?: string
    coverUrl?: string
    category?: string
    tags?: string[]
}

export type StoredNotebookRow = {
    id: string
    short_id: string
    title: string
    content: string
    created_at: string
    updated_at: string
    pinned: boolean | null
    is_template: boolean | null
    is_published: boolean | null
    publish: NotebookPublishMeta | null
    version: number
    owner_key: string
    created_by: { first_name: string; email: string } | null
    last_modified_by: { first_name: string; email: string } | null
}

export type NotebookHistoryRow = {
    id?: number
    notebook_id: string
    version: number
    content: string
    title: string | null
    timestamp: string
    label: string | null
}

/** Client-facing shape (matches notebookStorage.StoredNotebook) */
export type StoredNotebookDTO = {
    id: string
    short_id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
    pinned?: boolean
    isTemplate?: boolean
    isPublished?: boolean
    publish?: NotebookPublishMeta
    version: number
    created_by?: { first_name: string; email: string }
    last_modified_by?: { first_name: string; email: string }
}

export type NotebookVersionDTO = {
    version: number
    content: string
    title?: string
    timestamp: string
    label?: string
}

export function rowToDTO(row: StoredNotebookRow): StoredNotebookDTO {
    return {
        id: row.id,
        short_id: row.short_id,
        title: row.title,
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        pinned: row.pinned ?? undefined,
        isTemplate: row.is_template ?? undefined,
        isPublished: row.is_published ?? undefined,
        publish: row.publish ?? undefined,
        version: row.version ?? 1,
        created_by: row.created_by ?? undefined,
        last_modified_by: row.last_modified_by ?? undefined,
    }
}

export function dtoToRow(nb: StoredNotebookDTO, ownerKey: string): Omit<StoredNotebookRow, never> {
    return {
        id: nb.id,
        short_id: nb.short_id,
        title: nb.title,
        content: nb.content ?? '',
        created_at: nb.createdAt || new Date().toISOString(),
        updated_at: nb.updatedAt || new Date().toISOString(),
        pinned: nb.pinned ?? false,
        is_template: nb.isTemplate ?? false,
        is_published: nb.isPublished ?? false,
        publish: nb.publish ?? null,
        version: nb.version ?? 1,
        owner_key: ownerKey,
        created_by: nb.created_by ?? null,
        last_modified_by: nb.last_modified_by ?? null,
    }
}

export async function listNotebooksByOwner(ownerKey: string): Promise<StoredNotebookDTO[]> {
    const { data, error } = await supabaseAdmin
        .from('wim_notebooks')
        .select('*')
        .eq('owner_key', ownerKey)
        .order('updated_at', { ascending: false })

    if (error) throw error
    return (data as StoredNotebookRow[] | null)?.map(rowToDTO) ?? []
}

export async function getNotebookByIdOrShort(
    idOrShort: string,
    options?: { ownerKey?: string; publishedOnly?: boolean }
): Promise<StoredNotebookDTO | null> {
    let q = supabaseAdmin.from('wim_notebooks').select('*').or(`id.eq.${idOrShort},short_id.eq.${idOrShort}`).limit(1)

    if (options?.publishedOnly) {
        q = q.eq('is_published', true)
    } else if (options?.ownerKey) {
        q = q.eq('owner_key', options.ownerKey)
    }

    const { data, error } = await q.maybeSingle()
    if (error) throw error
    if (!data) return null
    return rowToDTO(data as StoredNotebookRow)
}

export async function upsertNotebook(nb: StoredNotebookDTO, ownerKey: string): Promise<StoredNotebookDTO> {
    const row = dtoToRow(nb, ownerKey)
    const { data, error } = await supabaseAdmin
        .from('wim_notebooks')
        .upsert(row, { onConflict: 'id' })
        .select('*')
        .single()

    if (error) throw error
    return rowToDTO(data as StoredNotebookRow)
}

export async function upsertNotebooks(notebooks: StoredNotebookDTO[], ownerKey: string): Promise<number> {
    if (!notebooks.length) return 0
    const rows = notebooks.map((nb) => dtoToRow(nb, ownerKey))
    const { error, count } = await supabaseAdmin.from('wim_notebooks').upsert(rows, {
        onConflict: 'id',
        count: 'exact',
    })
    if (error) throw error
    return count ?? rows.length
}

export async function deleteNotebook(idOrShort: string, ownerKey: string): Promise<boolean> {
    // Resolve id first (delete by short_id or id)
    const existing = await getNotebookByIdOrShort(idOrShort, { ownerKey })
    if (!existing) return false

    const { error } = await supabaseAdmin.from('wim_notebooks').delete().eq('id', existing.id).eq('owner_key', ownerKey)

    if (error) throw error
    return true
}

export async function listHistory(notebookId: string): Promise<NotebookVersionDTO[]> {
    const { data, error } = await supabaseAdmin
        .from('wim_notebook_history')
        .select('version, content, title, timestamp, label')
        .eq('notebook_id', notebookId)
        .order('timestamp', { ascending: true })
        .limit(100)

    if (error) throw error
    return (
        (data as NotebookHistoryRow[] | null)?.map((h) => ({
            version: h.version,
            content: h.content,
            title: h.title ?? undefined,
            timestamp: h.timestamp,
            label: h.label ?? undefined,
        })) ?? []
    )
}

export async function appendHistory(
    notebookId: string,
    entry: NotebookVersionDTO
): Promise<void> {
    const { error } = await supabaseAdmin.from('wim_notebook_history').insert({
        notebook_id: notebookId,
        version: entry.version,
        content: entry.content,
        title: entry.title ?? null,
        timestamp: entry.timestamp || new Date().toISOString(),
        label: entry.label ?? null,
    })
    if (error) throw error
}

export async function replaceHistory(notebookId: string, entries: NotebookVersionDTO[]): Promise<void> {
    // Full replace for dual-write sync (local is source of truth for history list)
    await supabaseAdmin.from('wim_notebook_history').delete().eq('notebook_id', notebookId)
    if (!entries.length) return
    const rows = entries.map((entry) => ({
        notebook_id: notebookId,
        version: entry.version,
        content: entry.content,
        title: entry.title ?? null,
        timestamp: entry.timestamp || new Date().toISOString(),
        label: entry.label ?? null,
    }))
    const { error } = await supabaseAdmin.from('wim_notebook_history').insert(rows)
    if (error) throw error
}
