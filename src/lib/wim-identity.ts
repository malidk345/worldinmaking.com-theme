/**
 * Browser identity for chat + notebook sync.
 * Device key stays in localStorage forever. After login, the active owner is the auth user id.
 */

export const WIM_IDENTITY_EVENT = 'wim-identity-changed'
export const AUTH_USER_ID_KEY = 'wim_auth_user_id'
export const DEVICE_CHAT_OWNER_KEY = 'wim_chat_owner_key'
export const DEVICE_NOTEBOOK_OWNER_KEY = 'wim_notebook_owner_key'

const OWNER_KEY_MIN = 8

export function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function getAuthUserId(): string | null {
    if (typeof window === 'undefined') return null
    try {
        const id = window.localStorage.getItem(AUTH_USER_ID_KEY)
        return id && id.length >= OWNER_KEY_MIN ? id : null
    } catch {
        return null
    }
}

export function getDeviceOwnerKey(storageKey: string): string {
    if (typeof window === 'undefined') return 'server'
    try {
        let key = window.localStorage.getItem(storageKey)
        if (!key || key.length < OWNER_KEY_MIN) {
            key =
                typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `owner_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
            window.localStorage.setItem(storageKey, key)
        }
        return key
    } catch {
        return `owner_fallback_${Date.now()}`
    }
}

export function getActiveOwnerKey(storageKey: string): string {
    return getAuthUserId() || getDeviceOwnerKey(storageKey)
}

export function emitIdentityChanged(): void {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event(WIM_IDENTITY_EVENT))
}

export function namespacedStorageKey(base: string, ownerKey: string): string {
    return `${base}:${ownerKey}`
}
