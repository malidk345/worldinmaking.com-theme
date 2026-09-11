/** OS window paths: never keep Next.js `[slug]` placeholders, always prefer the live URL. */

const NOTEBOOK_RESERVED = new Set(['templates', 'canvas', 'n', 'notebook', 'invite'])

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

/** Published reader: `/notebooks/n/:shortId` or leftover `#/n/:shortId`. */
export function extractPublicNotebookId(input?: string | null): string | null {
    const raw = String(input || '').trim()
    if (!raw) return null
    let pathname = raw
    let hash = ''
    try {
        if (/^[a-z]+:\/\//i.test(raw)) {
            const url = new URL(raw)
            pathname = url.pathname
            hash = url.hash.replace(/^#/, '')
        } else {
            const hashIdx = raw.indexOf('#')
            if (hashIdx >= 0) {
                hash = raw.slice(hashIdx + 1)
                pathname = raw.slice(0, hashIdx)
            }
        }
    } catch {
        pathname = raw.split('#')[0]
    }
    const parts = stripPathNoise(pathname).split('/').filter(Boolean)
    if (parts[0] === 'notebooks' && parts[1] === 'n' && parts[2]) return parts[2]
    const h = hash.replace(/^\//, '')
    if (h.startsWith('n/')) {
        const id = h.slice(2).split(/[/?#]/)[0]
        return id || null
    }
    return null
}

export function notebookPublicPath(id?: string | null): string {
    const clean = String(id || '').trim()
    return clean ? `/notebooks/n/${clean}` : '/notebooks'
}

/** Editor id from `/notebooks/:id` or legacy `?id=` / `?notebookId=` pins. */
export function extractNotebookId(input?: string | null): string | null {
    const raw = String(input || '').trim()
    if (!raw) return null
    let pathname = raw
    let search = ''
    try {
        if (/^[a-z]+:\/\//i.test(raw)) {
            const url = new URL(raw)
            pathname = url.pathname
            search = url.search
        } else {
            const hash = raw.indexOf('#')
            const withoutHash = hash >= 0 ? raw.slice(0, hash) : raw
            const q = withoutHash.indexOf('?')
            pathname = q >= 0 ? withoutHash.slice(0, q) : withoutHash
            search = q >= 0 ? withoutHash.slice(q) : ''
        }
    } catch {
        pathname = raw.split('?')[0].split('#')[0]
    }
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const fromQuery = params.get('id') || params.get('notebookId')
    if (fromQuery) return fromQuery
    const parts = stripPathNoise(pathname).split('/').filter(Boolean)
    if (parts[0] !== 'notebooks' || !parts[1]) return null
    if (parts[1] === 'notebook' && parts[2]) return parts[2]
    if (NOTEBOOK_RESERVED.has(parts[1])) return null
    return parts[1]
}

export function isArtifactWindowPath(path?: string | null): boolean {
    const p = stripPathNoise(path)
    return p === '/artifact' || p.startsWith('/artifact/')
}

/** Notebook list/editor — sidebar chrome must stay window-tall, not document-tall. */
export function isNotebookWindowPath(path?: string | null): boolean {
    const p = stripPathNoise(path)
    return p === '/notebooks' || p.startsWith('/notebooks/')
}

export function isScratchpadWindowPath(path?: string | null): boolean {
    const p = stripPathNoise(path)
    return p === '/scratchpad' || p.startsWith('/scratchpad/')
}

export function isTrashWindowPath(path?: string | null): boolean {
    const p = stripPathNoise(path)
    return p === '/trash' || p.startsWith('/trash/')
}

export function isAssistantWindowPath(path?: string | null): boolean {
    const p = stripPathNoise(path)
    return p === '/assistant' || p.startsWith('/assistant/')
}

export function notebookWindowPath(id?: string | null, mark?: string | null): string {
    const clean = String(id || '').trim()
    if (!clean) return '/notebooks'
    const parsed = mark === 'mention' || mark === 'comment' ? mark : null
    return parsed ? `/notebooks/${clean}?mark=${parsed}` : `/notebooks/${clean}`
}

export function livePathname(): string | null {
    if (typeof window === 'undefined') return null
    const liveRaw = `${window.location.pathname}${window.location.search}${window.location.hash}`
    const publicId = extractPublicNotebookId(liveRaw)
    if (publicId) return notebookPublicPath(publicId)
    const notebookId = extractNotebookId(`${window.location.pathname}${window.location.search}`)
    if (notebookId) {
        const mark = new URLSearchParams(window.location.search).get('mark')
        return notebookWindowPath(notebookId, mark === 'mention' || mark === 'comment' ? mark : null)
    }
    const live = stripPathNoise(window.location.pathname)
    return isPlaceholderPath(live) ? null : live
}

/** Resolve a window path so F5 on /posts/foo is never `/posts/[slug]` or `/posts`. */
export function canonicalWindowPath(input?: string | null): string {
    const publicId = extractPublicNotebookId(input)
    if (publicId) return notebookPublicPath(publicId)
    const notebookId = extractNotebookId(input)
    if (notebookId) {
        const raw = String(input || '')
        let mark: string | null = null
        try {
            const qIndex = raw.indexOf('?')
            const query = qIndex >= 0 ? raw.slice(qIndex + 1).split('#')[0] : ''
            const value = new URLSearchParams(query).get('mark')
            if (value === 'mention' || value === 'comment') mark = value
        } catch {
            mark = null
        }
        return notebookWindowPath(notebookId, mark)
    }
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

/** Guest landing window. Signed-in users should not keep these open. */
export function isHomeWindowPath(path?: string | null): boolean {
    const p = stripPathNoise(path)
    return p === '/home' || p === '/' || p === '/desktop'
}

/** Routes WindowRouter can resolve without the Next.js page element. */
export function isPathRoutedWindow(path: string): boolean {
    const p = canonicalWindowPath(path)
    return (
        p === '/home' ||
        p === '/account' ||
        /^\/workspace-chat(\/|$)/.test(p) ||
        /^\/assistant(\/|$)/.test(p) ||
        /^\/scratchpad(\/|$)/.test(p) ||
        /^\/trash(\/|$)/.test(p) ||
        /^\/pricing(\/|$)/.test(p) ||
        /^\/notebooks(\/|$)/.test(p) ||
        /^\/(posts|blog)(\/|$)/.test(p) ||
        /^\/(questions|forum)(\/|$)/.test(p) ||
        (p.startsWith('/community') &&
            !p.startsWith('/community/profiles') &&
            !p.startsWith('/community/achievements'))
    )
}

/** Forum / questions / community (not profile or achievements). Keep in this module so App.tsx does not import WindowRouter. */
export function isForumPath(p: string): boolean {
    return (
        typeof p === 'string' &&
        (/^\/questions/.test(p) ||
            /^\/forum/.test(p) ||
            (p.startsWith('/community') &&
                !p.startsWith('/community/profiles') &&
                !p.startsWith('/community/achievements')))
    )
}

/** Blog listing or article — ReaderView chrome must stay window-tall, not post-tall. */
export function isBlogPath(p: string): boolean {
    return typeof p === 'string' && /^\/(blog|posts)(\/|$)/.test(p)
}
