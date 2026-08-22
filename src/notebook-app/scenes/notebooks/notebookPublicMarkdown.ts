/** Plain document text: drop editor blocks and a repeated title heading. */
export function documentMarkdown(content: string, title: string): string {
    let text = String(content || '').replace(/^\uFEFF/, '')
    text = text.replace(/<ph-[^>]*\/>/gi, '')
    text = text.replace(/<ph-[^>]*>[\s\S]*?<\/ph-[^>]+>/gi, '')
    const match = text.match(/^#\s+(.+)\n?/)
    if (match && match[1].trim().toLowerCase() === title.trim().toLowerCase()) {
        text = text.slice(match[0].length)
    }
    return text.replace(/^\n+/, '').trim()
}

export function notebookCommentSlug(shortId: string): string {
    return `/notebooks/n/${shortId}`
}
