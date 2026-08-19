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
    auth_user_id: string | null
    created_by: { first_name: string; last_name?: string; email?: string; username?: string; avatar_url?: string } | null
    last_modified_by: { first_name: string; last_name?: string; email?: string; username?: string; avatar_url?: string } | null
    deleted_at?: string | null
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
    auth_user_id?: string
    created_by?: { first_name: string; last_name?: string; email?: string; username?: string; avatar_url?: string }
    last_modified_by?: { first_name: string; last_name?: string; email?: string; username?: string; avatar_url?: string }
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
        auth_user_id: row.auth_user_id ?? undefined,
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
        auth_user_id: nb.auth_user_id ?? null,
        created_by: nb.created_by ?? null,
        last_modified_by: nb.last_modified_by ?? null,
    }
}

export type PublicNotebookCard = {
    id: string
    short_id: string
    title: string
    excerpt: string
    category?: string
    coverUrl?: string
    updatedAt: string
    created_by?: StoredNotebookDTO['created_by']
}

function excerptFromNotebook(row: StoredNotebookRow): string {
    const subtitle = row.publish?.subtitle?.trim()
    if (subtitle) return subtitle.slice(0, 240)
    const stripped = String(row.content || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[#>*_`~\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    return stripped.slice(0, 240)
}

/** Published notebooks for a profile page. No full body. */
export async function listPublishedNotebooksByAuthor(username: string): Promise<PublicNotebookCard[]> {
    const handle = String(username || '')
        .replace(/^@/, '')
        .trim()
    if (!handle || handle.length > 64) return []

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, username')
        .ilike('username', handle)
        .maybeSingle()

    if (profileError) throw profileError

    let query = supabaseAdmin
        .from('wim_notebooks')
        .select('id, short_id, title, content, publish, updated_at, created_by, auth_user_id, is_published')
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(40)

    if (profile?.id) {
        query = query.eq('auth_user_id', profile.id)
    } else {
        query = query.contains('created_by', { username: handle })
    }

    const { data, error } = await query
    if (error) throw error

    return ((data as StoredNotebookRow[] | null) ?? []).map((row) => ({
        id: row.id,
        short_id: row.short_id,
        title: row.publish?.publicTitle || row.title,
        excerpt: excerptFromNotebook(row),
        category: row.publish?.category,
        coverUrl: row.publish?.coverUrl,
        updatedAt: row.updated_at,
        created_by: row.created_by ?? undefined,
    }))
}

function applyOwnerScope<T extends { or: Function; eq: Function }>(query: T, ownerKey: string, userId?: string): T {
    if (userId && userId === ownerKey) {
        return query.or(`owner_key.eq.${ownerKey},auth_user_id.eq.${userId}`)
    }
    return query.eq('owner_key', ownerKey)
}

export async function listNotebooksByOwner(ownerKey: string, userId?: string): Promise<StoredNotebookDTO[]> {
    let query = supabaseAdmin.from('wim_notebooks').select('*').is('deleted_at', null).order('updated_at', { ascending: false })
    query = applyOwnerScope(query, ownerKey, userId)
    const { data, error } = await query

    if (error) throw error
    return (data as StoredNotebookRow[] | null)?.map(rowToDTO) ?? []
}

export async function listDeletedNotebookIds(ownerKey: string, userId?: string): Promise<string[]> {
    let query = supabaseAdmin.from('wim_notebooks').select('id').not('deleted_at', 'is', null)
    query = applyOwnerScope(query, ownerKey, userId)
    const { data, error } = await query.limit(500)
    if (error) throw error
    return ((data as { id: string }[] | null) || []).map((row) => row.id)
}

export async function getNotebookByIdOrShort(
    idOrShort: string,
    options?: { ownerKey?: string; userId?: string; publishedOnly?: boolean }
): Promise<StoredNotebookDTO | null> {
    const q = supabaseAdmin
        .from('wim_notebooks')
        .select('*')
        .or(`id.eq.${idOrShort},short_id.eq.${idOrShort}`)
        .is('deleted_at', null)
        .limit(1)

    const { data, error } = await q.maybeSingle()
    if (error) throw error
    if (!data) return null
    const row = data as StoredNotebookRow
    if (options?.publishedOnly && !row.is_published) return null
    if (options?.ownerKey) {
        const allowed =
            row.owner_key === options.ownerKey ||
            Boolean(options.userId && row.auth_user_id === options.userId)
        if (!allowed) return null
    }
    return rowToDTO(row)
}

/**
 * Block ownership takeover: if a notebook id already exists under another owner_key, refuse write.
 */
export async function assertNotebookWriteAccess(
    notebookId: string,
    ownerKey: string
): Promise<{ ok: true } | { ok: false; status: 403 | 404; error: string }> {
    if (!notebookId || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(notebookId)) {
        return { ok: false, status: 404, error: 'Not found' }
    }
    const { data, error } = await supabaseAdmin
        .from('wim_notebooks')
        .select('id, owner_key')
        .or(`id.eq.${notebookId},short_id.eq.${notebookId}`)
        .limit(1)
        .maybeSingle()

    if (error) throw error
    if (!data) return { ok: true } // create path
    if ((data as { owner_key: string }).owner_key !== ownerKey) {
        return { ok: false, status: 403, error: 'Forbidden: notebook owned by another principal' }
    }
    return { ok: true }
}

export async function upsertNotebook(nb: StoredNotebookDTO, ownerKey: string): Promise<StoredNotebookDTO> {
    const { data: existing, error: findErr } = await supabaseAdmin
        .from('wim_notebooks')
        .select('id, owner_key, version, deleted_at')
        .or(`id.eq.${nb.id},short_id.eq.${nb.id}`)
        .limit(1)
        .maybeSingle()

    if (findErr) throw findErr

    if (existing) {
        if ((existing as { owner_key: string }).owner_key !== ownerKey) {
            const err = new Error('Forbidden: notebook owned by another principal') as Error & { status?: number }
            err.status = 403
            throw err
        }
        if ((existing as { deleted_at?: string | null }).deleted_at) {
            const err = new Error('Notebook was deleted') as Error & { status?: number }
            err.status = 410
            throw err
        }

        const currentDbVersion = Number((existing as { version?: number }).version || 1)
        const incomingVersion = Number(nb.version || 0)

        // Optimistic version locking: reject updates with outdated client versions
        if (incomingVersion > 0 && incomingVersion < currentDbVersion) {
            const err = new Error(`Conflict: Notebook version mismatch (current version is ${currentDbVersion})`) as Error & {
                status?: number
                code?: string
            }
            err.status = 409
            err.code = 'VERSION_CONFLICT'
            throw err
        }

        // Auto-increment version for successful updates
        nb.version = currentDbVersion + 1
    } else {
        nb.version = Math.max(1, Number(nb.version || 1))
    }

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
    const updatedRows: Omit<StoredNotebookRow, never>[] = []

    for (const nb of notebooks) {
        const { data: existing } = await supabaseAdmin
            .from('wim_notebooks')
            .select('id, owner_key, version, deleted_at')
            .or(`id.eq.${nb.id},short_id.eq.${nb.id}`)
            .limit(1)
            .maybeSingle()

        if (existing) {
            if ((existing as { owner_key: string }).owner_key !== ownerKey) {
                const err = new Error('Forbidden: notebook owned by another principal') as Error & { status?: number }
                err.status = 403
                throw err
            }
            if ((existing as { deleted_at?: string | null }).deleted_at) {
                const err = new Error('Notebook was deleted') as Error & { status?: number }
                err.status = 410
                throw err
            }
            const currentDbVersion = Number((existing as { version?: number }).version || 1)
            const incomingVersion = Number(nb.version || 0)

            if (incomingVersion > 0 && incomingVersion < currentDbVersion) {
                const err = new Error(`Conflict: Notebook version mismatch on ${nb.id} (current version is ${currentDbVersion})`) as Error & {
                    status?: number
                    code?: string
                }
                err.status = 409
                err.code = 'VERSION_CONFLICT'
                throw err
            }
            nb.version = currentDbVersion + 1
        } else {
            nb.version = Math.max(1, Number(nb.version || 1))
        }
        updatedRows.push(dtoToRow(nb, ownerKey))
    }

    const { error, count } = await supabaseAdmin.from('wim_notebooks').upsert(updatedRows, {
        onConflict: 'id',
        count: 'exact',
    })
    if (error) throw error
    return count ?? updatedRows.length
}


/** Replace history only after ownership check (prevents cross-tenant history wipe). */
export async function replaceHistoryForOwner(
    notebookId: string,
    ownerKey: string,
    entries: NotebookVersionDTO[]
): Promise<void> {
    const existing = await getNotebookByIdOrShort(notebookId, { ownerKey })
    if (!existing) {
        const err = new Error('Forbidden or not found: cannot write history for this notebook') as Error & {
            status?: number
        }
        err.status = 403
        throw err
    }
    await replaceHistory(existing.id, entries)
}

export async function deleteNotebook(idOrShort: string, ownerKey: string, userId?: string): Promise<boolean> {
    const { data: existing, error: findError } = await supabaseAdmin
        .from('wim_notebooks')
        .select('id, owner_key, auth_user_id, deleted_at')
        .or(`id.eq.${idOrShort},short_id.eq.${idOrShort}`)
        .limit(1)
        .maybeSingle()
    if (findError) throw findError
    if (!existing) return false
    const row = existing as { id: string; owner_key: string; auth_user_id: string | null; deleted_at: string | null }

    // Already deleted — finish any partial cleanup and return success
    if (row.deleted_at) {
        await purgeNotebookData(row.id, row.owner_key).catch(() => {})
        return true
    }

    const allowed = row.owner_key === ownerKey || Boolean(userId && row.auth_user_id === userId)
    if (!allowed) return false

    // 1. Hard-delete the notebook row from DB
    const { error: delError } = await supabaseAdmin
        .from('wim_notebooks')
        .delete()
        .eq('id', row.id)

    if (delError) throw delError

    // 2. Purge history + storage — best-effort, never fatal
    await purgeNotebookData(row.id, row.owner_key).catch((e) =>
        console.error('[deleteNotebook] purge error', e)
    )

    return true
}

/**
 * Purge all data associated with a deleted notebook:
 * - All wim_notebook_history rows for this notebook
 * - All storage files in notebook-media/<ownerKey>/
 * Best-effort: errors are logged, not thrown.
 */
async function purgeNotebookData(notebookId: string, ownerKey: string): Promise<void> {
    // Delete version history
    await supabaseAdmin
        .from('wim_notebook_history')
        .delete()
        .eq('notebook_id', notebookId)
        .catch((e) => console.error('[purgeNotebookData] history delete error', e))

    // List and delete all storage files uploaded by this owner
    const { data: files, error: listError } = await supabaseAdmin.storage
        .from('notebook-media')
        .list(ownerKey, { limit: 1000 })

    if (!listError && files && files.length > 0) {
        const paths = files.map((f) => `${ownerKey}/${f.name}`)
        await supabaseAdmin.storage
            .from('notebook-media')
            .remove(paths)
            .catch((e) => console.error('[purgeNotebookData] storage remove error', e))
    }
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
        content: entry.content ?? '',
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
        content: entry.content ?? '',
        title: entry.title ?? null,
        timestamp: entry.timestamp || new Date().toISOString(),
        label: entry.label ?? null,
    }))
    const { error } = await supabaseAdmin.from('wim_notebook_history').insert(rows)
    if (error) throw error
}
