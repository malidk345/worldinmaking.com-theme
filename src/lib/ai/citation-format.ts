/**
 * Client-safe formatting helpers for academic citations (Sources panel cards,
 * "Copy APA", "Add to notebook"). Pure functions — no server imports.
 */

import type { AiCitation } from './contracts'

type CitationLike = Pick<AiCitation, 'title' | 'url'> &
    Partial<Pick<AiCitation, 'authors' | 'year' | 'venue' | 'doi' | 'kind' | 'source' | 'pdfUrl' | 'oaUrl'>>

const ENCYCLOPEDIA_NAMES: Record<string, string> = {
    SEP: 'Stanford Encyclopedia of Philosophy',
    IEP: 'Internet Encyclopedia of Philosophy',
}

/** "Martin Heidegger" → "Heidegger, M."; "Heidegger, Martin" → "Heidegger, M."; organisations kept. */
export function apaAuthorName(name: string): string {
    const clean = String(name || '').replace(/\s+/g, ' ').trim()
    if (!clean) return ''
    let family: string
    let given: string[]
    if (clean.includes(',')) {
        const [f, g] = clean.split(',', 2)
        family = f.trim()
        given = (g || '').trim().split(/[\s-]+/).filter(Boolean)
    } else {
        const parts = clean.split(' ')
        if (parts.length === 1) return clean
        family = parts[parts.length - 1]
        given = parts.slice(0, -1)
    }
    const initials = given
        .map((g) => g.replace(/\./g, ''))
        .filter(Boolean)
        .map((g) => `${g.charAt(0).toLocaleUpperCase('tr')}.`)
        .join(' ')
    return initials ? `${family}, ${initials}` : family
}

export function apaAuthorList(authors: string[] | undefined): string {
    const names = (authors || []).map(apaAuthorName).filter(Boolean)
    if (names.length === 0) return ''
    if (names.length === 1) return names[0]
    if (names.length <= 20) return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`
    return `${names.slice(0, 19).join(', ')}, … ${names[names.length - 1]}`
}

export function bareDoi(value?: string): string {
    const raw = String(value || '').trim()
    const stripped = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '')
    return /^10\.\d{4,9}\/\S+$/.test(stripped) ? stripped : ''
}

export function citationDoiUrl(c: Pick<AiCitation, 'doi' | 'url'>): string | undefined {
    const doi = bareDoi(c.doi) || bareDoi(c.url)
    return doi ? `https://doi.org/${doi}` : undefined
}

export function isAcademicCitation(c: Partial<Pick<AiCitation, 'kind'>> | undefined | null): boolean {
    return c?.kind === 'paper' || c?.kind === 'encyclopedia'
}

/** APA 7-style reference string (plain text; no italics markup). */
export function formatApaReference(c: CitationLike): string {
    const title = String(c.title || '').trim().replace(/[.\s]+$/, '')
    const year = c.year ? `(${c.year})` : '(n.d.)'
    if (c.kind === 'encyclopedia') {
        const work = ENCYCLOPEDIA_NAMES[String(c.source || '')] || c.venue || c.source || 'Encyclopedia'
        const authors = apaAuthorList(c.authors)
        return `${authors ? `${authors} ` : ''}${year}. ${title}. In ${work}. ${c.url}`.replace(/\s+/g, ' ').trim()
    }
    const authors = apaAuthorList(c.authors)
    const doiUrl = citationDoiUrl(c)
    const parts = [authors ? `${authors} ${year}.` : `${title}. ${year}.`]
    if (authors) parts.push(`${title}.`)
    if (c.venue) parts.push(`${c.venue.replace(/[.\s]+$/, '')}.`)
    parts.push(doiUrl || c.oaUrl || c.pdfUrl || c.url || '')
    return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/** "Heidegger, M., & Lovitt, W. · 1977 · Harper & Row" style meta line for cards. */
export function citationMetaLine(c: Pick<AiCitation, 'authors' | 'year' | 'venue'>): string {
    const authors = c.authors || []
    const authorText = authors.length === 0 ? '' : authors.length > 3 ? `${authors.slice(0, 3).join(', ')} et al.` : authors.join(', ')
    return [authorText, c.year ? String(c.year) : '', c.venue || ''].filter(Boolean).join(' · ')
}
