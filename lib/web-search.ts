import fetch from 'node-fetch';

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

function decodeDdgUrl(url: string): string {
    try {
        const match = url.match(/uddg=([^&]+)/);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
    } catch {}
    return url;
}

function cleanHtml(text: string): string {
    return text
        .replace(/<[^>]*>/g, '') // remove tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Searches DuckDuckGo's keyless HTML interface for a given query and returns top results.
 */
export async function searchWeb(query: string, limit: number = 4): Promise<SearchResult[]> {
    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            console.error(`DuckDuckGo search failed with status: ${response.status}`);
            return [];
        }

        const html = await response.text();
        const results: SearchResult[] = [];
        const blocks = html.split('<h2 class="result__title">');
        
        for (let i = 1; i < blocks.length; i++) {
            const block = blocks[i];
            
            // Extract title and URL from result__a
            const aMatch = block.match(/<a\s+[^>]*?class="result__a"[^>]*?href="([^"]+?)"[^>]*?>([\s\S]*?)<\/a>/);
            // Extract snippet
            const snippetMatch = block.match(/<a\s+[^>]*?class="result__snippet"[^>]*?>([\s\S]*?)<\/a>/);
            
            if (aMatch && snippetMatch) {
                const rawUrl = aMatch[1];
                const title = cleanHtml(aMatch[2]);
                const snippet = cleanHtml(snippetMatch[1]);
                const targetUrl = decodeDdgUrl(rawUrl);
                
                results.push({ title, url: targetUrl, snippet });
            }
            
            if (results.length >= limit) {
                break;
            }
        }
        
        return results;
    } catch (error) {
        console.error('Error during web search:', error);
        return [];
    }
}
