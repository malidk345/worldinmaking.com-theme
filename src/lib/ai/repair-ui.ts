import { extractUiScreenSource, looksLikeReactSource } from './design-request'

export const REPAIR_UI_SYSTEM = `
You repair broken React/TSX so a live preview can compile it.
Return ONLY the complete corrected file. No markdown fences, no prose, no <antArtifact> tags.
Keep the same screen and data. Use Tailwind. Import primitives from @wim/ui. lucide-react and recharts are allowed.
Declare const/let data ABOVE return. Keep every className on one line. Close every string, tag, brace, and paren.
`.trim()

export function buildRepairUiPrompt(source: string, error: string): string {
    const text = String(source || '')
    const err = String(error || 'Syntax error').replace(/\s+/g, ' ').trim().slice(0, 400)
    const head = text.slice(0, 1400)
    const tail = text.length > 2800 ? text.slice(-1800) : text.slice(1400)
    const body = text.length > 2800 ? `${head}\n\n/* …truncated… */\n\n${tail}` : text
    return `Parse error:\n${err}\n\nSource:\n${body}`
}

export function extractRepairedReactSource(reply: string): string | null {
    const tagged = extractUiScreenSource(reply)
    if (tagged?.content && looksLikeReactSource(tagged.content)) return tagged.content
    const stripped = String(reply || '')
        .replace(/^```[a-z0-9_-]*[ \t]*\r?\n?/i, '')
        .replace(/\r?\n?```\s*$/i, '')
        .replace(/<\/?(?:antArtifact|artifact)\b[^>]*>/gi, '')
        .trim()
    return looksLikeReactSource(stripped) ? stripped : null
}
