export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ResearchSource {
    title: string;
    url: string;
    excerpt: string;
    source: string;
    publishedAt?: string;
}

// ─── RSS Feeds ───────────────────────────────────────────────────────────────
const RSS_FEEDS = [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World' },
    { url: 'https://www.theguardian.com/world/rss', name: 'The Guardian' },
    { url: 'https://hnrss.org/best', name: 'Hacker News' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NY Times' },
    { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters' },
];

// ─── Parse RSS XML ────────────────────────────────────────────────────────────
function parseRssItems(xml: string, sourceName: string): ResearchSource[] {
    const items: ResearchSource[] = [];
    const itemMatches = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || [];

    for (const item of itemMatches.slice(0, 10)) {
        const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const linkMatch = item.match(/<link[^>]*>([^<]+)<\/link>/i) ||
            item.match(/<guid[^>]*isPermaLink="true"[^>]*>([^<]+)<\/guid>/i);
        const descMatch = item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
        const dateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

        if (!titleMatch || !linkMatch) continue;

        const title = titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
        const url = linkMatch[1].trim();
        const rawDesc = descMatch ? descMatch[1] : '';
        const excerpt = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim().slice(0, 400);

        items.push({
            title,
            url,
            excerpt: excerpt || title,
            source: sourceName,
            publishedAt: dateMatch ? dateMatch[1].trim() : undefined,
        });
    }
    return items;
}

function cleanHtml(text: string): string {
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchDuckDuckGo(query: string): Promise<ResearchSource[]> {
    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return [];
        const html = await res.text();

        const results: ResearchSource[] = [];
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
                const excerpt = cleanHtml(snippetMatch[1]).slice(0, 400);
                
                let resultUrl = rawUrl;
                if (resultUrl.startsWith('//')) resultUrl = 'https:' + resultUrl;
                if (resultUrl.includes('uddg=')) {
                    const uMatch = resultUrl.match(/uddg=([^&]+)/);
                    if (uMatch) resultUrl = decodeURIComponent(uMatch[1]);
                }
                
                results.push({
                    title,
                    url: resultUrl,
                    excerpt,
                    source: 'Web Search',
                });
            }
        }
        return results.slice(0, 5);
    } catch (e) {
        console.error('[DDG Search Error]', e);
        return [];
    }
}

// ─── Keyword scoring ──────────────────────────────────────────────────────────
function scoreRelevance(item: ResearchSource, keywords: string[]): number {
    const text = `${item.title} ${item.excerpt}`.toLowerCase();
    return keywords.reduce((score, kw) => {
        const kl = kw.toLowerCase();
        if (item.title.toLowerCase().includes(kl)) return score + 3;
        if (text.includes(kl)) return score + 1;
        return score;
    }, 0);
}

// ─── Wikipedia summary ────────────────────────────────────────────────────────
async function fetchWikipedia(topic: string): Promise<ResearchSource | null> {
    try {
        const slug = topic.replace(/\s+/g, '_');
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'WorldInMaking/1.0 (contact@worldinmaking.com)' },
            signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
        if (!data.extract) return null;
        return {
            title: data.title || topic,
            url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`,
            excerpt: data.extract.slice(0, 600),
            source: 'Wikipedia',
        };
    } catch {
        return null;
    }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const { topic } = await request.json() as { topic?: string };
        if (!topic || !topic.trim()) {
            return NextResponse.json({ error: 'topic is required' }, { status: 400 });
        }

        const keywords = topic.trim().toLowerCase().split(/\s+/).filter(w => w.length > 2);

        // Fetch parallel: DDG + Wikipedia + RSS
        const [ddgResults, wikiSource, ...rssResults] = await Promise.allSettled([
            fetchDuckDuckGo(topic),
            fetchWikipedia(topic),
            ...RSS_FEEDS.map(async feed => {
                const res = await fetch(feed.url, {
                    headers: { 'User-Agent': 'WorldInMaking/1.0' },
                    signal: AbortSignal.timeout(7000),
                });
                if (!res.ok) return [];
                const xml = await res.text();
                return parseRssItems(xml, feed.name);
            })
        ]);

        const allItems: ResearchSource[] = [];

        // Collect DDG
        if (ddgResults.status === 'fulfilled') {
            allItems.push(...ddgResults.value);
        }

        // Collect RSS
        for (const r of rssResults) {
            if (r.status === 'fulfilled') {
                allItems.push(...(r.value as ResearchSource[]));
            }
        }

        // Score and sort by relevance
        const scored = allItems
            .map(item => ({ item, score: scoreRelevance(item, keywords) }))
            .sort((a, b) => b.score - a.score)
            .filter(({ score }) => score > 0)
            .slice(0, 6)
            .map(({ item }) => item);

        // Prepend Wikipedia if available
        if (wikiSource.status === 'fulfilled' && wikiSource.value) {
            scored.unshift(wikiSource.value);
        }

        // Fallback: if we still have few items, add unsorted ones
        if (scored.length < 3) {
            const fallback = allItems.slice(0, 6 - scored.length);
            for (const f of fallback) {
                if (!scored.find(s => s.url === f.url)) scored.push(f);
            }
        }

        return NextResponse.json({ sources: scored.slice(0, 6) });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
