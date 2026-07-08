export interface FeedItem {
    title: string;
    link: string;
    guid: string;
}

export function parseFeed(xml: string): FeedItem[] {
    const items: FeedItem[] = [];
    
    // Check if it's Atom
    const isAtom = xml.includes('<entry>');
    
    if (isAtom) {
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;
        while ((match = entryRegex.exec(xml)) !== null) {
            const entryContent = match[1];
            const titleMatch = entryContent.match(/<title[^>]*>([\s\S]*?)<\/title>/);
            const linkMatch = entryContent.match(/<link[^>]*href=["']([^"']+)["']/);
            const idMatch = entryContent.match(/<id[^>]*>([\s\S]*?)<\/id>/);
            
            const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
            const link = linkMatch ? linkMatch[1].trim() : '';
            const guid = idMatch ? idMatch[1].trim() : link;
            
            if (title && link) {
                items.push({ title, link, guid });
            }
        }
    } else {
        // RSS
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null) {
            const itemContent = match[1];
            const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/);
            const linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/);
            const guidMatch = itemContent.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
            
            const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
            const link = linkMatch ? linkMatch[1].trim() : '';
            const guid = guidMatch ? guidMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : link;
            
            if (title && link) {
                items.push({ title, link, guid });
            }
        }
    }
    
    return items;
}

export async function fetchAndParseFeed(url: string): Promise<FeedItem[]> {
    try {
        console.log(`[FeedParser] Fetching feed from URL: ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; WorldInMakingBot/1.0)'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        
        const xmlText = await response.text();
        return parseFeed(xmlText);
    } catch (e) {
        console.error(`[FeedParser] Failed to fetch or parse feed from ${url}:`, e);
        return [];
    }
}
