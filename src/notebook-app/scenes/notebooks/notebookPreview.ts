/** Plain-text excerpt for list rows and empty-state search. */

export function notebookPreviewExcerpt(content: string, max = 92): string {
    const plain = (content || '')
        .replace(/<!--wim-annotations:[\s\S]*?-->/g, ' ')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_~`>#]+/g, ' ')
        .replace(/^\s*[-+]\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim()

    if (!plain) return ''
    return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
}

export function notebookMatchesQuery(notebook: { title?: string; content?: string }, query: string): boolean {
    const q = query.trim().toLowerCase()
    if (!q) return true
    if ((notebook.title || '').toLowerCase().includes(q)) return true
    return notebookPreviewExcerpt(notebook.content || '', 2000).toLowerCase().includes(q)
}
