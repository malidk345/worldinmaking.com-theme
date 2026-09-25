/**
 * Client-safe helpers for putting chat citations into notebooks:
 *  - whole-reply "Add": [P#] / [n] / [Source n] markers → real notebook footnotes
 *    (`[^k]` + `[^k]: APA reference`), which the notebook renumbers on insert;
 *  - duplicate detection for Sources panel "Add to notebook" (DOI / URL / title).
 */
import { bareDoi, formatApaReference } from './ai/citation-format'
import { mapCitationMarkers } from './ai/citation-markers'
import type { WebCitation } from '../components/ClaudeWorkspaceChat/types'

export type NotebookSourceKey = { doi?: string; url?: string; title?: string }

/**
 * Rewrites known citation markers to footnote references numbered 1..k by first use and
 * appends one definition per cited source. Unknown ids keep their marker text.
 */
export function citationMarkersToFootnotes(markdown: string, citations: WebCitation[] | undefined): string {
    const text = String(markdown || '')
    const byId = new Map((citations || []).map((c) => [c.id, c]))
    if (!text || byId.size === 0) return text
    const order: number[] = []
    const footnoteFor = (id: number) => {
        let index = order.indexOf(id)
        if (index === -1) {
            order.push(id)
            index = order.length - 1
        }
        return `[^${index + 1}]`
    }
    const body = mapCitationMarkers(text, (ids) => {
        const known = ids.filter((id) => byId.has(id))
        if (known.length === 0) return null
        const unknown = ids.filter((id) => !byId.has(id))
        return known.map(footnoteFor).join('') + (unknown.length ? ` [${unknown.join(', ')}]` : '')
    })
    if (order.length === 0) return text
    const definitions = order.map((id, index) => `[^${index + 1}]: ${formatApaReference(byId.get(id)!).replace(/\s*\n\s*/g, ' ')}`)
    return `${body.trimEnd()}\n\n${definitions.join('\n')}`
}

function normalizeUrl(value: string | undefined): string {
    const raw = String(value || '').trim()
    if (!/^https?:\/\//i.test(raw)) return ''
    try {
        const url = new URL(raw)
        const host = url.hostname.replace(/^www\./i, '').toLowerCase()
        const path = url.pathname.replace(/\/+$/, '')
        return `${host}${path}${url.search}`.toLowerCase()
    } catch {
        return ''
    }
}

function normalizeTitle(value: string | undefined): string {
    return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

export function notebookSourceKey(citation: Pick<WebCitation, 'doi' | 'url' | 'title'>): NotebookSourceKey {
    return {
        doi: bareDoi(citation.doi) || bareDoi(citation.url) || undefined,
        url: normalizeUrl(citation.url) || undefined,
        title: citation.title || undefined,
    }
}

/** Footnote definitions plus reference-looking lines (APA year, DOI or URL). */
function referenceLines(markdown: string): string[] {
    return String(markdown || '')
        .split('\n')
        .filter((line) => /^\s*\[\^[\w-]+\]:/.test(line) || /\((?:1[5-9]|20)\d{2}[a-z]?\)|\(n\.d\.\)|doi\.org\/|https?:\/\//i.test(line))
}

/**
 * True when the notebook already references this source: same DOI anywhere, same URL
 * anywhere, or (for titles of 12+ characters) the same title inside a footnote /
 * reference-looking line. Prose that merely mentions the title does not count.
 */
export function notebookHasSource(markdown: string | undefined, source: NotebookSourceKey): boolean {
    const content = String(markdown || '')
    if (!content.trim()) return false
    const lower = content.toLowerCase()
    if (source.doi && lower.includes(source.doi.toLowerCase())) return true
    if (source.url) {
        for (const match of content.match(/https?:\/\/[^\s)>\]]+/gi) || []) {
            if (normalizeUrl(match.replace(/[.,;]+$/, '')) === source.url) return true
        }
    }
    const title = normalizeTitle(source.title)
    if (title.length >= 12) {
        return referenceLines(content).some((line) => ` ${normalizeTitle(line)} `.includes(` ${title} `))
    }
    return false
}
