/**
 * Pure text helpers NotebookApp uses when the chat inserts content.
 * Text-level on purpose: the rest of the notebook's markdown is never re-serialized.
 */
import { splitCodeSegments } from './ai/citation-markers'

const FOOTNOTE_REF_RE = /\[\^([A-Za-z0-9_-]+)\]/g

/** Highest numeric footnote id in the notebook (`[^7]` → 7), ignoring code. */
export function maxNumericFootnoteId(markdown: string): number {
    let max = 0
    for (const seg of splitCodeSegments(markdown)) {
        if (seg.code) continue
        for (const match of Array.from(seg.text.matchAll(FOOTNOTE_REF_RE))) {
            if (/^\d+$/.test(match[1])) max = Math.max(max, Number(match[1]))
        }
    }
    return max
}

const FOOTNOTE_DEF_LINE_RE = /^\[\^([A-Za-z0-9_-]+)\]:[ \t]*(.*)$/

const normalizeDefinition = (text: string): string => text.replace(/\s+/g, ' ').trim().toLowerCase()

/** `[^id]: text` definitions already in the notebook, keyed by normalized text (first id wins). */
function existingDefinitions(markdown: string): Map<string, string> {
    const out = new Map<string, string>()
    for (const seg of splitCodeSegments(markdown)) {
        if (seg.code) continue
        for (const line of seg.text.split('\n')) {
            const match = line.match(FOOTNOTE_DEF_LINE_RE)
            if (!match) continue
            const key = normalizeDefinition(match[2])
            if (key && !out.has(key)) out.set(key, match[1])
        }
    }
    return out
}

/**
 * Renumbers the inserted block's footnotes (refs and `[^id]:` definitions) after the
 * notebook's own, in first-use order, so an inserted `[^1]` can never collide with an
 * existing `[^1]`. An inserted definition whose text already exists in the notebook
 * reuses that footnote instead of adding a duplicate. Content without footnotes is
 * returned unchanged.
 */
export function renumberInsertedFootnotes(current: string, inserted: string): string {
    const text = String(inserted || '')
    if (!/\[\^[A-Za-z0-9_-]+\]/.test(text)) return text
    const offset = maxNumericFootnoteId(String(current || ''))
    const existing = existingDefinitions(String(current || ''))
    const segments = splitCodeSegments(text)
    // Inserted ids whose definition duplicates one already in the notebook.
    const reuse = new Map<string, string>()
    for (const seg of segments) {
        if (seg.code) continue
        for (const line of seg.text.split('\n')) {
            const match = line.match(FOOTNOTE_DEF_LINE_RE)
            if (!match) continue
            const hit = existing.get(normalizeDefinition(match[2]))
            if (hit && !reuse.has(match[1])) reuse.set(match[1], hit)
        }
    }
    const map = new Map<string, string>()
    let next = offset
    for (const seg of segments) {
        if (seg.code) continue
        for (const match of Array.from(seg.text.matchAll(FOOTNOTE_REF_RE))) {
            if (map.has(match[1])) continue
            map.set(match[1], reuse.get(match[1]) || String(++next))
        }
    }
    return segments
        .map((seg) => {
            if (seg.code) return seg.text
            const kept = reuse.size
                ? seg.text
                      .split('\n')
                      .filter((line) => {
                          const match = line.match(FOOTNOTE_DEF_LINE_RE)
                          return !(match && reuse.has(match[1]))
                      })
                      .join('\n')
                : seg.text
            return kept.replace(FOOTNOTE_REF_RE, (_full, id: string) => `[^${map.get(id) || id}]`)
        })
        .join('')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd()
}

/** The notebook's insert composition (append / prepend / replace) with footnote renumbering. */
export function composeNotebookInsert(current: string, text: string, mode: 'append' | 'replace' | 'prepend' = 'append'): string {
    if (mode === 'replace') return `${text}\n`
    const block = renumberInsertedFootnotes(current, text)
    if (mode === 'prepend') return `${block}\n\n${current}`
    return current.trim() ? `${current.trim()}\n\n${block}\n` : `${block}\n`
}
