export interface ExtractedForumMeta {
    content: string
    sourceContexts: string[]
}

export function extractForumMeta(content: string | null | undefined): ExtractedForumMeta {
    if (typeof content !== 'string' || !content.trim()) {
        return {
            content: '',
            sourceContexts: [],
        }
    }

    const sourceContexts: string[] = []
    const cleanedContent = content.replace(/<context-box>([\s\S]*?)<\/context-box>/gi, (_match, sourceContent: string) => {
        const normalizedSource = sourceContent.trim()
        if (normalizedSource) {
            sourceContexts.push(normalizedSource)
        }
        return ''
    }).replace(/\n{3,}/g, '\n\n').trim()

    return {
        content: cleanedContent,
        sourceContexts,
    }
}