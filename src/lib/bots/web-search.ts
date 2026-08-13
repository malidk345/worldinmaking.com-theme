/**
 * Multi-provider web search. Live path is LangChain-free.
 *
 * Order: Tavily (if keys) → Brave (if keys) → Wikipedia → DuckDuckGo Instant → DDG Lite.
 * Comma-separated keys rotate and fail over on 429/5xx. Missing keys are skipped.
 */

import { getRuntimeEnv } from './runtime-env'
import { isNewsQuery } from './search-intent'
import { collectApiKeys, rotateKeys } from './search-keys'

export type SearchSource = 'Tavily' | 'Brave' | 'DuckDuckGo API' | 'DuckDuckGo Web' | 'Wikipedia'

export interface SearchResultItem {
    title: string
    url: string
    snippet: string
    source: SearchSource
}

export function formatSearchResults(results: SearchResultItem[]): string {
    if (results.length === 0) return ''
    return results
        .map(
            (r, i) =>
                `[Source ${i + 1} - ${r.source}]\nTitle: ${r.title}\nURL: ${r.url}\nSummary: ${r.snippet}`
        )
        .join('\n\n')
}

function decodeHtml(str: string): string {
    return str
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<[^>]+>/g, '')
}

function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

function pushUnique(results: SearchResultItem[], item: SearchResultItem, limit = 6): void {
    if (results.length >= limit) return
    if (!item.title.trim() || !isHttpUrl(item.url)) return
    const key = item.url.replace(/\/+$/, '').toLowerCase()
    if (results.some((existing) => existing.url.replace(/\/+$/, '').toLowerCase() === key)) return
    results.push({
        title: item.title.trim().slice(0, 180),
        url: item.url,
        snippet: item.snippet.trim().slice(0, 400),
        source: item.source,
    })
}

function looksLikeEntityQuery(query: string): boolean {
    const words = query.trim().split(/\s+/).filter(Boolean)
    return words.length > 0 && words.length <= 6 && !/[?]/.test(query)
}

function isRetryableSearchStatus(status: number): boolean {
    return status === 401 || status === 403 || status === 408 || status === 429 || status >= 500
}

let tavilyCursor = 0
let braveCursor = 0

type SearchAttempt = { hits: SearchResultItem[]; retryable: boolean }

async function searchWithKeyFailover(
    keys: string[],
    search: (apiKey: string) => Promise<SearchAttempt>
): Promise<SearchResultItem[]> {
    for (const apiKey of keys) {
        try {
            const attempt = await search(apiKey)
            if (attempt.hits.length > 0) return attempt.hits
            if (!attempt.retryable) return []
        } catch {
            /* next key */
        }
    }
    return []
}

async function searchTavily(query: string, apiKey: string): Promise<SearchAttempt> {
    const topics: Array<'news' | 'general'> = isNewsQuery(query) ? ['news', 'general'] : ['general']
    try {
        for (const topic of topics) {
            const res = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    query,
                    search_depth: 'basic',
                    max_results: 5,
                    include_answer: false,
                    topic,
                }),
                signal: AbortSignal.timeout(5000),
            })
            if (!res.ok) {
                if (topic === 'news') continue
                return { hits: [], retryable: isRetryableSearchStatus(res.status) }
            }
            const data = (await res.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> }
            const hits: SearchResultItem[] = []
            for (const row of data.results || []) {
                if (row.title && row.url) {
                    pushUnique(hits, {
                        title: row.title,
                        url: row.url,
                        snippet: row.content || '',
                        source: 'Tavily',
                    })
                }
            }
            return { hits, retryable: false }
        }
        return { hits: [], retryable: true }
    } catch {
        return { hits: [], retryable: true }
    }
}

async function searchBrave(query: string, apiKey: string): Promise<SearchAttempt> {
    try {
        const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
            headers: {
                Accept: 'application/json',
                'X-Subscription-Token': apiKey,
            },
            signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) return { hits: [], retryable: isRetryableSearchStatus(res.status) }
        const data = (await res.json()) as { web?: { results?: Array<{ title?: string; url?: string; description?: string }> } }
        const hits: SearchResultItem[] = []
        for (const row of data.web?.results || []) {
            if (row.title && row.url) {
                pushUnique(hits, {
                    title: row.title,
                    url: row.url,
                    snippet: row.description || '',
                    source: 'Brave',
                })
            }
        }
        return { hits, retryable: false }
    } catch {
        return { hits: [], retryable: true }
    }
}

async function searchWikipedia(query: string): Promise<SearchResultItem[]> {
    const title = query.trim().replace(/\s+/g, '_')
    if (!title) return []
    const hits: SearchResultItem[] = []
    for (const lang of ['tr', 'en']) {
        try {
            const wikiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
            const wikiRes = await fetch(wikiUrl, {
                headers: { 'User-Agent': 'WorldInMakingOS/1.0' },
                signal: AbortSignal.timeout(3000),
            })
            if (!wikiRes.ok) continue
            const wikiData = (await wikiRes.json()) as {
                title?: string
                extract?: string
                content_urls?: { desktop?: { page?: string } }
            }
            if (wikiData.extract && wikiData.content_urls?.desktop?.page) {
                pushUnique(hits, {
                    title: wikiData.title || query,
                    url: wikiData.content_urls.desktop.page,
                    snippet: wikiData.extract,
                    source: 'Wikipedia',
                })
                break
            }
        } catch {
            /* next language */
        }
    }
    return hits
}

async function searchDuckDuckGoInstant(query: string): Promise<SearchResultItem[]> {
    const hits: SearchResultItem[] = []
    const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    const res = await fetch(ddgApiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return hits
    const data = (await res.json()) as {
        AbstractText?: string
        AbstractURL?: string
        Heading?: string
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>
    }
    if (data.AbstractText && data.AbstractURL) {
        pushUnique(hits, {
            title: data.Heading || query,
            url: data.AbstractURL,
            snippet: data.AbstractText,
            source: 'DuckDuckGo API',
        })
    }
    if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
            if (hits.length >= 4) break
            if (topic.Text && topic.FirstURL) {
                pushUnique(hits, {
                    title: topic.Text.split(' - ')[0] || 'DuckDuckGo Result',
                    url: topic.FirstURL,
                    snippet: topic.Text,
                    source: 'DuckDuckGo API',
                })
            }
        }
    }
    return hits
}

async function searchDuckDuckGoLite(query: string): Promise<SearchResultItem[]> {
    const hits: SearchResultItem[] = []
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: new URLSearchParams({ q: query }),
        signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return hits
    const html = (await res.text()).slice(0, 500_000)
    const rows = html.split('<a rel="nofollow" href="').slice(1)
    for (const row of rows) {
        if (hits.length >= 5) break
        const urlMatch = row.match(/^([^"]+)" class='result-link'>([^<]+)<\/a>/)
        const snippetMatch = row.split("<td class='result-snippet'>")[1]?.split('</td>')[0]
        if (!urlMatch || !snippetMatch) continue
        let finalUrl = urlMatch[1]
        if (finalUrl.startsWith('//duckduckgo.com/l/?uddg=')) {
            finalUrl = decodeURIComponent(finalUrl.split('uddg=')[1].split('&')[0])
        } else if (!finalUrl.startsWith('http')) {
            finalUrl = 'https:' + finalUrl
        }
        const title = decodeHtml(urlMatch[2].trim())
        const snippet = decodeHtml(snippetMatch.trim())
        if (title && snippet && snippet.length > 15) {
            pushUnique(hits, {
                title,
                url: finalUrl,
                snippet,
                source: 'DuckDuckGo Web',
            })
        }
    }
    return hits
}

/**
 * Multi-tier web search. Returns structured hits for citations + LLM context.
 */
export async function searchWebSources(query: string): Promise<SearchResultItem[]> {
    const cleanQuery = query.trim()
    if (!cleanQuery) return []

    const env = getRuntimeEnv()
    const tavilyKeys = collectApiKeys(env.TAVILY_API_KEYS, env.TAVILY_API_KEY, env.TAVILY_KEY)
    const braveKeys = collectApiKeys(env.BRAVE_SEARCH_API_KEYS, env.BRAVE_SEARCH_API_KEY, env.BRAVE_API_KEY)
    const results: SearchResultItem[] = []

    if (tavilyKeys.length > 0) {
        const rotated = rotateKeys(tavilyKeys, tavilyCursor++)
        for (const hit of await searchWithKeyFailover(rotated, (apiKey) => searchTavily(cleanQuery, apiKey))) {
            pushUnique(results, hit)
        }
    }

    if (results.length < 4 && braveKeys.length > 0) {
        const rotated = rotateKeys(braveKeys, braveCursor++)
        for (const hit of await searchWithKeyFailover(rotated, (apiKey) => searchBrave(cleanQuery, apiKey))) {
            pushUnique(results, hit)
        }
    }

    if (results.length >= 4) return results.slice(0, 6)

    if (results.length < 3 && looksLikeEntityQuery(cleanQuery)) {
        try {
            for (const hit of await searchWikipedia(cleanQuery)) pushUnique(results, hit)
        } catch {
            /* next provider */
        }
    }

    if (results.length < 4) {
        try {
            for (const hit of await searchDuckDuckGoInstant(cleanQuery)) pushUnique(results, hit)
        } catch {
            /* next provider */
        }
    }

    if (results.length < 3) {
        try {
            for (const hit of await searchDuckDuckGoLite(cleanQuery)) pushUnique(results, hit)
        } catch {
            /* final fallback */
        }
    }

    return results.slice(0, 6)
}

/**
 * Executes a multi-tier web search and returns formatted markdown citations with real URLs.
 */
export async function searchDuckDuckGo(query: string): Promise<string> {
    return formatSearchResults(await searchWebSources(query))
}
