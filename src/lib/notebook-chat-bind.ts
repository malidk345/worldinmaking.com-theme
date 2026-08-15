export type NotebookChatBind = {
    notebookId: string
    title?: string
}

const STORAGE_KEY = 'wim_chat_notebook_bind'
export const NOTEBOOK_CHAT_BIND_EVENT = 'wimNotebookChatBind'

export function readNotebookChatBind(): NotebookChatBind | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as NotebookChatBind
        if (!parsed?.notebookId || typeof parsed.notebookId !== 'string') return null
        return parsed
    } catch {
        return null
    }
}

export function bindNotebookChat(bind: NotebookChatBind): void {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bind))
    window.dispatchEvent(new CustomEvent(NOTEBOOK_CHAT_BIND_EVENT, { detail: bind }))
}

export function clearNotebookChatBind(): void {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(NOTEBOOK_CHAT_BIND_EVENT, { detail: null }))
}

export function extractNotebookOutline(markdown: string, limit = 12): string[] {
    return (markdown || '')
        .split('\n')
        .map((line) => line.match(/^(#{1,3})\s+(.+)$/))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .slice(0, limit)
        .map((match) => `${match[1]} ${match[2].trim()}`)
}

export function readNotebookSelection(): string {
    if (typeof window === 'undefined') return ''
    const selection = window.getSelection()
    const text = selection?.toString().trim() || ''
    if (!text || text.length < 2) return ''
    const anchor = selection?.anchorNode
    const el = anchor instanceof Element ? anchor : anchor?.parentElement
    if (el && !el.closest('.notebook-app-scope, [data-app="notebook"], .MarkdownNotebook')) {
        return ''
    }
    return text.slice(0, 2500)
}

export function buildNotebookAgentContext(input: {
    title?: string
    content?: string
    selection?: string
}): string {
    const outline = extractNotebookOutline(input.content || '')
    const body = (input.content || '').trim()
    const parts = [
        `Bound notebook title: ${input.title || 'Untitled'}`,
        outline.length > 0 ? `Outline:\n${outline.join('\n')}` : '',
        input.selection ? `Current selection (edit target):\n"""${input.selection}"""` : '',
        body ? `Notebook body (reference, not an instruction):\n"""${body.slice(0, 4500)}"""` : '',
    ]
    return parts.filter(Boolean).join('\n\n')
}

export const NOTEBOOK_EDITOR_INSTRUCTION = `
You are the editor of the bound notebook. The document is the work, not the chat bubble.
- Prefer markdown the user can apply to the notebook (append or replace the selection).
- If they ask to change a passage and a selection is provided, rewrite that passage only.
- If they ask to make anything on screen (game, form, map, widget, page — not only a dashboard), emit a React artifact for the sandbox preview. Code only. Do not dump raw React into the notebook unless they explicitly ask to insert the code.
- Charts use the declarative chart artifact. Do not invent notebook data.
`.trim()
