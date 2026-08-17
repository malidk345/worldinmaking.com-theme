/** Safe next path after OAuth. Only same-origin relative URLs. */
export function safeAuthNextPath(next: unknown, fallback = '/desktop'): string {
    if (typeof next !== 'string') return fallback
    const path = next.trim()
    if (!path.startsWith('/') || path.startsWith('//')) return fallback
    return path
}

/** First exchange consumes the PKCE verifier; a second call is noise if we already have a session. */
export function shouldIgnorePkceExchangeError(message: string | undefined, hasSession: boolean): boolean {
    if (hasSession && /code verifier not found/i.test(message || '')) return true
    return false
}
