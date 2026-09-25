/**
 * Inline numbered citation markers shared by the server (citation verification)
 * and the chat UI (clickable markers). Client-safe: no Node / server imports.
 *
 * Recognised markers: [P3], [3], [P1, P4], [1; 2], [Source 2]. Skipped: code
 * spans / fences, footnotes ([^1]), markdown links ([1](url)), reference
 * definitions ([1]: url) and reference links (text][1]).
 */

/** A run of one or more adjacent markers, e.g. `[P1][P3]` or `[2, 5]`. */
const MARKER_RE = /(?:\[(?:Source\s+)?P?\d{1,3}(?:\s*[,;]\s*(?:Source\s+)?P?\d{1,3})*\])+/g
const ID_RE = /\d{1,3}/g

export const CITE_HREF_PREFIX = '#cite-'
export const CITE_UNKNOWN_HREF_PREFIX = '#cite-unknown-'

type Segment = { code: boolean; text: string }

/** Splits markdown into code (fenced / inline) and prose segments. */
export function splitCodeSegments(markdown: string): Segment[] {
    const out: Segment[] = []
    const text = String(markdown || '')
    const re = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`/g
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
        if (m.index > last) out.push({ code: false, text: text.slice(last, m.index) })
        out.push({ code: true, text: m[0] })
        last = m.index + m[0].length
    }
    if (last < text.length) out.push({ code: false, text: text.slice(last) })
    return out
}

function isCitationContext(text: string, index: number, length: number): boolean {
    const before = index > 0 ? text[index - 1] : ''
    const after = text[index + length] || ''
    if (before === ']' || before === '\\' || before === '!') return false
    if (after === '(' || after === ':') return false
    return true
}

/** Citation ids referenced in the prose (code excluded), in first-seen order, deduplicated. */
export function extractCitationIds(markdown: string): number[] {
    const seen = new Set<number>()
    const ids: number[] = []
    for (const seg of splitCodeSegments(markdown)) {
        if (seg.code) continue
        MARKER_RE.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = MARKER_RE.exec(seg.text))) {
            if (!isCitationContext(seg.text, m.index, m[0].length)) continue
            for (const idText of m[0].match(ID_RE) || []) {
                const id = Number(idText)
                if (id > 0 && !seen.has(id)) {
                    seen.add(id)
                    ids.push(id)
                }
            }
        }
    }
    return ids
}

/**
 * Rewrites markers into markdown links the renderer turns into small buttons:
 * known ids → `[3](#cite-3)`, unknown ids → `[3](#cite-unknown-3)`.
 * Returns the input unchanged when there are no known ids at all.
 */
export function linkifyCitationMarkers(markdown: string, knownIds: Iterable<number>): string {
    const known = new Set(knownIds)
    if (known.size === 0 || !markdown) return markdown
    return splitCodeSegments(markdown)
        .map((seg) => {
            if (seg.code) return seg.text
            return seg.text.replace(MARKER_RE, (full: string, offset: number, whole: string) => {
                if (!isCitationContext(whole, offset, full.length)) return full
                const ids = (full.match(ID_RE) || []).map(Number).filter((n) => n > 0)
                if (ids.length === 0) return full
                return ids
                    .map((id) => `[${id}](${known.has(id) ? CITE_HREF_PREFIX : CITE_UNKNOWN_HREF_PREFIX}${id})`)
                    .join('')
            })
        })
        .join('')
}

/** `#cite-3` → { id: 3, known: true }; `#cite-unknown-9` → { id: 9, known: false }; else null. */
export function parseCitationHref(href: string | undefined | null): { id: number; known: boolean } | null {
    const value = String(href || '')
    if (value.startsWith(CITE_UNKNOWN_HREF_PREFIX)) {
        const id = Number(value.slice(CITE_UNKNOWN_HREF_PREFIX.length))
        return Number.isInteger(id) && id > 0 ? { id, known: false } : null
    }
    if (value.startsWith(CITE_HREF_PREFIX)) {
        const id = Number(value.slice(CITE_HREF_PREFIX.length))
        return Number.isInteger(id) && id > 0 ? { id, known: true } : null
    }
    return null
}
