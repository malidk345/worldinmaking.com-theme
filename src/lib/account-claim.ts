import { supabaseAdmin } from '../../lib/supabase-admin'
import { isUuid } from './wim-identity'

export function isSafeOwnerKey(value: string): boolean {
    return typeof value === 'string' && value.length >= 8 && value.length <= 128 && /^[a-zA-Z0-9_.:-]+$/.test(value)
}

export async function claimTableForUser(
    table: 'wim_chats' | 'wim_notebooks',
    deviceKey: string,
    userId: string
): Promise<number> {
    if (!isSafeOwnerKey(deviceKey) || !isUuid(userId) || deviceKey === userId) return 0

    const { data, error } = await supabaseAdmin
        .from(table)
        .update({ owner_key: userId, auth_user_id: userId })
        .eq('owner_key', deviceKey)
        .is('deleted_at', null)
        .select('id')

    if (error) throw error
    return Array.isArray(data) ? data.length : 0
}

export async function claimDeviceAccount(deviceKey: string, userId: string): Promise<{ chats: number; notebooks: number }> {
    const [chats, notebooks] = await Promise.all([
        claimTableForUser('wim_chats', deviceKey, userId),
        claimTableForUser('wim_notebooks', deviceKey, userId),
    ])
    return { chats, notebooks }
}
