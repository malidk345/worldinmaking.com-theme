/**
 * Notebook RAG (Retrieval-Augmented Generation) Helper — WorldInMaking
 *
 * Edge-compatible semantic chunking and relevance search module over user notebooks.
 * Allows Ask AI Chat to pull relevant excerpts across the user's workspace into the chat context.
 */

export interface NotebookChunk {
    notebookId: string
    title: string
    heading?: string
    text: string
    score?: number
}

/**
 * Splits a markdown document into logical chunks based on headings and paragraphs.
 */
export function chunkNotebookContent(
    notebookId: string,
    title: string,
    content: string,
    maxChunkChars = 800
): NotebookChunk[] {
    const raw = String(content || '').trim()
    if (!raw) return []

    const chunks: NotebookChunk[] = []
    const lines = raw.split('\n')

    let currentHeading = ''
    let currentBuffer: string[] = []

    const flushBuffer = () => {
        const text = currentBuffer.join('\n').trim()
        if (text.length > 20) {
            if (text.length > maxChunkChars) {
                // Slicing very long paragraphs into maxChunkChars bounds
                let pos = 0
                while (pos < text.length) {
                    const slice = text.slice(pos, pos + maxChunkChars).trim()
                    if (slice.length > 20) {
                        chunks.push({
                            notebookId,
                            title,
                            heading: currentHeading || undefined,
                            text: slice,
                        })
                    }
                    pos += maxChunkChars - 100
                }
            } else {
                chunks.push({
                    notebookId,
                    title,
                    heading: currentHeading || undefined,
                    text,
                })
            }
        }
        currentBuffer = []
    }

    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
        if (headingMatch) {
            flushBuffer()
            currentHeading = headingMatch[2].trim()
            continue
        }
        if (!line.trim() && currentBuffer.join('\n').length > 400) {
            flushBuffer()
            continue
        }
        currentBuffer.push(line)
    }

    flushBuffer()
    return chunks
}

/**
 * Tokenizes text into normalized lower-case search terms (ignoring common stop words).
 */
function extractSearchTerms(query: string): string[] {
    const stopWords = new Set([
        'and', 'the', 'is', 'in', 'at', 'of', 'for', 'to', 'a', 'an', 've', 'bir', 'bu', 'da', 'de', 'ile', 'ne', 'için', 'icin'
    ])
    return String(query || '')
        .toLowerCase()
        .replace(/[^a-z0-9\u00c0-\u024f\u0400-\u04ff\u0600-\u06ff\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !stopWords.has(w))
}

/**
 * Searches across all notebooks in the workspace and returns the top relevant RAG chunks.
 */
export function searchNotebookWorkspace(
    query: string,
    notebooks: Array<{ id: string; title: string; content: string }>,
    maxResults = 4
): NotebookChunk[] {
    const terms = extractSearchTerms(query)
    if (!terms.length || !notebooks.length) return []

    const allChunks: NotebookChunk[] = []

    for (const nb of notebooks) {
        const chunks = chunkNotebookContent(nb.id, nb.title || 'Untitled', nb.content)
        for (const chunk of chunks) {
            let score = 0
            const lowerText = chunk.text.toLowerCase()
            const lowerTitle = chunk.title.toLowerCase()
            const lowerHeading = (chunk.heading || '').toLowerCase()

            for (const term of terms) {
                if (lowerTitle.includes(term)) score += 5
                if (lowerHeading.includes(term)) score += 4
                // Count occurrences in chunk body
                let pos = lowerText.indexOf(term)
                while (pos !== -1) {
                    score += 2
                    pos = lowerText.indexOf(term, pos + term.length)
                }
            }

            if (score > 0) {
                allChunks.push({ ...chunk, score })
            }
        }
    }

    // Sort by relevance score descending
    allChunks.sort((a, b) => (b.score || 0) - (a.score || 0))

    // Deduplicate near-identical chunks
    const result: NotebookChunk[] = []
    const seen = new Set<string>()

    for (const chunk of allChunks) {
        const key = `${chunk.notebookId}:${chunk.text.slice(0, 40)}`
        if (!seen.has(key)) {
            seen.add(key)
            result.push(chunk)
            if (result.length >= maxResults) break
        }
    }

    return result
}

/**
 * Formats RAG search results into a clean prompt context block for Ask AI Chat.
 */
export function buildNotebookRAGContext(
    query: string,
    notebooks: Array<{ id: string; title: string; content: string }>
): string {
    const hits = searchNotebookWorkspace(query, notebooks, 4)
    if (!hits.length) return ''

    const lines: string[] = ['Related Notebook Workspace Context (RAG):']
    for (const hit of hits) {
        lines.push(`--- Notebook: "${hit.title}"${hit.heading ? ` > ${hit.heading}` : ''} ---`)
        lines.push(`"""\n${hit.text}\n"""`)
    }

    return lines.join('\n\n')
}
