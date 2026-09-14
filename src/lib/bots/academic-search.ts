/**
 * Live Academic Corpus Search for WorldInMaking AI.
 * Queries peer-reviewed academic literature, philosophy journals, DOIs,
 * citation counts, concepts, and open-access PDFs via OpenAlex & ArXiv.
 */

import { searchPhilosophicalCorpus } from './tools/philosophical-corpus'

export interface AcademicPaper {
    id: string
    title: string
    authors: string[]
    year?: number
    venue?: string
    citationCount: number
    doi?: string
    pdfUrl?: string
    abstract?: string
    concepts?: string[]
    source: 'OpenAlex' | 'Crossref' | 'ArXiv' | 'Semantic Scholar' | 'Philosophical Canon' | 'Web Search'
}

export interface AcademicSearchOptions {
    limit?: number
    field?: string
    yearFrom?: number
    yearTo?: number
    sortBy?: 'citations' | 'recent' | 'relevance'
    openAccessOnly?: boolean
}

export interface AcademicSearchResult {
    ok: boolean
    query: string
    total: number
    papers: AcademicPaper[]
    formatted: string
    bibliography?: string
    error?: string
}

const SEARCH_TIMEOUT_MS = 12_000
const USER_AGENT = 'WorldInMaking/1.0 (https://worldinmaking.com; mailto:dursunkayamustafa@gmail.com)'

/** Reconstruct abstract text from OpenAlex inverted index */
export function reconstructAbstract(invertedIndex?: Record<string, number[]> | null, maxChars = 600): string {
    if (!invertedIndex || typeof invertedIndex !== 'object') return ''
    const wordEntries: Array<[number, string]> = []
    for (const [word, positions] of Object.entries(invertedIndex)) {
        if (Array.isArray(positions)) {
            for (const pos of positions) {
                wordEntries.push([pos, word])
            }
        }
    }
    wordEntries.sort((a, b) => a[0] - b[0])
    const full = wordEntries.map((entry) => entry[1]).join(' ')
    return full.length > maxChars ? `${full.slice(0, maxChars)}…` : full
}

/** Formats academic results into high-impact Markdown */
export function formatAcademicResults(papers: AcademicPaper[]): string {
    if (!papers || papers.length === 0) return 'No academic papers found matching the query.'

    return papers
        .map((p, idx) => {
            const authorStr = p.authors.length > 0 ? p.authors.join(', ') : 'Unknown Author'
            const yearStr = p.year ? ` (${p.year})` : ''
            const venueStr = p.venue ? ` — *${p.venue}*` : ''
            const citeStr = p.citationCount > 0 ? ` [Cited by ${p.citationCount}]` : ''
            const conceptStr = p.concepts && p.concepts.length > 0 ? `\n   - **Topics:** ${p.concepts.join(', ')}` : ''

            let item = `${idx + 1}. **${p.title}**${yearStr}\n   - **Authors:** ${authorStr}${venueStr}${citeStr}${conceptStr}`
            if (p.doi) {
                item += `\n   - **DOI:** ${p.doi}`
            }
            if (p.pdfUrl) {
                item += `\n   - **Open Access PDF:** ${p.pdfUrl}`
            }
            if (p.abstract) {
                item += `\n   - **Abstract:** ${p.abstract}`
            }
            return item
        })
        .join('\n\n')
}

/** Formats papers into standard APA bibliography format suitable for WIM notebooks */
export function formatApaBibliography(papers: AcademicPaper[]): string {
    if (!papers || papers.length === 0) return ''

    const lines = papers.map((p) => {
        const authors = p.authors.length > 0 ? p.authors.join(', ') : 'Anonymous'
        const year = p.year ? `(${p.year})` : '(n.d.)'
        const venue = p.venue ? `*${p.venue}*.` : ''
        const doi = p.doi ? ` ${p.doi}` : ''
        return `${authors} ${year}. ${p.title}. ${venue}${doi}`
    })

    return `### References / Kaynakça\n\n${lines.join('\n\n')}`
}

/**
 * Queries OpenAlex for academic papers with filters and sorting.
 */
async function queryOpenAlex(query: string, options?: AcademicSearchOptions): Promise<AcademicPaper[]> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

    try {
        const limit = Math.min(options?.limit || 5, 10)
        const filters: string[] = []

        if (options?.yearFrom) filters.push(`publication_year:>${options.yearFrom - 1}`)
        if (options?.yearTo) filters.push(`publication_year:<${options.yearTo + 1}`)
        if (options?.openAccessOnly) filters.push('is_oa:true')

        let sortQuery = ''
        if (options?.sortBy === 'citations') {
            sortQuery = '&sort=cited_by_count:desc'
        } else if (options?.sortBy === 'recent') {
            sortQuery = '&sort=publication_date:desc'
        }

        const filterQuery = filters.length > 0 ? `&filter=${encodeURIComponent(filters.join(','))}` : ''
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${limit}${filterQuery}${sortQuery}&mailto=dursunkayamustafa@gmail.com`

        const res = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'application/json',
            },
            signal: controller.signal,
        })

        if (!res.ok) return []

        const data = (await res.json()) as {
            results?: Array<{
                id: string
                title?: string
                publication_year?: number
                doi?: string
                cited_by_count?: number
                primary_location?: { source?: { display_name?: string } }
                authorships?: Array<{ author?: { display_name?: string } }>
                open_access?: { oa_url?: string }
                abstract_inverted_index?: Record<string, number[]>
                concepts?: Array<{ display_name?: string }>
            }>
        }

        if (!data?.results || !Array.isArray(data.results)) return []

        return data.results.slice(0, limit).map((r) => {
            const authors = (r.authorships || [])
                .map((a) => a.author?.display_name?.trim())
                .filter((name): name is string => Boolean(name))
                .slice(0, 4)

            const concepts = (r.concepts || [])
                .map((c) => c.display_name?.trim())
                .filter((c): c is string => Boolean(c))
                .slice(0, 4)

            return {
                id: r.id || `openalex-${Math.random()}`,
                title: r.title?.trim() || 'Untitled Academic Paper',
                authors,
                year: r.publication_year,
                venue: r.primary_location?.source?.display_name?.trim(),
                citationCount: r.cited_by_count || 0,
                doi: r.doi || undefined,
                pdfUrl: r.open_access?.oa_url || undefined,
                abstract: reconstructAbstract(r.abstract_inverted_index),
                concepts: concepts.length > 0 ? concepts : undefined,
                source: 'OpenAlex',
            }
        })
    } catch {
        return []
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Queries ArXiv API (supplementary engine for AI, physics, formal epistemology).
 */
async function queryArXiv(query: string, limit = 3): Promise<AcademicPaper[]> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

    try {
        const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${Math.min(limit, 5)}`
        const res = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            signal: controller.signal,
        })

        if (!res.ok) return []

        const xml = await res.text()
        const entries = xml.split('<entry>')
        entries.shift()

        const papers: AcademicPaper[] = []

        for (const entry of entries.slice(0, limit)) {
            const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/)
            const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/)
            const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/)
            const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/)

            const authorMatches = Array.from(entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g))
            const authors = authorMatches.map((m) => m[1].trim()).slice(0, 4)

            const rawTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : ''
            const rawSummary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : ''
            const rawId = idMatch ? idMatch[1].trim() : ''
            const year = publishedMatch ? parseInt(publishedMatch[1].slice(0, 4), 10) : undefined

            if (rawTitle) {
                const pdfUrl = rawId.includes('arxiv.org/abs/')
                    ? rawId.replace('arxiv.org/abs/', 'arxiv.org/pdf/') + '.pdf'
                    : undefined

                papers.push({
                    id: rawId || `arxiv-${Math.random()}`,
                    title: rawTitle,
                    authors,
                    year: Number.isFinite(year) ? year : undefined,
                    venue: 'arXiv Preprint',
                    citationCount: 0,
                    doi: undefined,
                    pdfUrl,
                    abstract: rawSummary.length > 500 ? `${rawSummary.slice(0, 500)}…` : rawSummary,
                    source: 'ArXiv',
                })
            }
        }

        return papers
    } catch {
        return []
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Queries Crossref API (official global registry of scholarly DOIs with 150M+ records).
 */
async function queryCrossref(query: string, options?: AcademicSearchOptions): Promise<AcademicPaper[]> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

    try {
        const limit = Math.min(options?.limit || 5, 10)
        const filters: string[] = []

        if (options?.yearFrom) filters.push(`from-pub-date:${options.yearFrom}-01-01`)
        if (options?.yearTo) filters.push(`until-pub-date:${options.yearTo}-12-31`)

        let sortQuery = ''
        if (options?.sortBy === 'citations') {
            sortQuery = '&sort=is-referenced-by-count&order=desc'
        } else if (options?.sortBy === 'recent') {
            sortQuery = '&sort=published&order=desc'
        }

        const filterQuery = filters.length > 0 ? `&filter=${encodeURIComponent(filters.join(','))}` : ''
        const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}${filterQuery}${sortQuery}&mailto=dursunkayamustafa@gmail.com`

        const res = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'application/json',
            },
            signal: controller.signal,
        })

        if (!res.ok) return []

        const data = (await res.json()) as {
            message?: {
                items?: Array<{
                    DOI?: string
                    URL?: string
                    title?: string[]
                    author?: Array<{ given?: string; family?: string; name?: string }>
                    issued?: { 'date-parts'?: number[][] }
                    'published-print'?: { 'date-parts'?: number[][] }
                    'published-online'?: { 'date-parts'?: number[][] }
                    'container-title'?: string[]
                    'is-referenced-by-count'?: number
                    abstract?: string
                    subject?: string[]
                    link?: Array<{ URL?: string; 'content-type'?: string }>
                }>
            }
        }

        const items = data?.message?.items
        if (!Array.isArray(items)) return []

        return items.map((item) => {
            const rawTitle = Array.isArray(item.title) && item.title.length > 0 ? item.title[0] : 'Untitled Work'
            const title = rawTitle.replace(/<[^>]*>/g, '').trim()

            const authors: string[] = []
            if (Array.isArray(item.author)) {
                for (const a of item.author.slice(0, 4)) {
                    const name = [a.given, a.family].filter(Boolean).join(' ') || a.name || ''
                    if (name.trim()) authors.push(name.trim())
                }
            }

            const yearParts =
                item.issued?.['date-parts']?.[0] ||
                item['published-print']?.['date-parts']?.[0] ||
                item['published-online']?.['date-parts']?.[0]
            const year = Array.isArray(yearParts) && typeof yearParts[0] === 'number' ? yearParts[0] : undefined

            const venue =
                Array.isArray(item['container-title']) && item['container-title'].length > 0
                    ? item['container-title'][0].trim()
                    : undefined
            const citationCount =
                typeof item['is-referenced-by-count'] === 'number' ? item['is-referenced-by-count'] : 0

            const doi = item.DOI
                ? item.DOI.startsWith('http')
                    ? item.DOI
                    : `https://doi.org/${item.DOI}`
                : item.URL

            let pdfUrl: string | undefined
            if (Array.isArray(item.link)) {
                const pdfLink = item.link.find((l) => l['content-type']?.toLowerCase().includes('pdf'))
                if (pdfLink?.URL) pdfUrl = pdfLink.URL
            }

            let abstractText: string | undefined
            if (typeof item.abstract === 'string') {
                abstractText = item.abstract.replace(/<[^>]*>/g, '').trim()
                if (abstractText.length > 600) abstractText = `${abstractText.slice(0, 600)}…`
            }

            return {
                id: item.DOI || `crossref-${Math.random()}`,
                title,
                authors,
                year,
                venue,
                citationCount,
                doi,
                pdfUrl,
                abstract: abstractText,
                concepts: Array.isArray(item.subject) ? item.subject.slice(0, 4) : undefined,
                source: 'Crossref' as const,
            }
        })
    } catch {
        return []
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Searches the academic corpus across peer-reviewed repositories with advanced filters.
 */
export async function searchAcademicCorpus(
    query: string,
    options?: AcademicSearchOptions
): Promise<AcademicSearchResult> {
    const cleanQuery = query.trim()
    if (!cleanQuery) {
        return {
            ok: false,
            query: '',
            total: 0,
            papers: [],
            formatted: 'Academic query cannot be empty.',
            error: 'query is required',
        }
    }

    const limit = options?.limit || 5
    const enhancedQuery = options?.field ? `${cleanQuery} ${options.field}` : cleanQuery

    // Query OpenAlex, Crossref, and ArXiv in parallel with resilience
    const [openAlexRes, crossrefRes, arxivRes] = await Promise.allSettled([
        queryOpenAlex(enhancedQuery, { ...options, limit }),
        queryCrossref(enhancedQuery, { ...options, limit }),
        options?.openAccessOnly ? Promise.resolve([]) : queryArXiv(cleanQuery, 2),
    ])

    const openAlexPapers = openAlexRes.status === 'fulfilled' ? openAlexRes.value : []
    const crossrefPapers = crossrefRes.status === 'fulfilled' ? crossrefRes.value : []
    const arxivPapers = arxivRes.status === 'fulfilled' ? arxivRes.value : []

    // Merge papers, prioritizing peer-reviewed sources (OpenAlex & Crossref) followed by ArXiv
    const seenTitles = new Set<string>()
    const seenDois = new Set<string>()
    const combined: AcademicPaper[] = []

    for (const paper of [...openAlexPapers, ...crossrefPapers, ...arxivPapers]) {
        const normTitle = paper.title.toLowerCase().replace(/[^a-z0-9]/g, '')
        const cleanDoi = paper.doi ? paper.doi.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '') : ''

        if (normTitle && !seenTitles.has(normTitle) && (!cleanDoi || !seenDois.has(cleanDoi))) {
            seenTitles.add(normTitle)
            if (cleanDoi) seenDois.add(cleanDoi)
            combined.push(paper)
        }
        if (combined.length >= limit * 2) break
    }

    // Fallback to verified philosophical canon if scholarly APIs returned zero results
    if (combined.length === 0) {
        try {
            const canonMatches = searchPhilosophicalCorpus(cleanQuery, { limit })
            if (canonMatches && canonMatches.matches.length > 0) {
                for (const m of canonMatches.matches) {
                    combined.push({
                        id: `canon-${m.thinker.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${m.work.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                        title: `${m.thinker}: ${m.work} (${m.section})`,
                        authors: [m.thinker],
                        year: undefined,
                        venue: 'Philosophical Canon (Primary Source)',
                        citationCount: 100,
                        abstract: m.fragment,
                        concepts: m.context ? [m.context] : undefined,
                        source: 'Philosophical Canon',
                    })
                }
            }
        } catch {
            // graceful fallback
        }
    }

    // Sort according to requested option
    if (options?.sortBy === 'citations') {
        combined.sort((a, b) => b.citationCount - a.citationCount)
    } else if (options?.sortBy === 'recent') {
        combined.sort((a, b) => (b.year || 0) - (a.year || 0))
    }

    const finalPapers = combined.slice(0, limit)

    return {
        ok: true,
        query: cleanQuery,
        total: finalPapers.length,
        papers: finalPapers,
        formatted: formatAcademicResults(finalPapers),
        bibliography: formatApaBibliography(finalPapers),
    }
}
