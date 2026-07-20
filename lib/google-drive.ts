import { searchWeb } from './web-search';

export interface DriveDocument {
    id: string;
    name: string;
    content: string;
    mimeType?: string;
}

/**
 * Fetches research documents from a Google Drive folder.
 * Uses GOOGLE_DRIVE_FOLDER_ID and GOOGLE_DRIVE_API_KEY from environment variables.
 */
export async function fetchDriveDocuments(): Promise<DriveDocument[]> {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

    if (!folderId) {
        return [];
    }

    try {
        // Query files inside the specified Google Drive folder
        const url = apiKey
            ? `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed%3Dfalse&fields=files(id,name,mimeType,description)&key=${apiKey}`
            : `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed%3Dfalse&fields=files(id,name,mimeType,description)`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'WorldInMakingBot/1.0 (contact@worldinmaking.com)'
            }
        });

        if (!res.ok) {
            console.log('[Google Drive] Drive API call returned status:', res.status);
            return [];
        }

        const data = await res.json() as {
            files?: Array<{
                id: string;
                name: string;
                mimeType: string;
                description?: string;
            }>;
        };

        const files = data.files || [];
        const docs: DriveDocument[] = [];

        for (const file of files.slice(0, 5)) {
            let textContent = file.description || '';

            if (apiKey) {
                try {
                    let contentRes;
                    if (file.mimeType === 'application/vnd.google-apps.document') {
                        // Export Google Docs to plain text
                        contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain&key=${apiKey}`);
                    } else if (file.mimeType.includes('text') || file.mimeType.includes('markdown') || file.mimeType.includes('json')) {
                        // Download plain text files
                        contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`);
                    }

                    if (contentRes && contentRes.ok) {
                        const fetchedText = await contentRes.text();
                        if (fetchedText) textContent = fetchedText.slice(0, 3000); // 3000 chars for richer context
                    }
                } catch {
                    // Ignore individual file fetch error
                }
            }

            docs.push({
                id: file.id,
                name: file.name,
                content: textContent || `Document title: ${file.name}`,
                mimeType: file.mimeType
            });
        }

        return docs;
    } catch (err) {
        console.error('[Google Drive] Error fetching documents:', err);
        return [];
    }
}

/**
 * Combines Google Drive Knowledge Base with Live Web Search
 * to produce a rich, grounded hybrid research context for AI bots.
 */
export async function getHybridResearchContext(query: string = 'contemporary philosophy ethics digital society culture'): Promise<{
    driveNotes: string;
    webResults: string;
    combinedContext: string;
}> {
    // 1. Fetch Drive documents
    const driveDocs = await fetchDriveDocuments();
    let driveNotes = '';
    if (driveDocs.length > 0) {
        driveNotes = driveDocs.map((doc, i) =>
            `[Drive Doc ${i + 1}: ${doc.name}]\n${doc.content.slice(0, 800)}`
        ).join('\n\n');
    } else {
        driveNotes = '(No Google Drive documents configured yet or folder is empty. Using direct web research.)';
    }

    // 2. Perform live web search for recent empirical data & developments
    let webResults = '';
    try {
        const rawWeb = await searchWeb(query);
        if (typeof rawWeb === 'string') {
            webResults = rawWeb;
        } else if (Array.isArray(rawWeb)) {
            webResults = rawWeb.map((item: { title?: string; snippet?: string; url?: string }, idx: number) =>
                `[Web Source ${idx + 1}] ${item.title || 'Article'} - ${item.url || ''}\nSummary: ${item.snippet || ''}`
            ).join('\n\n');
        }
    } catch (err) {
        console.error('[Hybrid Research] Web search error:', err);
        webResults = '(Web search temporarily unavailable.)';
    }

    const combinedContext = `=== GOOGLE DRIVE KNOWLEDGE BASE (PRIMARY INSPIRATION) ===\n${driveNotes}\n\n=== LIVE WEB & EMPIRICAL RESEARCH (SUPPLEMENTARY EVIDENCE) ===\n${webResults}`;

    return {
        driveNotes,
        webResults,
        combinedContext
    };
}
