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

    // 3. Tier 3: DuckDuckGo Lite Fallback Scraper (lite.duckduckgo.com)
    if (results.length < 3) {
        try {
            const res = await fetch('https://lite.duckduckgo.com/lite/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                body: new URLSearchParams({ q: cleanQuery }),
                signal: AbortSignal.timeout(5000),
            })

            if (res.ok) {
                const html = (await res.text()).slice(0, 500_000)

                const decodeHtml = (str: string) => {
                    return str.replace(/&#x27;/g, "'")
                              .replace(/&amp;/g, '&')
                              .replace(/&quot;/g, '"')
                              .replace(/&lt;/g, '<')
                              .replace(/&gt;/g, '>')
                              .replace(/<[^>]+>/g, '');
                }

                const rows = html.split('<a rel="nofollow" href="').slice(1);
                
                let count = 0;
                for (const row of rows) {
                    if (count >= 5) break;
                    
                    const urlMatch = row.match(/^([^"]+)" class='result-link'>([^<]+)<\/a>/);
                    const snippetMatch = row.split("<td class='result-snippet'>")[1]?.split("</td>")[0];
                    
                    if (urlMatch && snippetMatch) {
                        let finalUrl = urlMatch[1];
                        if (finalUrl.startsWith('//duckduckgo.com/l/?uddg=')) {
                            finalUrl = decodeURIComponent(finalUrl.split('uddg=')[1].split('&')[0]);
                        } else if (!finalUrl.startsWith('http')) {
                            finalUrl = 'https:' + finalUrl;
                        }

                        const title = decodeHtml(urlMatch[2].trim());
                        const snippet = decodeHtml(snippetMatch.trim());
                        
                        if (title && snippet && snippet.length > 15) {
                            results.push({
                                title,
                                url: finalUrl,
                                snippet,
                                source: 'DuckDuckGo Web',
                            });
                            count++;
                        }
                    }
                }
            }
        } catch {
            /* Final fallback reached */
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
