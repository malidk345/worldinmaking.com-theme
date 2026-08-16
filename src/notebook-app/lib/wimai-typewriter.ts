import { playbackChunks, wait } from '../../lib/ai/playback'
import { replaceNotebookAIResponseMarkdown } from './components/MarkdownNotebook/notebookAI'

export async function playInlineEditorMarkdown(options: {
    baseMarkdown: string
    responseNodeIndex: number
    fullText: string
    onFrame: (markdown: string) => void
    isCancelled: () => boolean
}): Promise<string> {
    const text = options.fullText.trim()
    if (!text) return options.baseMarkdown

    const chunks = playbackChunks(text, 22)
    let accumulated = ''
    let latest = options.baseMarkdown

    for (const chunk of chunks) {
        if (options.isCancelled()) return latest
        accumulated += chunk
        const next = replaceNotebookAIResponseMarkdown(
            options.baseMarkdown,
            options.responseNodeIndex,
            accumulated,
            1
        )
        latest = next.markdown
        options.onFrame(latest)
        await wait(34)
    }

    return latest
}
