/**
 * Server-side WIM notebooks repository (Supabase service role).
 * Used only by API routes — never import from client components.
 */
import { supabaseAdmin } from './supabase-admin'
import { getCollaboratorRole, listCollaboratorRoles } from './notebook-collaborators'
import { canWriteNotebook, type NotebookAccessRole } from '../src/lib/notebook-sharing'
import { notifyNotebookComments, notifyNotebookMentions } from './notebook-mentions'
import { hasSyncTombstone, listSyncTombstoneIds, recordSyncTombstone } from './sync-tombstones'

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
    preview?: string | null
    organize?: {
        folder?: string | null
        tags?: string[] | null
        kind?: 'note' | 'daily' | null
        dailyDate?: string | null
    } | null
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
    access_role?: NotebookAccessRole
    created_by?: { first_name: string; last_name?: string; email?: string; username?: string; avatar_url?: string }
    last_modified_by?: { first_name: string; last_name?: string; email?: string; username?: string; avatar_url?: string }
    folder?: string
    tags?: string[]
    kind?: 'note' | 'daily'
    dailyDate?: string
    preview?: string
    contentOmitted?: boolean
}

export type NotebookVersionDTO = {
    version: number
    content: string
    title?: string
    timestamp: string
    label?: string
}

export function rowToDTO(row: StoredNotebookRow, accessRole: NotebookAccessRole = 'owner'): StoredNotebookDTO {
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
        access_role: accessRole,
        created_by: row.created_by ?? undefined,
        last_modified_by: row.last_modified_by ?? undefined,
        folder: row.organize?.folder || undefined,
        tags: Array.isArray(row.organize?.tags) ? row.organize?.tags.filter(Boolean) : undefined,
        kind: row.organize?.kind === 'daily' ? 'daily' : undefined,
        dailyDate: row.organize?.dailyDate || undefined,
        preview: row.preview || undefined,
    }
}

const NOTEBOOK_LIST_COLUMNS =
    'id, short_id, title, preview, created_at, updated_at, pinned, is_template, is_published, publish, version, owner_key, auth_user_id, created_by, last_modified_by, organize'

export function rowToListDTO(row: StoredNotebookRow, accessRole: NotebookAccessRole = 'owner'): StoredNotebookDTO {
    return {
        ...rowToDTO({ ...row, content: '' }, accessRole),
        content: '',
        preview: row.preview || '',
        contentOmitted: true,
    }
}

function isOwnerOfRow(
    row: Pick<StoredNotebookRow, 'owner_key' | 'auth_user_id'>,
    ownerKey: string,
    userId?: string,
    extraOwnerKeys: string[] = []
): boolean {
    if (row.owner_key === ownerKey || Boolean(userId && row.auth_user_id === userId)) return true
    return extraOwnerKeys.some((key) => key && key === row.owner_key)
}

export async function resolveNotebookAccess(
    row: Pick<StoredNotebookRow, 'id' | 'owner_key' | 'auth_user_id'>,
    ownerKey: string,
    userId?: string,
    extraOwnerKeys: string[] = []
): Promise<NotebookAccessRole | null> {
    if (isOwnerOfRow(row, ownerKey, userId, extraOwnerKeys)) return 'owner'
    if (!userId) return null
    return getCollaboratorRole(row.id, userId)
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
        organize: {
            folder: nb.folder || null,
            tags: nb.tags || [],
            kind: nb.kind || 'note',
            dailyDate: nb.dailyDate || null,
        },
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
    if (row.preview) return row.preview.slice(0, 240)
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
        .select('id, short_id, title, preview, publish, updated_at, created_by, auth_user_id, is_published')
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(40)

    if (profile?.id) {
        query = query.or(`auth_user_id.eq.${profile.id},owner_key.eq.${profile.id}`)
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

function applyOwnerScope<T extends { or: Function; eq: Function }>(
    query: T,
    ownerKey: string,
    userId?: string,
    extraOwnerKeys: string[] = []
): T {
    const keys = Array.from(
        new Set([ownerKey, ...extraOwnerKeys.filter((key) => key && key !== ownerKey)])
    )
    const parts = keys.map((key) => `owner_key.eq.${key}`)
    if (userId) parts.push(`auth_user_id.eq.${userId}`)
    if (parts.length === 1) return query.eq('owner_key', ownerKey)
    return query.or(parts.join(','))
}

export async function listNotebooksByOwner(
    ownerKey: string,
    userId?: string,
    extraOwnerKeys: string[] = [],
    options?: { includeContent?: boolean }
): Promise<StoredNotebookDTO[]> {
    const columns = options?.includeContent ? '*' : NOTEBOOK_LIST_COLUMNS
    const toDTO = options?.includeContent ? rowToDTO : rowToListDTO
    let query = supabaseAdmin
        .from('wim_notebooks')
        .select(columns)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
    query = applyOwnerScope(query, ownerKey, userId, extraOwnerKeys)
    const { data, error } = await query
    if (error) throw error

    const owned = (data as StoredNotebookRow[] | null) ?? []
    const byId = new Map<string, StoredNotebookDTO>()
    for (const row of owned) {
        byId.set(row.id, toDTO(row, 'owner'))
    }

    if (userId) {
        const shared = await listCollaboratorRoles(userId)
        const missingIds = shared.map((row) => row.notebook_id).filter((id) => !byId.has(id))
        if (missingIds.length) {
            const { data: sharedRows, error: sharedError } = await supabaseAdmin
                .from('wim_notebooks')
                .select(columns)
                .in('id', missingIds)
                .is('deleted_at', null)
            if (sharedError) throw sharedError
            const roleById = new Map(shared.map((row) => [row.notebook_id, row.role]))
            for (const row of (sharedRows as StoredNotebookRow[] | null) ?? []) {
                byId.set(row.id, toDTO(row, roleById.get(row.id) || 'viewer'))
            }
        } else {
            for (const row of shared) {
                const existing = byId.get(row.notebook_id)
                if (existing && existing.access_role === 'owner') continue
            }
        }
    }

    return Array.from(byId.values()).sort(
        (a, b) => (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0)
    )
}

export async function listDeletedNotebookIds(
    ownerKey: string,
    userId?: string,
    extraOwnerKeys: string[] = []
): Promise<string[]> {
    const fromLedger = await listSyncTombstoneIds('notebook', ownerKey, userId)
    let query = supabaseAdmin.from('wim_notebooks').select('id, owner_key, auth_user_id').not('deleted_at', 'is', null)
    query = applyOwnerScope(query, ownerKey, userId, extraOwnerKeys)
    const { data, error } = await query.limit(500)
    if (error) throw error
    const leftover = (data as { id: string; owner_key: string; auth_user_id: string | null }[] | null) || []
    if (leftover.length) {
        const ids = leftover.map((row) => row.id)
        // Batch hard-delete cleanup: previously each stale row caused 3 sequential
        // round trips (tombstone upsert + history delete + row delete). On a list GET
        // that could stall sync with ~1500 sequential writes.
        try {
            await supabaseAdmin.from('wim_sync_tombstones').upsert(
                leftover.map((row) => ({
                    kind: 'notebook',
                    item_id: row.id,
                    owner_key: row.owner_key,
                    auth_user_id: row.auth_user_id,
                    deleted_at: new Date().toISOString(),
                })),
                { onConflict: 'kind,item_id' }
            )
        } catch (tombErr: any) {
            const message = String(tombErr?.message || tombErr)
            if (!message.includes('wim_sync_tombstones') && !message.includes('schema cache')) {
                // Tombstone ledger is a soft guarantee; the content rows below still get purged.
                console.warn('[listDeletedNotebookIds] tombstone batch failed', tombErr)
            }
        }
        // Chunk `in(...)` queries so ~500 UUID list GETs never exceed URL limits.
        for (let i = 0; i < ids.length; i += 100) {
            const chunk = ids.slice(i, i + 100)
            await Promise.all([
                supabaseAdmin.from('wim_notebook_history').delete().in('notebook_id', chunk),
                supabaseAdmin.from('wim_notebooks').delete().in('id', chunk),
            ])
        }
    }
    return Array.from(new Set([...fromLedger, ...leftover.map((row) => row.id)]))
}

export async function getNotebookByIdOrShort(
    idOrShort: string,
    options?: { ownerKey?: string; userId?: string; publishedOnly?: boolean; extraOwnerKeys?: string[] }
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
    let row = data as StoredNotebookRow
    if (options?.publishedOnly && !row.is_published) return null
    if (options?.ownerKey) {
        const extra = (options.extraOwnerKeys || []).filter(Boolean)
        const role = await resolveNotebookAccess(row, options.ownerKey, options.userId, extra)
        if (!role) return null
        return rowToDTO(row, role)
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
        .select('id, owner_key, auth_user_id')
        .or(`id.eq.${notebookId},short_id.eq.${notebookId}`)
        .limit(1)
        .maybeSingle()

    if (error) throw error
    if (!data) return { ok: true } // create path
    const row = data as { id: string; owner_key: string; auth_user_id: string | null }
    const role = await resolveNotebookAccess(row, ownerKey, ownerKey)
    if (!role || !canWriteNotebook(role)) {
        return { ok: false, status: 403, error: 'Forbidden: notebook owned by another principal' }
    }
    return { ok: true }
}

export async function upsertNotebook(
    nb: StoredNotebookDTO,
    ownerKey: string,
    userId?: string,
    extraOwnerKeys: string[] = []
): Promise<StoredNotebookDTO> {
    const { data: existing, error: findErr } = await supabaseAdmin
        .from('wim_notebooks')
        .select('id, owner_key, auth_user_id, version, deleted_at, is_published, publish, pinned, is_template, content')
        .or(`id.eq.${nb.id},short_id.eq.${nb.id}`)
        .limit(1)
        .maybeSingle()

    if (findErr) throw findErr

    let accessRole: NotebookAccessRole = 'owner'
    let persistOwnerKey = ownerKey

    if (existing) {
        const current = existing as StoredNotebookRow
        const role = await resolveNotebookAccess(current, ownerKey, userId || ownerKey, extraOwnerKeys)
        if (!role || !canWriteNotebook(role)) {
            const err = new Error('Forbidden: notebook owned by another principal') as Error & { status?: number }
            err.status = 403
            throw err
        }
        accessRole = role
        persistOwnerKey =
            role === 'owner' && userId ? userId : current.owner_key
        if (role === 'owner' && userId) {
            nb.auth_user_id = current.auth_user_id || userId
        }
        if (current.deleted_at) {
            const err = new Error('Notebook was deleted') as Error & { status?: number }
            err.status = 410
            throw err
        }
        if (await hasSyncTombstone('notebook', nb.id)) {
            const err = new Error('Notebook was deleted') as Error & { status?: number }
            err.status = 410
            throw err
        }

        const currentDbVersion = Number(current.version || 1)
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
        nb.auth_user_id = current.auth_user_id || nb.auth_user_id
        if (nb.contentOmitted) {
            nb.content = String(current.content || '')
        }
        if (role !== 'owner') {
            nb.isPublished = current.is_published ?? false
            nb.publish = current.publish ?? nb.publish
            nb.pinned = current.pinned ?? nb.pinned
            nb.isTemplate = current.is_template ?? nb.isTemplate
        }
    } else {
        if (await hasSyncTombstone('notebook', nb.id)) {
            const err = new Error('Notebook was deleted') as Error & { status?: number }
            err.status = 410
            throw err
        }
        nb.version = Math.max(1, Number(nb.version || 1))
    }

    const row = dtoToRow(nb, persistOwnerKey)
    const { data, error } = await supabaseAdmin
        .from('wim_notebooks')
        .upsert(row, { onConflict: 'id' })
        .select('*')
        .single()

    if (error) throw error
    const saved = rowToDTO(data as StoredNotebookRow, accessRole)
    if (userId) {
        const previousContent = existing ? String((existing as StoredNotebookRow).content || '') : ''
        // No-op saves (idle serialize with an unchanged body) must not re-scan or
        // re-write mention/comment notification rows on every autosave tick.
        const contentChanged = previousContent !== saved.content
        if (contentChanged) {
            try {
                await notifyNotebookMentions({
                    notebookId: saved.id,
                    title: saved.title,
                    content: saved.content,
                    previousContent,
                    actorId: userId,
                })
                await notifyNotebookComments({
                    notebookId: saved.id,
                    title: saved.title,
                    previousContent,
                    content: saved.content,
                    actorId: userId,
                    ownerUserId: saved.auth_user_id || userId,
                })
            } catch (err) {
                console.warn('[notebooks-repo] mention/comment notify failed', err)
            }
        }
    }
    return saved
}

export async function upsertNotebooks(
    notebooks: StoredNotebookDTO[],
    ownerKey: string,
    userId?: string,
    extraOwnerKeys: string[] = []
): Promise<number> {
    if (!notebooks.length) return 0
    const updatedRows: Omit<StoredNotebookRow, never>[] = []

    // Load the delete ledger once instead of one `hasSyncTombstone` round trip per
    // notebook (bulk client sync pushes every writable notebook in one request).
    const tombstoneIds = new Set(await listSyncTombstoneIds('notebook', ownerKey, userId))
    const isDeleted = (id: string | undefined): boolean => Boolean(id && tombstoneIds.has(id))

    for (const nb of notebooks) {
        const { data: existing } = await supabaseAdmin
            .from('wim_notebooks')
            .select('id, owner_key, auth_user_id, version, deleted_at, is_published, publish, pinned, is_template')
            .or(`id.eq.${nb.id},short_id.eq.${nb.id}`)
            .limit(1)
            .maybeSingle()

        let persistOwnerKey = ownerKey
        if (existing) {
            const current = existing as StoredNotebookRow
            const role = await resolveNotebookAccess(current, ownerKey, userId || ownerKey, extraOwnerKeys)
            if (!role || !canWriteNotebook(role)) {
                continue
            }
            persistOwnerKey = role === 'owner' && userId ? userId : current.owner_key
            if (role === 'owner' && userId) {
                nb.auth_user_id = userId
            }
            if (current.deleted_at) continue
            if (isDeleted(nb.id) || isDeleted(nb.short_id)) continue
            if (nb.contentOmitted) continue
            const currentDbVersion = Number(current.version || 1)
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
            nb.auth_user_id = current.auth_user_id || nb.auth_user_id
            if (role !== 'owner') {
                nb.isPublished = current.is_published ?? false
                nb.publish = current.publish ?? nb.publish
            }
        } else {
            if (isDeleted(nb.id) || isDeleted(nb.short_id)) continue
            nb.version = Math.max(1, Number(nb.version || 1))
        }
        updatedRows.push(dtoToRow(nb, persistOwnerKey))
    }

    const { error, count } = await supabaseAdmin.from('wim_notebooks').upsert(updatedRows, {
        onConflict: 'id',
        count: 'exact',
    })
    if (error && /organize/i.test(error.message || '')) {
        const stripped = updatedRows.map(({ organize: _organize, ...row }) => row)
        const retry = await supabaseAdmin.from('wim_notebooks').upsert(stripped, {
            onConflict: 'id',
            count: 'exact',
        })
        if (retry.error) throw retry.error
        return retry.count ?? stripped.length
    }
    if (error) throw error
    return count ?? updatedRows.length
}


/** Replace history only after ownership check (prevents cross-tenant history wipe). */
export async function replaceHistoryForOwner(
    notebookId: string,
    ownerKey: string,
    entries: NotebookVersionDTO[],
    extraOwnerKeys: string[] = []
): Promise<void> {
    const existing = await getNotebookByIdOrShort(notebookId, {
        ownerKey,
        userId: ownerKey,
        extraOwnerKeys,
    })
    if (!existing || !canWriteNotebook(existing.access_role)) {
        const err = new Error('Forbidden or not found: cannot write history for this notebook') as Error & {
            status?: number
        }
        err.status = 403
        throw err
    }
    await replaceHistory(existing.id, entries)
}

export async function deleteNotebook(
    idOrShort: string,
    ownerKey: string,
    userId?: string,
    extraOwnerKeys: string[] = []
): Promise<boolean> {
    const { data: existing, error: findError } = await supabaseAdmin
        .from('wim_notebooks')
        .select('id, short_id, owner_key, auth_user_id, deleted_at')
        .or(`id.eq.${idOrShort},short_id.eq.${idOrShort}`)
        .limit(1)
        .maybeSingle()
    if (findError) throw findError

    if (!existing) {
        await recordSyncTombstone('notebook', idOrShort, ownerKey, userId)
        return true
    }

    const row = existing as {
        id: string
        short_id: string
        owner_key: string
        auth_user_id: string | null
        deleted_at: string | null
    }
    const allowed =
        row.owner_key === ownerKey ||
        Boolean(userId && row.auth_user_id === userId) ||
        extraOwnerKeys.some((key) => key && key === row.owner_key)
    if (!allowed) return false

    await recordSyncTombstone('notebook', row.id, row.owner_key, row.auth_user_id)
    if (row.short_id && row.short_id !== row.id) {
        await recordSyncTombstone('notebook', row.short_id, row.owner_key, row.auth_user_id)
    }
    await purgeNotebookData(row.id).catch((e) => console.error('[deleteNotebook] purge error', e))
    const { error: delError } = await supabaseAdmin.from('wim_notebooks').delete().eq('id', row.id)
    if (delError) throw delError
    return true
}

/**
 * Drop version history for a tombstoned notebook.
 * Do not touch notebook-media/<owner>/ — images are shared across notebooks.
 */
async function purgeNotebookData(notebookId: string, _ownerKey?: string): Promise<void> {
    await supabaseAdmin
        .from('wim_notebook_history')
        .delete()
        .eq('notebook_id', notebookId)
        .catch((e) => console.error('[purgeNotebookData] history delete error', e))
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
    if (!entries.length) return

    const existing = await listHistory(notebookId)
    const byVersion = new Map<number, NotebookVersionDTO>()
    for (const entry of [...existing, ...entries]) {
        if (!Number.isFinite(entry.version)) continue
        const prev = byVersion.get(entry.version)
        const incomingContent = entry.content && entry.content.length > 0 ? entry.content : ''
        if (!prev) {
            byVersion.set(entry.version, { ...entry, content: incomingContent })
            continue
        }
        byVersion.set(entry.version, {
            ...prev,
            ...entry,
            content: incomingContent || prev.content,
            title: entry.title || prev.title,
            label: entry.label || prev.label,
            timestamp: entry.timestamp || prev.timestamp,
        })
    }
    const merged = [...byVersion.values()]
        .sort((a, b) => {
            const ta = Date.parse(a.timestamp) || 0
            const tb = Date.parse(b.timestamp) || 0
            if (ta !== tb) return ta - tb
            return a.version - b.version
        })
        .slice(-100)

    await supabaseAdmin.from('wim_notebook_history').delete().eq('notebook_id', notebookId)
    if (!merged.length) return
    const rows = merged.map((entry) => ({
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
