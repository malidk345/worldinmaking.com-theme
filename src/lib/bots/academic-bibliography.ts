/**
 * Lightweight literature-review output for the `annotated_bibliography` tool
 * (step 3): APA references built from REAL metadata (this turn's citations, or
 * a Crossref-confirmed DOI) + the model's short annotations, as notebook-ready
 * markdown. No server storage — the notebook insert reuses the existing
 * client-side `insert_notebook_block` action.
 */

import type { AiCitation } from '../ai/contracts'
import { formatReference, type CitationStyle } from '../ai/citation-styles'
import { lookupDoiViaCrossref } from './academic-search'
import { stripTags } from './academic-common'
import { parsePaperRef } from './academic-graph'
import { normalizeWorkType } from './academic-citations'
import type { EnvStore } from './runtime-env'

export const BIBLIOGRAPHY_MAX_ENTRIES = 25
export const ANNOTATION_MAX_CHARS = 700

export interface BibliographyEntryInput {
    paper: string
    annotation?: string
}

export interface BibliographyResult {
    ok: boolean
    markdown: string
    entries: Array<{ paper: string; reference: string; citationId?: number }>
    rejected: Array<{ paper: string; reason: string }>
    error?: string
}

function cleanAnnotation(value: unknown): string {
    const text = String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim()
    if (text.length <= ANNOTATION_MAX_CHARS) return text
    const cut = text.slice(0, ANNOTATION_MAX_CHARS - 1)
    const sp = cut.lastIndexOf(' ')
    return `${(sp > ANNOTATION_MAX_CHARS * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.]+$/, '')}…`
}

/** Accepts [{paper, annotation}], ["P1", …] or a single object; aliases ref/id/source and note/summary. */
export function normalizeBibliographyEntries(raw: unknown): BibliographyEntryInput[] {
    const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : []
    const out: BibliographyEntryInput[] = []
    for (const item of list) {
        if (typeof item === 'string' || typeof item === 'number') {
            out.push({ paper: String(item) })
            continue
        }
        if (!item || typeof item !== 'object') continue
        const o = item as Record<string, unknown>
        const paper = o.paper ?? o.ref ?? o.id ?? o.source ?? o.doi ?? o.citation
        if (paper == null) continue
        out.push({ paper: String(paper), annotation: String(o.annotation ?? o.note ?? o.summary ?? o.comment ?? '') })
    }
    return out.slice(0, BIBLIOGRAPHY_MAX_ENTRIES)
}

/** Alphabetize on the first letter, not on an opening quote (MLA / Chicago works without authors). */
const sortKey = (reference: string): string => reference.replace(/^[\s"“‘'([]+/, '')

/**
 * Resolves each entry to real metadata and formats an alphabetical annotated
 * bibliography (APA by default, MLA or Chicago on request). Entries that are not a source this turn and not a
 * Crossref-confirmed DOI are rejected (never invented).
 */
export async function buildAnnotatedBibliography(
    input: BibliographyEntryInput[],
    turnCitations: AiCitation[] | undefined,
    options: { title?: string; env?: EnvStore; signal?: AbortSignal; priorCitations?: AiCitation[]; style?: CitationStyle } = {}
): Promise<BibliographyResult> {
    const style = options.style || 'apa'
    const rejected: BibliographyResult['rejected'] = []
    const resolved: Array<{ paper: string; reference: string; annotation: string; citationId?: number }> = []
    const seen = new Set<string>()
    if (input.length === 0) {
        return { ok: false, markdown: '', entries: [], rejected, error: 'entries are required: [{ "paper": "P1", "annotation": "…" }]' }
    }
    await Promise.all(
        input.map(async (entry, index) => {
            const parsed = parsePaperRef(entry.paper, turnCitations, options.priorCitations)
            if (!parsed.ok) {
                rejected.push({ paper: entry.paper, reason: parsed.error })
                return
            }
            const ref = parsed.ref
            let reference = ''
            if (ref.citation) {
                reference = formatReference(ref.citation, style)
            } else if (ref.doi) {
                const found = await lookupDoiViaCrossref(ref.doi, { env: options.env, signal: options.signal })
                if (!found.found || !found.title) {
                    rejected.push({ paper: entry.paper, reason: found.transient ? 'Crossref unavailable — could not confirm the DOI' : 'DOI not found in Crossref' })
                    return
                }
                reference = formatReference({
                    title: stripTags(found.title),
                    url: `https://doi.org/${ref.doi}`,
                    authors: found.authors?.map((a) => stripTags(a)),
                    year: found.year,
                    venue: found.venue ? stripTags(found.venue) : undefined,
                    doi: ref.doi,
                    kind: 'paper',
                    workType: normalizeWorkType(found.paper?.type),
                }, style)
            } else {
                rejected.push({ paper: entry.paper, reason: 'use a [P#] from this turn or a DOI' })
                return
            }
            resolved[index] = { paper: entry.paper, reference, annotation: cleanAnnotation(entry.annotation), citationId: ref.existingId }
        })
    )
    const entries = resolved
        .filter(Boolean)
        .filter((e) => {
            const key = e.reference.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
        .sort((a, b) => sortKey(a.reference).localeCompare(sortKey(b.reference), 'en', { sensitivity: 'base' }))
    if (entries.length === 0) {
        return { ok: false, markdown: '', entries: [], rejected, error: 'none of the entries could be matched to a real source' }
    }
    const title = String(options.title || '').replace(/\s+/g, ' ').trim().slice(0, 120)
    const lines = [`## Annotated bibliography${title ? `: ${title}` : ''}`, '']
    for (const e of entries) {
        lines.push(e.annotation ? `${e.reference}  \n${e.annotation}` : e.reference, '')
    }
    return {
        ok: true,
        markdown: lines.join('\n').trim(),
        entries: entries.map((e) => ({ paper: e.paper, reference: e.reference, ...(e.citationId ? { citationId: e.citationId } : {}) })),
        rejected,
    }
}
