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
export function documentMarkdown(content: string, title?: string): string {
    let text = String(content || '').replace(/^\uFEFF/, '')
    text = text.replace(/<ph-[^>]*\/>/gi, '')
    text = text.replace(/<ph-[^>]*>[\s\S]*?<\/ph-[^>]+>/gi, '')
    text = text.replace(/<!--wim-block:[^>]*-->/gi, '')
    text = text.trimStart()

    const cleanTitle = String(title || '').trim().replace(/^#+\s+/, '').toLowerCase()

    // 1. If document starts with an H1 heading (# ...), this is the notebook title.
    // In WIM published view, the title is already rendered in NotebookPublicView__title,
    // so any leading H1 heading is a duplicate and should be dropped.
    const h1Match = text.match(/^#\s+(.+?)(?:\r?\n|$)/)
    if (h1Match) {
        text = text.slice(h1Match[0].length)
    } else if (cleanTitle) {
        // 2. Also check if another heading level (e.g. ##) exactly matches the passed title
        const match = text.match(/^(#{1,6})\s+(.+?)(?:\r?\n|$)/)
        if (match && match[2].trim().replace(/^#+\s+/, '').toLowerCase() === cleanTitle) {
            text = text.slice(match[0].length)
        }
    }

    return text.replace(/^\r?\n+/, '').trim()
}

export function notebookCommentSlug(shortId: string): string {
    return `/notebooks/n/${shortId}`
}
