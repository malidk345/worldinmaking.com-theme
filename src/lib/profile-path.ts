/**
 * Canonical author/profile URLs are `/profile/:handle`.
 * Legacy PostHog `/community/profiles/:id` and `/u/:handle` still resolve.
 */

const PLACEHOLDER_HANDLES = new Set([
    '',
    'me',
    'community',
    'community member',
    'community-member',
    'anonymous',
    '1',
    'user',
])

export function normalizeProfileHandle(handle?: string | number | null): string {
    return String(handle ?? '')
        .trim()
        .replace(/^@/, '')
        .replace(/\/+$/, '')
}

export function isPlaceholderProfileHandle(handle?: string | number | null): boolean {
    return PLACEHOLDER_HANDLES.has(normalizeProfileHandle(handle).toLowerCase())
}

/** In-app href for an author. Null when we do not have a real identity. */
export function profileHref(handle?: string | number | null): string | null {
    const raw = normalizeProfileHandle(handle)
    if (!raw || isPlaceholderProfileHandle(raw)) return null
    return `/profile/${encodeURIComponent(raw)}`
}

export function identifierFromProfilePath(path?: string | null): string {
    if (!path) return ''
    const clean = String(path).split(/[?#]/)[0].replace(/\/+$/, '') || '/'
    const parts = clean.split('/').filter(Boolean)
    if (parts[0] === 'profile' || parts[0] === 'u') {
        return decodeURIComponent(parts[1] || '')
    }
    if (parts[0] === 'community' && parts[1] === 'profiles') {
        return decodeURIComponent(parts[2] || '')
    }
    return ''
}

/** Best-effort handle from a display name like "Nietzsche" or "Jean-Paul Sartre". */
export function handleFromDisplayName(name?: string | null): string {
    const t = String(name || '').trim()
    if (!t) return ''
    if (!/\s/.test(t)) return t.toLowerCase()
    const last = t.split(/\s+/).pop() || t
    return last.toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

export function normalizeProfileUsername(raw?: string | null): string {
    return String(raw || '').trim()
}

export function isValidProfileUsername(raw?: string | null): boolean {
    return /^[A-Za-z0-9_-]{2,32}$/.test(normalizeProfileUsername(raw))
}

export function ageFromBirthDate(iso?: string | null): number | null {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - d.getFullYear()
    const monthDelta = today.getMonth() - d.getMonth()
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < d.getDate())) age -= 1
    return age >= 0 && age < 130 ? age : null
}

export function isProfilePath(path?: string | null): boolean {
    if (!path) return false
    const clean = String(path).split(/[?#]/)[0]
    return /^\/profile(?:\/|$)/.test(clean) || /^\/u\//.test(clean) || /^\/community\/profiles(?:\/|$)/.test(clean)
}
