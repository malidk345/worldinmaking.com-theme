const AUTH_NEXT_KEY = 'wim_auth_next'

function isShellHomePath(path: string): boolean {
    return (
        path === '/' ||
        path === '/desktop' ||
        path === '/login' ||
        path === '/signup' ||
        path.startsWith('/auth') ||
        path.startsWith('/login?') ||
        path.startsWith('/desktop?')
    )
}

/** Safe next path after OAuth. Only same-origin relative URLs. */
export function safeAuthNextPath(next: unknown, fallback = '/'): string {
    if (typeof next !== 'string') return fallback
    const path = next.trim()
    if (!path.startsWith('/') || path.startsWith('//')) return fallback
    const pathname = path.split(/[?#]/)[0] || '/'
    if (isShellHomePath(pathname) || isShellHomePath(path)) return fallback
    return path
}

export function rememberAuthNextPath(): void {
    if (typeof window === 'undefined') return
    try {
        const path = `${window.location.pathname}${window.location.search}`
        sessionStorage.setItem(AUTH_NEXT_KEY, safeAuthNextPath(path, '/'))
    } catch {
        /* ignore */
    }
}

export function consumeAuthNextPath(): string {
    if (typeof window === 'undefined') return '/'
    try {
        const stored = sessionStorage.getItem(AUTH_NEXT_KEY)
        sessionStorage.removeItem(AUTH_NEXT_KEY)
        return safeAuthNextPath(stored, '/')
    } catch {
        return '/'
    }
}

/** First exchange consumes the PKCE verifier; a second call is noise if we already have a session. */
export function shouldIgnorePkceExchangeError(message: string | undefined, hasSession: boolean): boolean {
    if (hasSession && /code verifier not found/i.test(message || '')) return true
    return false
}

/**
 * Read an OAuth provider error from the callback query.
 * The provider adds `error` (or `error_code`) and `error_description` when the
 * user rejects the consent screen or the provider refuses the request.
 */
export function readOAuthProviderError(query: {
    error?: unknown
    error_code?: unknown
    error_description?: unknown
}): { reason: string; description?: string } | null {
    const reason =
        (typeof query.error === 'string' && query.error) ||
        (typeof query.error_code === 'string' && query.error_code) ||
        null
    if (!reason) return null
    const description = typeof query.error_description === 'string' ? query.error_description : undefined
    return { reason, description }
}
