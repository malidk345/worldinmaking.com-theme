/** OS window paths: never keep Next.js `[slug]` placeholders, always prefer the live URL. */

export function isPlaceholderPath(path: string): boolean {
    return /\[(?:\.\.\.)?[^\]]+\]/.test(path)
}

export function stripPathNoise(path?: string | null): string {
    const raw = String(path || '')
        .split('?')[0]
        .split('#')[0]
        .trim() || '/'
    const withSlash = raw.startsWith('/') ? raw : `/${raw}`
    if (withSlash === '/') return '/'
    return withSlash.replace(/\/+$/, '') || '/'
}

export function livePathname(): string | null {
    if (typeof window === 'undefined') return null
    const live = stripPathNoise(window.location.pathname)
    return isPlaceholderPath(live) ? null : live
}

/** Resolve a window path so F5 on /posts/foo is never `/posts/[slug]` or `/posts`. */
export function canonicalWindowPath(input?: string | null): string {
    const stripped = stripPathNoise(input)
    const live = livePathname()
    if (!live) return stripped
    if (isPlaceholderPath(stripped)) return live
    if (stripped === '/posts' && live.startsWith('/posts/')) return live
    if (stripped === '/blog' && live.startsWith('/blog/')) return live
    if (
        (stripped === '/questions' || stripped === '/forum') &&
        /^\/(?:questions|forum)\/(?!topic(?:\/|$)|subscriptions(?:\/|$))/.test(live)
    ) {
        return live
    }
    return stripped
}

export function repairWindowPath(windowPath: string, live: string): string {
    const current = stripPathNoise(windowPath)
    const livePath = stripPathNoise(live)
    if (isPlaceholderPath(current) && livePath !== '/') return livePath
    if (current === '/posts' && livePath.startsWith('/posts/')) return livePath
    if (current === '/blog' && livePath.startsWith('/blog/')) return livePath
    if (
        (current === '/questions' || current === '/forum') &&
        /^\/(?:questions|forum)\/(?!topic(?:\/|$)|subscriptions(?:\/|$))/.test(livePath)
    ) {
        return livePath
    }
    return current
}

/** Routes WindowRouter can resolve without the Next.js page element. */
export function isPathRoutedWindow(path: string): boolean {
    const p = canonicalWindowPath(path)
    return (
        /^\/(posts|blog)(\/|$)/.test(p) ||
        /^\/(questions|forum)(\/|$)/.test(p) ||
        (p.startsWith('/community') &&
            !p.startsWith('/community/profiles') &&
            !p.startsWith('/community/achievements'))
    )
}
