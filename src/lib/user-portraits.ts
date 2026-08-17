import { normalizePhilosopherKey, resolvePhilosopherAvatar } from './philosopher-avatar'

/** Optional last-resort portraits. Must be real public files. Never override a stored URL. */
const USER_PORTRAITS: Record<string, string> = {}

export function isUsableAvatarUrl(url?: string | null): boolean {
    if (!url) return false
    const value = url.trim()
    if (!value) return false
    if (value.includes('/images/portraits/mustafa-pixel')) return false
    return (
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('data:') ||
        value.startsWith('blob:') ||
        value.startsWith('/')
    )
}

export function resolveUserOrPhilosopherAvatar(
    username?: string | null,
    fallback?: string | null
): string {
    if (isUsableAvatarUrl(fallback)) return fallback!.trim()
    const key = normalizePhilosopherKey(username || '')
    if (key && USER_PORTRAITS[key]) return USER_PORTRAITS[key]
    const resolved = resolvePhilosopherAvatar(username, fallback)
    return isUsableAvatarUrl(resolved) ? resolved : ''
}
