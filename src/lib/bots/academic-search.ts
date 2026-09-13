/**
 * Live Academic Corpus Search for WorldInMaking AI.
 * Queries peer-reviewed academic literature, philosophy journals, DOIs,
 * citation counts, and open-access PDFs via OpenAlex & ArXiv.
 */

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
    source: 'OpenAlex' | 'ArXiv' | 'Semantic Scholar'
}

export interface AcademicSearchResult {
    ok: boolean
    query: string
    total: number
    papers: AcademicPaper[]
    formatted: string
    error?: string
}

const SEARCH_TIMEOUT_MS = 8_000
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

export function formatAcademicResults(papers: AcademicPaper[]): string {
    if (!papers || papers.length === 0) return 'No academic papers found matching the query.'

    return papers
        .map((p, idx) => {
            const authorStr = p.authors.length > 0 ? p.authors.join(', ') : 'Unknown Author'
            const yearStr = p.year ? ` (${p.year})` : ''
            const venueStr = p.venue ? ` — *${p.venue}*` : ''
            const citeStr = p.citationCount > 0 ? ` [Cited by ${p.citationCount}]` : ''

            let item = `${idx + 1}. **${p.title}**${yearStr}\n   - **Authors:** ${authorStr}${venueStr}${citeStr}`
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

/**
 * Queries OpenAlex for academic papers (primary engine).
 */
async function queryOpenAlex(query: string, limit = 5): Promise<AcademicPaper[]> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

    try {
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${Math.min(limit, 10)}&mailto=dursunkayamustafa@gmail.com`
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
            }>
        }

        if (!data?.results || !Array.isArray(data.results)) return []

        return data.results.slice(0, limit).map((r) => {
            const authors = (r.authorships || [])
                .map((a) => a.author?.display_name?.trim())
                .filter((name): name is string => Boolean(name))
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
        entries.shift() // Remove header chunk

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
 * Searches the academic corpus across peer-reviewed repositories.
 */
export async function searchAcademicCorpus(
    query: string,
    options?: { limit?: number; field?: string }
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

    // Run OpenAlex and ArXiv in parallel
    const [openAlexPapers, arxivPapers] = await Promise.all([
        queryOpenAlex(enhancedQuery, limit),
        queryArXiv(cleanQuery, 2),
    ])

    // Merge papers, prioritizing OpenAlex (peer-reviewed & cited) followed by ArXiv
    const seenTitles = new Set<string>()
    const combined: AcademicPaper[] = []

    for (const paper of [...openAlexPapers, ...arxivPapers]) {
        const normTitle = paper.title.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (!seenTitles.has(normTitle)) {
            seenTitles.add(normTitle)
            combined.push(paper)
        }
        if (combined.length >= limit) break
    }

    // Sort by citation count descending
    combined.sort((a, b) => b.citationCount - a.citationCount)

    return {
        ok: combined.length > 0,
        query: cleanQuery,
        total: combined.length,
        papers: combined,
        formatted: formatAcademicResults(combined),
    }
}
