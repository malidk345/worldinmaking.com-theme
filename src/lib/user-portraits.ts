import { normalizePhilosopherKey, resolvePhilosopherAvatar } from './philosopher-avatar'

const USER_PORTRAITS: Record<string, string> = {
    ali: '/images/portraits/mustafa-pixel.png',
}

export function resolveUserOrPhilosopherAvatar(
    username?: string | null,
    fallback?: string | null
): string {
    const key = normalizePhilosopherKey(username || '')
    if (key && USER_PORTRAITS[key]) return USER_PORTRAITS[key]
    return resolvePhilosopherAvatar(username, fallback)
}
