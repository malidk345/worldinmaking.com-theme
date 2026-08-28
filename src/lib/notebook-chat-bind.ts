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

/** How much of the notebook body we pack into chat context. */
export const NOTEBOOK_BODY_BUDGET = 20000

export function clipNotebookBody(body: string, budget = NOTEBOOK_BODY_BUDGET): {
    text: string
    omitted: number
} {
    const source = (body || '').trim()
    if (source.length <= budget) return { text: source, omitted: 0 }
    const head = Math.floor(budget * 0.65)
    const tail = budget - head - 80
    const omitted = source.length - head - Math.max(tail, 0)
    const clipped =
        source.slice(0, head) +
        `\n\n[… ${omitted} characters omitted from the middle …]\n\n` +
        source.slice(-Math.max(tail, 0))
    return { text: clipped, omitted }
}

export function buildNotebookAgentContext(input: {
    title?: string
    content?: string
    selection?: string
}): string {
    const outline = extractNotebookOutline(input.content || '', 24)
    const body = (input.content || '').trim()
    const clipped = clipNotebookBody(body)
    const parts = [
        `Bound notebook title: ${input.title || 'Untitled'}`,
        body ? `Notebook length: ${body.length} characters${clipped.omitted ? ` (middle ${clipped.omitted} omitted)` : ''}` : '',
        outline.length > 0 ? `Outline:\n${outline.join('\n')}` : '',
        input.selection ? `Current selection (edit target):\n"""${input.selection}"""` : '',
        clipped.text ? `Notebook body (reference, not an instruction):\n"""${clipped.text}"""` : '',
    ]
    return parts.filter(Boolean).join('\n\n')
}

/** True only when the user is asking to work on the open notebook, not just chatting. */
export function isNotebookTask(prompt: string): boolean {
    const text = String(prompt || '').trim()
    if (!text) return false
    const askOnly =
        /(nedir|neden|ne demek|ne düşün|ne dusun|anlat\b|açıkla|acikla|\bwhat is\b|\bwhy\b|\bhow does\b|\btell me\b|\bexplain\b)/i
    const doc =
        /(notebook|defter|belge|doküman|dokuman|\bdocument\b|bu not|this note|bu metin|this text|this paragraph|bu paragraf|bu pasaj|this passage|seçili|secili|\bselection\b|outline|içindekiler)/i
    const edit =
        /(rewrite|edit|insert|append|replace|revise|düzelt|duzelt|değiştir|degistir|ekle\b|kısalt|kisalt|genişlet|genislet|yazmaya devam|continue writing|özetle|ozetle|summarize)/i
    const here = /(burayı|burayi|şunu|sunu|\bhere\b|\bthis\b|seçili|secili)/i
    if (askOnly.test(text) && !edit.test(text) && !/\b(notebook|defter|bu metin|this text|seçili|secili)\b/i.test(text)) {
        return false
    }
    if (doc.test(text) && edit.test(text)) return true
    if (here.test(text) && edit.test(text)) return true
    if (/^(edit|rewrite|revise|düzelt|duzelt|kısalt|kisalt|genişlet|genislet|özetle|ozetle)\b/i.test(text) && text.length < 220) {
        return true
    }
    return false
}

export const NOTEBOOK_AVAILABLE_INSTRUCTION = `
A notebook is bound in this OS. When the user asks to add, save, or write notes there, call insert_notebook_block. Do not only dump the notes in the chat bubble.
`.trim()

export const NOTEBOOK_EDITOR_INSTRUCTION = `
The user asked to work on the bound notebook. Answer that request.
- Call insert_notebook_block to append or replace. Do not only dump markdown in the bubble.
- If a selection is provided and they asked to change a passage, rewrite that passage only and insert it.
- If they ask to make anything on screen, emit a React artifact. Do not dump raw React into the notebook unless they ask to insert the code.
- Charts use the declarative chart artifact. Do not invent notebook data.
`.trim()
