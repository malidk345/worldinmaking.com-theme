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
