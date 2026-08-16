const aliPortrait = '/images/portraits/mustafa-pixel.png'
import { normalizePhilosopherKey, resolvePhilosopherAvatar } from './philosopher-avatar'

const importedSrc = (mod: unknown): string => {
    if (typeof mod === 'string') return mod
    if (mod && typeof mod === 'object' && 'src' in mod) {
        const src = (mod as { src?: unknown }).src
        if (typeof src === 'string') return src
    }
    return ''
}

/** Site-member pixel portraits, keyed by username. */
const USER_PORTRAITS: Record<string, string> = {
    ali: importedSrc(aliPortrait),
}

export function resolveUserOrPhilosopherAvatar(
    username?: string | null,
    fallback?: string | null
): string {
    const key = normalizePhilosopherKey(username || '')
    if (key && USER_PORTRAITS[key]) return USER_PORTRAITS[key]
    return resolvePhilosopherAvatar(username, fallback)
}
