/**
 * WIM: PostHog Squeak/Strapi is intentionally disabled.
 * All community/auth data goes through Supabase.
 *
 * Call sites that still build Squeak URLs should use these helpers so
 * we never hit `undefined/api/...` or relative `/api/orders` on Next.
 */

export function getSqueakApiHost(): string {
    const host =
        process.env.NEXT_PUBLIC_SQUEAK_API_HOST ||
        process.env.NEXT_PUBLIC_SQUEAK_AUTH_HOST ||
        process.env.GATSBY_SQUEAK_API_HOST ||
        ''
    return host.replace(/\/$/, '')
}

export function isSqueakEnabled(): boolean {
    return getSqueakApiHost().length > 0
}

/** Absolute Squeak URL, or null when Squeak is off (WIM default). */
export function squeakApiUrl(path: string): string | null {
    const host = getSqueakApiHost()
    if (!host) return null
    const p = path.startsWith('/') ? path : `/${path}`
    return `${host}${p}`
}

/**
 * Fetch against Squeak only when configured. Returns null when disabled
 * so callers can no-op without network noise.
 */
export async function squeakFetch(path: string, init?: RequestInit): Promise<Response | null> {
    const url = squeakApiUrl(path)
    if (!url) return null
    return fetch(url, init)
}

/** Empty Strapi-shaped list payload for disabled Squeak features. */
export function emptySqueakList() {
    return { data: [] as any[], meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } } }
}

/**
 * Local Next.js API routes under /api/* that must NEVER be blocked.
 * Everything else that looks like a legacy Strapi path is dead on WIM.
 */
const LOCAL_API_ALLOW = [
    /^\/api\/notebooks(\/|$|\?)/i,
    /^\/api\/philosopher-bots?(\/|$|\?)/i,
    /^\/api\/bots(\/|$|\?)/i,
    /^\/api\/cron(\/|$|\?)/i,
    /^\/api\/forum(\/|$|\?)/i,
    /^\/api\/search(\/|$|\?)/i,
]

/**
 * When Squeak host is empty, template strings like
 * `${process.env.NEXT_PUBLIC_SQUEAK_API_HOST}/api/teams` become `/api/teams`.
 * Those paths are Strapi-only and should not hit Next.
 */
const LEGACY_SQUEAK_RELATIVE = [
    /^\/api\/customers(\/|$|\?)/i,
    /^\/api\/generate(\/|$|\?)/i,
    /^\/api\/events(\/|$|\?)/i,
    /^\/api\/zendesk(\/|$|\?)/i,
    /^\/api\/team-updates(\/|$|\?)/i,
    /^\/api\/orders(\/|$|\?)/i,
    /^\/api\/posts(\/|$|\?)/i,
    /^\/api\/post-categories(\/|$|\?)/i,
    /^\/api\/post-tags(\/|$|\?)/i,
    /^\/api\/roadmaps(\/|$|\?)/i,
    /^\/api\/profiles(\/|$|\?)/i,
    /^\/api\/profile(\/|$|\?)/i,
    /^\/api\/teams(\/|$|\?)/i,
    /^\/api\/users(\/|$|\?)/i,
    /^\/api\/media-folders(\/|$|\?)/i,
    /^\/api\/media-tags(\/|$|\?)/i,
    /^\/api\/mixtapes(\/|$|\?)/i,
    /^\/api\/upload(\/|$|\?)/i,
    /^\/api\/places(\/|$|\?)/i,
    /^\/api\/place-reviews(\/|$|\?)/i,
    /^\/api\/topics(\/|$|\?)/i,
    /^\/api\/topic-groups(\/|$|\?)/i,
    /^\/api\/points(\/|$|\?)/i,
    /^\/api\/replies(\/|$|\?)/i,
    /^\/api\/questions(\/|$|\?)/i,
    /^\/api\/ask-max(\/|$|\?)/i,
    /^\/api\/connect(\/|$|\?)/i,
    /^\/api\/auth(\/|$|\?)/i,
    /^\/api\/brilliant(\/|$|\?)/i,
    /^\/api\/slack-posts(\/|$|\?)/i,
    /^\/api\/achievements(\/|$|\?)/i,
    /^\/api\/subscriptions(\/|$|\?)/i,
    /^\/api\/likes(\/|$|\?)/i,
    /^\/api\/bookmarks(\/|$|\?)/i,
    /^\/api\/reports(\/|$|\?)/i,
    /^\/api\/moderators(\/|$|\?)/i,
    /^\/admin(\/|$|\?)/i,
]

function pathnameOf(urlStr: string): string | null {
    try {
        // Absolute
        if (/^https?:\/\//i.test(urlStr)) {
            return new URL(urlStr).pathname
        }
        // Protocol-relative
        if (urlStr.startsWith('//')) {
            return new URL(`https:${urlStr}`).pathname
        }
        // Relative to site
        if (urlStr.startsWith('/')) {
            return urlStr.split('?')[0].split('#')[0]
        }
        // Broken "undefined/api/..." relative junk
        if (urlStr.startsWith('undefined/')) {
            return `/${urlStr.split('?')[0]}`
        }
    } catch {
        /* ignore */
    }
    return null
}

function isLocalAllowedApi(pathname: string): boolean {
    return LOCAL_API_ALLOW.some((re) => re.test(pathname))
}

function isLegacySqueakRelative(pathname: string): boolean {
    if (isLocalAllowedApi(pathname)) return false
    return LEGACY_SQUEAK_RELATIVE.some((re) => re.test(pathname))
}

function shouldBlockFetch(urlStr: string): boolean {
    const lower = urlStr.toLowerCase()

    // Always block hard-coded PostHog Squeak host + broken undefined host
    if (
        lower.includes('squeak.posthog.com') ||
        lower.includes('/undefined/api/') ||
        lower.includes('undefined/api/') ||
        /^https?:\/\/undefined\b/i.test(urlStr)
    ) {
        return true
    }

    // When Squeak is disabled, block relative legacy Strapi paths
    if (!isSqueakEnabled()) {
        const path = pathnameOf(urlStr)
        if (path && isLegacySqueakRelative(path)) {
            return true
        }
    }

    return false
}

function emptyResponse(): Response {
    return new Response(JSON.stringify(emptySqueakList()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
}

/**
 * Client-side guard: block accidental fetches to Squeak host, broken
 * `undefined/api/...` URLs, and relative legacy Strapi routes when Squeak is off.
 */
export function installSqueakFetchGuard(): () => void {
    if (typeof window === 'undefined') return () => {}
    const w = window as Window & { __wimSqueakGuard?: boolean }
    if (w.__wimSqueakGuard) return () => {}
    w.__wimSqueakGuard = true

    const original = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let urlStr = ''
        try {
            if (typeof input === 'string') urlStr = input
            else if (input instanceof URL) urlStr = input.href
            else if (typeof Request !== 'undefined' && input instanceof Request) urlStr = input.url
            else urlStr = String(input)
        } catch {
            return original(input as any, init)
        }

        if (shouldBlockFetch(urlStr)) {
            if (process.env.NODE_ENV === 'development') {
                console.debug('[wim] blocked legacy Squeak fetch:', urlStr.slice(0, 140))
            }
            return emptyResponse()
        }

        return original(input as any, init)
    }

    return () => {
        window.fetch = original
        w.__wimSqueakGuard = false
    }
}
