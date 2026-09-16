/**
 * Live Academic Corpus Search for WorldInMaking AI.
 * Queries peer-reviewed academic literature, philosophy journals, DOIs,
 * citation counts, concepts, and open-access PDFs via OpenAlex & ArXiv.
 */

import { searchPhilosophicalCorpus } from './tools/philosophical-corpus'
import { searchFetchSignal } from './web-search'

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
    source: 'OpenAlex' | 'Crossref' | 'ArXiv' | 'Semantic Scholar' | 'PMC / PubMed' | 'Europe PMC' | 'Philosophical Canon' | 'Web Search'
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


function assertAcademicNotAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError')
    }
}

/** True when the *client* Stop signal fired — not provider timeouts alone. */
function isClientAcademicAbort(signal: AbortSignal | undefined, err?: unknown): boolean {
    return Boolean(signal?.aborted) || (Boolean(signal) && err instanceof Error && err.name === 'AbortError')
}

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

/** Formats academic results into high-impact Markdown with direct PDF links and shadow archive resolvers */
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
                item += `\n   - **Open Access PDF:** [📄 Read / Download PDF](${p.pdfUrl})`
            }

            // Build alternative archive & open scholarly repository access links
            const cleanDoi = p.doi ? p.doi.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').trim() : ''
            const archiveLinks: string[] = []
            if (cleanDoi) {
                archiveLinks.push(`[Sci-Hub](https://sci-hub.se/${cleanDoi})`)
                archiveLinks.push(`[Unpaywall](https://unpaywall.org/${cleanDoi})`)
            }
            archiveLinks.push(`[Anna's Archive](https://annas-archive.org/search?q=${encodeURIComponent(p.doi || p.title)})`)
            archiveLinks.push(`[Google Scholar](https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)})`)

            item += `\n   - **Alternative Archives:** ${archiveLinks.join(' · ')}`

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

    return `### References\n\n${lines.join('\n\n')}`
}

/**
 * Queries OpenAlex for academic papers with filters and sorting.
 */
async function queryOpenAlex(
    query: string,
    options?: AcademicSearchOptions,
    signal?: AbortSignal
): Promise<AcademicPaper[]> {
    assertAcademicNotAborted(signal)

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
            signal: searchFetchSignal(SEARCH_TIMEOUT_MS, signal),
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
    } catch (err) {
        if (isClientAcademicAbort(signal, err)) {
            throw err instanceof Error ? err : new DOMException('The operation was aborted.', 'AbortError')
        }
        return []
    }
}

/**
 * Queries ArXiv API (supplementary engine for AI, physics, formal epistemology).
 */
async function queryArXiv(query: string, limit = 3, signal?: AbortSignal): Promise<AcademicPaper[]> {
    assertAcademicNotAborted(signal)

    try {
        const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${Math.min(limit, 5)}`
        const res = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            signal: searchFetchSignal(SEARCH_TIMEOUT_MS, signal),
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
    } catch (err) {
        if (isClientAcademicAbort(signal, err)) {
            throw err instanceof Error ? err : new DOMException('The operation was aborted.', 'AbortError')
        }
        return []
    }
}

/**
 * Queries Crossref API (official global registry of scholarly DOIs with 150M+ records).
 */
async function queryCrossref(
    query: string,
    options?: AcademicSearchOptions,
    signal?: AbortSignal
): Promise<AcademicPaper[]> {
    assertAcademicNotAborted(signal)

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
            signal: searchFetchSignal(SEARCH_TIMEOUT_MS, signal),
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
    } catch (err) {
        if (isClientAcademicAbort(signal, err)) {
            throw err instanceof Error ? err : new DOMException('The operation was aborted.', 'AbortError')
        }
        return []
    }
}

/**
 * Queries NCBI PubMed Central (PMC) via official E-Utilities API for peer-reviewed biomedical and scientific literature.
 */
async function queryNcbiPmc(
    query: string,
    limit = 3,
    signal?: AbortSignal
): Promise<AcademicPaper[]> {
    assertAcademicNotAborted(signal)

    try {
        const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmode=json&retmax=${Math.min(limit, 5)}`
        const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': USER_AGENT },
            signal: searchFetchSignal(SEARCH_TIMEOUT_MS, signal),
        })

        if (!searchRes.ok) return []

        const searchData = (await searchRes.json()) as {
            esearchresult?: { idlist?: string[] }
        }
        const idList = searchData?.esearchresult?.idlist
        if (!Array.isArray(idList) || idList.length === 0) return []

        assertAcademicNotAborted(signal)

        const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${idList.join(',')}&retmode=json`
        const summaryRes = await fetch(summaryUrl, {
            headers: { 'User-Agent': USER_AGENT },
            signal: searchFetchSignal(SEARCH_TIMEOUT_MS, signal),
        })

        if (!summaryRes.ok) return []

        const summaryData = (await summaryRes.json()) as {
            result?: Record<string, any>
        }
        if (!summaryData?.result) return []

        const papers: AcademicPaper[] = []

        for (const uid of idList) {
            const item = summaryData.result[uid]
            if (!item || !item.title) continue

            const cleanTitle = String(item.title).replace(/<[^>]*>/g, '').trim()
            const authors: string[] = []
            if (Array.isArray(item.authors)) {
                for (const a of item.authors.slice(0, 4)) {
                    if (a?.name) authors.push(String(a.name).trim())
                }
            }

            let year: number | undefined
            if (item.pubdate) {
                const yearMatch = String(item.pubdate).match(/\b(19|20)\d{2}\b/)
                if (yearMatch) year = parseInt(yearMatch[0], 10)
            }

            let doi: string | undefined
            if (Array.isArray(item.articleids)) {
                const doiEntry = item.articleids.find((aid: any) => aid?.idtype === 'doi')
                if (doiEntry?.value) {
                    doi = String(doiEntry.value).startsWith('http')
                        ? String(doiEntry.value)
                        : `https://doi.org/${doiEntry.value}`
                }
            }

            // PMC articles are open-access full-text repository articles with downloadable PDF
            const pdfUrl = `https://pmc.ncbi.nlm.nih.gov/articles/PMC${uid}/pdf/`

            papers.push({
                id: `pmc-${uid}`,
                title: cleanTitle,
                authors,
                year,
                venue: item.source ? String(item.source).trim() : 'PubMed Central',
                citationCount: 0,
                doi,
                pdfUrl,
                source: 'PMC / PubMed' as const,
            })
        }

        return papers
    } catch (err) {
        if (isClientAcademicAbort(signal, err)) {
            throw err instanceof Error ? err : new DOMException('The operation was aborted.', 'AbortError')
        }
        return []
    }
}

/**
 * Queries Semantic Scholar Academic Graph API with graceful rate-limit handling.
 */
async function querySemanticScholar(
    query: string,
    limit = 3,
    signal?: AbortSignal
): Promise<AcademicPaper[]> {
    assertAcademicNotAborted(signal)

    try {
        const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${Math.min(limit, 5)}&fields=title,authors,year,venue,citationCount,externalIds,openAccessPdf,abstract`
        const res = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'application/json',
            },
            signal: searchFetchSignal(6_000, signal),
        })

        if (!res.ok) return []

        const data = (await res.json()) as {
            data?: Array<{
                paperId: string
                title?: string
                year?: number
                venue?: string
                citationCount?: number
                authors?: Array<{ name?: string }>
                externalIds?: { DOI?: string; ArXiv?: string }
                openAccessPdf?: { url?: string }
                abstract?: string
            }>
        }

        if (!Array.isArray(data?.data)) return []

        return data.data.map((p) => {
            const authors = (p.authors || [])
                .map((a) => a.name?.trim())
                .filter((n): n is string => Boolean(n))
                .slice(0, 4)

            const doi = p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : undefined
            const pdfUrl =
                p.openAccessPdf?.url ||
                (p.externalIds?.ArXiv ? `https://arxiv.org/pdf/${p.externalIds.ArXiv}.pdf` : undefined)

            let abstractText: string | undefined
            if (typeof p.abstract === 'string') {
                abstractText = p.abstract.trim()
                if (abstractText.length > 500) abstractText = `${abstractText.slice(0, 500)}…`
            }

            return {
                id: p.paperId || `s2-${Math.random()}`,
                title: p.title?.trim() || 'Untitled Paper',
                authors,
                year: p.year,
                venue: p.venue?.trim(),
                citationCount: p.citationCount || 0,
                doi,
                pdfUrl,
                abstract: abstractText,
                source: 'Semantic Scholar' as const,
            }
        })
    } catch (err) {
        if (isClientAcademicAbort(signal, err)) {
            throw err instanceof Error ? err : new DOMException('The operation was aborted.', 'AbortError')
        }
        return []
    }
}

/**
 * Fast resolution of Open Access PDF via Unpaywall for papers with a DOI but no direct PDF.
 */
async function resolveOaPdfViaUnpaywall(doi: string, signal?: AbortSignal): Promise<string | undefined> {
    assertAcademicNotAborted(signal)

    const cleanDoi = doi.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').trim()
    if (!cleanDoi) return undefined

    try {
        const url = `https://api.unpaywall.org/v2/${encodeURIComponent(cleanDoi)}?email=dursunkayamustafa@gmail.com`
        const res = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            signal: searchFetchSignal(4_000, signal),
        })

        if (!res.ok) return undefined

        const data = (await res.json()) as {
            is_oa?: boolean
            best_oa_location?: { url_for_pdf?: string; url?: string }
        }

        if (data?.is_oa && data.best_oa_location) {
            return data.best_oa_location.url_for_pdf || data.best_oa_location.url || undefined
        }
        return undefined
    } catch {
        return undefined
    }
}

/**
 * Searches the academic corpus across peer-reviewed repositories with advanced filters.
 */
export async function searchAcademicCorpus(
    query: string,
    options?: AcademicSearchOptions,
    signal?: AbortSignal
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

    assertAcademicNotAborted(signal)

    const limit = options?.limit || 5
    const enhancedQuery = options?.field ? `${cleanQuery} ${options.field}` : cleanQuery

    // Query OpenAlex, Crossref, ArXiv, PMC/PubMed, and Semantic Scholar concurrently with resilience
    const [openAlexRes, crossrefRes, arxivRes, ncbiRes, s2Res] = await Promise.allSettled([
        queryOpenAlex(enhancedQuery, { ...options, limit }, signal),
        queryCrossref(enhancedQuery, { ...options, limit }, signal),
        options?.openAccessOnly ? Promise.resolve([]) : queryArXiv(cleanQuery, 2, signal),
        queryNcbiPmc(cleanQuery, 2, signal),
        querySemanticScholar(cleanQuery, 2, signal),
    ])

    // Fail closed on client Stop — do not return partial papers as a successful hit.
    assertAcademicNotAborted(signal)

    const openAlexPapers = openAlexRes.status === 'fulfilled' ? openAlexRes.value : []
    const crossrefPapers = crossrefRes.status === 'fulfilled' ? crossrefRes.value : []
    const arxivPapers = arxivRes.status === 'fulfilled' ? arxivRes.value : []
    const ncbiPapers = ncbiRes.status === 'fulfilled' ? ncbiRes.value : []
    const s2Papers = s2Res.status === 'fulfilled' ? s2Res.value : []

    // Merge papers, prioritizing peer-reviewed sources
    const seenTitles = new Set<string>()
    const seenDois = new Set<string>()
    const combined: AcademicPaper[] = []

    for (const paper of [...openAlexPapers, ...crossrefPapers, ...ncbiPapers, ...arxivPapers, ...s2Papers]) {
        const normTitle = paper.title.toLowerCase().replace(/[^a-z0-9]/g, '')
        const cleanDoi = paper.doi ? paper.doi.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '') : ''

        if (normTitle && !seenTitles.has(normTitle) && (!cleanDoi || !seenDois.has(cleanDoi))) {
            seenTitles.add(normTitle)
            if (cleanDoi) seenDois.add(cleanDoi)
            combined.push(paper)
        }
        if (combined.length >= limit * 2) break
    }

    assertAcademicNotAborted(signal)

    // For top candidate papers lacking a direct pdfUrl, attempt OA PDF resolution via Unpaywall
    const missingPdf = combined.filter((p) => !p.pdfUrl && p.doi).slice(0, 3)
    if (missingPdf.length > 0) {
        await Promise.allSettled(
            missingPdf.map(async (p) => {
                if (p.doi) {
                    const resolvedPdf = await resolveOaPdfViaUnpaywall(p.doi, signal)
                    if (resolvedPdf) {
                        p.pdfUrl = resolvedPdf
                    }
                }
            })
        )
    }

    assertAcademicNotAborted(signal)

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

    assertAcademicNotAborted(signal)

    return {
        ok: true,
        query: cleanQuery,
        total: finalPapers.length,
        papers: finalPapers,
        formatted: formatAcademicResults(finalPapers),
        bibliography: formatApaBibliography(finalPapers),
    }
}
