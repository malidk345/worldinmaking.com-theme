/** Public links must not show a local unpublished draft. Prefer the published remote copy. */
export function pickPublicNotebook<T extends { isPublished?: boolean }>(
    local: T | null | undefined,
    remote: T | null | undefined
): T | null {
    if (remote) return remote
    if (local?.isPublished === true) return local
    return null
}

/** Plain document text: drop editor blocks and a repeated title heading. */
export function documentMarkdown(content: string, title: string): string {
    let text = String(content || '').replace(/^\uFEFF/, '')
    text = text.replace(/<ph-[^>]*\/>/gi, '')
    text = text.replace(/<ph-[^>]*>[\s\S]*?<\/ph-[^>]+>/gi, '')
    const cleanTitle = String(title || '').trim().replace(/^#+\s+/, '').toLowerCase()
    const match = text.match(/^(#{1,6})\s+(.+)\n?/)
    if (match && match[2].trim().replace(/^#+\s+/, '').toLowerCase() === cleanTitle) {
        text = text.slice(match[0].length)
    }
    return text.replace(/^\n+/, '').trim()
}

export function notebookCommentSlug(shortId: string): string {
    return `/notebooks/n/${shortId}`
}
