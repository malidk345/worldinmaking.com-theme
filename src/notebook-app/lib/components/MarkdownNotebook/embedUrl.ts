/** Turn a pasted watch URL into something an iframe can actually play. */

export function normalizeEmbedSrc(raw: string): string {
    const value = raw.trim()
    if (!value) return ''
    try {
        const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
        const url = new URL(withProtocol)
        const host = url.hostname.replace(/^www\./, '')

        if (host === 'youtu.be') {
            const id = url.pathname.replace(/^\//, '').split('/')[0]
            return id ? `https://www.youtube.com/embed/${id}` : withProtocol
        }
        if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
            const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop()
            if (id && id !== 'embed' && id !== 'watch') {
                return `https://www.youtube.com/embed/${id}`
            }
        }
        if (host === 'vimeo.com') {
            const id = url.pathname.split('/').filter(Boolean)[0]
            return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : withProtocol
        }
        if (host === 'loom.com' && url.pathname.includes('/share/')) {
            const id = url.pathname.split('/').filter(Boolean).pop()
            return id ? `https://www.loom.com/embed/${id}` : withProtocol
        }
        return withProtocol
    } catch {
        return value
    }
}

export function isSafeEmbedSrc(src: string): boolean {
    try {
        const url = new URL(src)
        return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
        return false
    }
}
