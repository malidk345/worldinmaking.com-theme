/**
 * Tiny delete ledger in Supabase. Content rows are hard-deleted;
 * this table is what other devices read as deleted_ids.
 */
import { supabaseAdmin } from './supabase-admin'

export type SyncTombstoneKind = 'chat' | 'notebook'

function isMissingRelation(error: unknown): boolean {
    const message =
        error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: string }).message)
            : String(error)
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: string }).code) : ''
    return (
        code === 'PGRST205' ||
        code === '42P01' ||
        message.includes('wim_sync_tombstones') ||
        message.includes('schema cache') ||
        message.toLowerCase().includes('does not exist')
    )
}

function applyOwnerScope<T extends { or: Function; eq: Function }>(query: T, ownerKey: string, userId?: string): T {
    if (userId && userId === ownerKey) {
        return query.or(`owner_key.eq.${ownerKey},auth_user_id.eq.${userId}`)
    }
    return query.eq('owner_key', ownerKey)
}

export async function recordSyncTombstone(
    kind: SyncTombstoneKind,
    itemId: string,
    ownerKey: string,
    userId?: string | null
): Promise<boolean> {
    if (!itemId || !ownerKey) return false
    const authUserId =
        userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : null
    const { error } = await supabaseAdmin.from('wim_sync_tombstones').upsert(
        {
            kind,
            item_id: itemId,
            owner_key: ownerKey,
            auth_user_id: authUserId,
            deleted_at: new Date().toISOString(),
        },
        { onConflict: 'kind,item_id' }
    )
    if (error) {
        if (isMissingRelation(error)) return false
        throw error
    }
    return true
}

export async function hasSyncTombstone(kind: SyncTombstoneKind, itemId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from('wim_sync_tombstones')
        .select('item_id')
        .eq('kind', kind)
        .eq('item_id', itemId)
        .maybeSingle()
    if (error) {
        if (isMissingRelation(error)) return false
        throw error
    }
    return Boolean(data)
}

export async function listSyncTombstoneIds(
    kind: SyncTombstoneKind,
    ownerKey: string,
    userId?: string
): Promise<string[]> {
    let query = supabaseAdmin.from('wim_sync_tombstones').select('item_id').eq('kind', kind)
    query = applyOwnerScope(query, ownerKey, userId)
    const { data, error } = await query.limit(1000)
    if (error) {
        if (isMissingRelation(error)) return []
        throw error
    }
    return ((data as { item_id: string }[] | null) || []).map((row) => row.item_id)
}
