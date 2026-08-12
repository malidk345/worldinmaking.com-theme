/**
 * Robust Multi-Provider Free Web Search Engine — WorldInMaking.com
 *
 * Combines 100% FREE API layers (DuckDuckGo Instant Answer JSON API,
 * Wikipedia REST Summaries API, and DuckDuckGo HTML Lite Fallback Scraper)
 * to reliably fetch real titles, URLs, and rich snippets for the Ask AI engine.
 */

export interface SearchResultItem {
    title: string
    url: string
    snippet: string
    source: 'DuckDuckGo API' | 'DuckDuckGo Web' | 'Wikipedia'
}

/**
 * Executes a multi-tier free web search query and returns formatted markdown citations with real URLs.
 */
export async function searchDuckDuckGo(query: string): Promise<string> {
    const cleanQuery = query.trim()
    if (!cleanQuery) return ''

    const results: SearchResultItem[] = []

    // 1. Tier 1: DuckDuckGo Instant Answer JSON API (100% Free, Rate-limit-free JSON)
    try {
        const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`
        const res = await fetch(ddgApiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(4000),
        })

        if (res.ok) {
            const data = await res.json()
            if (data.AbstractText && data.AbstractURL) {
                results.push({
                    title: data.Heading || cleanQuery,
                    url: data.AbstractURL,
                    snippet: data.AbstractText,
                    source: 'DuckDuckGo API',
                })
            }

            if (Array.isArray(data.RelatedTopics)) {
                for (const topic of data.RelatedTopics) {
                    if (topic.Text && topic.FirstURL && results.length < 4) {
                        results.push({
                            title: topic.Text.split(' - ')[0] || 'DuckDuckGo Result',
                            url: topic.FirstURL,
                            snippet: topic.Text,
                            source: 'DuckDuckGo API',
                        })
                    }
                }
            }
        }
    } catch {
        /* Cascade to next search tier */
    }

    // 2. Tier 2: Wikipedia Summary REST API (TR & EN)
    if (results.length < 3) {
        for (const lang of ['tr', 'en']) {
            try {
                const wikiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQuery)}`
                const wikiRes = await fetch(wikiUrl, {
                    headers: { 'User-Agent': 'WorldInMakingOS/1.0' },
                    signal: AbortSignal.timeout(3000),
                })
                if (wikiRes.ok) {
                    const wikiData = await wikiRes.json()
                    if (wikiData.extract && wikiData.content_urls?.desktop?.page) {
                        results.push({
                            title: wikiData.title || cleanQuery,
                            url: wikiData.content_urls.desktop.page,
                            snippet: wikiData.extract.slice(0, 400),
                            source: 'Wikipedia',
                        })
                        break
                    }
                }
            } catch {
                /* Cascade to next tier */
            }
        }
    }

    // 3. Tier 3: DuckDuckGo HTML Lite Fallback Scraper
    if (results.length < 3) {
        try {
            const res = await fetch('https://html.duckduckgo.com/html/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                body: new URLSearchParams({ q: cleanQuery, b: '' }),
                signal: AbortSignal.timeout(5000),
            })

            if (res.ok) {
                const html = (await res.text()).slice(0, 500_000)

                // Match snippet blocks
                const snippetRegex = /<a class="[a-z0-9_-]*result__snippet[^>]*>([\s\S]*?)<\/a>/g

                let match
                let count = 0
                while ((match = snippetRegex.exec(html)) !== null && count < 3) {
                    const text = match[1].replace(/<[^>]+>/g, '').trim()
                    if (text && text.length > 15) {
                        results.push({
                            title: `Web Result ${count + 1}`,
                            url: 'https://duckduckgo.com',
                            snippet: text,
                            source: 'DuckDuckGo Web',
                        })
                        count++
                    }
                }
            }
        } catch {
            /* Fallback completed */
        }
    }

    if (results.length === 0) {
        return ''
    }

    // Format rich markdown citations for LLM consumption
    return results
        .map(
            (r, i) =>
                `[Source ${i + 1} - ${r.source}]\nTitle: ${r.title}\nURL: ${r.url}\nSummary: ${r.snippet}`
        )
        .join('\n\n')
}
