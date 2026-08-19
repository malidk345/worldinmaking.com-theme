import { playbackChunks, wait } from '../../lib/ai/playback'
import {
    replaceInlineRangeInMarkdown,
    replaceNotebookAIResponseMarkdown,
} from './components/MarkdownNotebook/notebookAI'

export async function playInlineEditorMarkdown(options: {
    baseMarkdown: string
    responseNodeIndex: number
    fullText: string
    onFrame: (markdown: string) => void
    isCancelled: () => boolean
}): Promise<string> {
    const text = options.fullText.trim()
    if (!text) return options.baseMarkdown

    const chunks = playbackChunks(text, 14)
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
        await wait(24)
    }

    return latest
}

export async function playInlineSelectionMarkdown(options: {
    baseMarkdown: string
    responseNodeIndex: number
    start: number
    end: number
    fullText: string
    listItemIndex?: number
    onFrame: (markdown: string) => void
    isCancelled: () => boolean
}): Promise<string> {
    const text = options.fullText.trim()
    if (!text) return options.baseMarkdown

    const chunks = playbackChunks(text, 12)
    let accumulated = ''
    let latest = options.baseMarkdown

    for (const chunk of chunks) {
        if (options.isCancelled()) return latest
        accumulated += chunk
        const next = replaceInlineRangeInMarkdown(
            options.baseMarkdown,
            options.responseNodeIndex,
            options.start,
            options.end,
            accumulated,
            options.listItemIndex
        )
        latest = next
        options.onFrame(latest)
        await wait(24)
    }

    return latest
}
