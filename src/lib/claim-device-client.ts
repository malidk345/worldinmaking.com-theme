/**
 * After sign-in, attach this browser's guest notebooks/chats to the account.
 * Safe to call more than once — remembered per user+device.
 */
import {
    DEVICE_CHAT_OWNER_KEY,
    DEVICE_NOTEBOOK_OWNER_KEY,
    getDeviceOwnerKey,
} from './wim-identity'

function claimFlag(userId: string, deviceKey: string): string {
    return `wim_device_claimed:${userId}:${deviceKey}`
}

let lastClaimAttempt = 0

export async function claimThisDeviceIfNeeded(userId?: string | null, accessToken?: string | null): Promise<boolean> {
    if (typeof window === 'undefined') return false
    const uid = String(userId || '').trim()
    const token = String(accessToken || window.localStorage.getItem('jwt') || '').trim()
    if (!uid || token.length < 20) return false

    const now = Date.now()
    if (now - lastClaimAttempt < 5000) return false
    lastClaimAttempt = now

    const notebookKey = getDeviceOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY)
    const chatKey = getDeviceOwnerKey(DEVICE_CHAT_OWNER_KEY)
    const keys = Array.from(new Set([notebookKey, chatKey].filter((key) => key && key !== uid)))
    if (!keys.length) return false

    let any = false
    for (const previous of keys) {
        try {
            const res = await fetch('/api/account/claim', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'X-WIM-Owner-Key': previous,
                    'X-WIM-Device-Key': previous,
                },
                body: JSON.stringify({ previous_owner_key: previous }),
            })
            if (res.ok) {
                window.localStorage.setItem(claimFlag(uid, previous), '1')
                any = true
            }
        } catch {
            /* next focus will retry */
        }
    }
    return any
}
