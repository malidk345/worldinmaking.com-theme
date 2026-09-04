/**
 * Lexical notebook & document retrieval — WorldInMaking
 *
 * Honest mechanism: heading/paragraph chunking + keyword/substring term scoring.
 * This is NOT embedding / vector-database RAG and NOT BM25 (no IDF corpus stats).
 * Callers and prompts must describe it as lexical search, not "semantic RAG".
 */

import type { AiCitation } from '../ai/contracts'
export interface RAGDocument {
    id: string
    filename: string
    sections: Array<{ heading?: string; content: string }>
}

export interface RAGChunk {
    documentId: string
    title: string
    heading?: string
    text: string
    score?: number
    sourceType: 'notebook' | 'document' | 'upload'
    url?: string
}

export interface RAGSearchResult {
    contextText: string
    citations: AiCitation[]
    chunks: RAGChunk[]
}

/**
 * Splits markdown/plain text into chunks on headings and paragraph bounds.
 */
export function chunkDocumentContent(
    documentId: string,
    title: string,
    content: string,
    sourceType: 'notebook' | 'document' | 'upload' = 'notebook',
    maxChunkChars = 800
): RAGChunk[] {
    const raw = String(content || '').trim()
    if (!raw) return []

    const chunks: RAGChunk[] = []
    const lines = raw.split('\n')

    let currentHeading = ''
    let currentBuffer: string[] = []

    const flushBuffer = () => {
        const text = currentBuffer.join('\n').trim()
        if (text.length > 20) {
            if (text.length > maxChunkChars) {
                let pos = 0
                while (pos < text.length) {
                    const slice = text.slice(pos, pos + maxChunkChars).trim()
                    if (slice.length > 20) {
                        chunks.push({
                            documentId,
                            title,
                            heading: currentHeading || undefined,
                            text: slice,
                            sourceType,
                        })
                    }
                    pos += maxChunkChars - 120 // overlap for continuity across chunk boundaries
                }
            } else {
                chunks.push({
                    documentId,
                    title,
                    heading: currentHeading || undefined,
                    text,
                    sourceType,
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
 * Legacy compatibility alias for notebook chunking.
 */
export const chunkNotebookContent = chunkDocumentContent

/**
 * Tokenizes text into normalized lower-case search terms (ignoring common stop words).
 */
export function extractSearchTerms(query: string): string[] {
    const stopWords = new Set([
        'and', 'the', 'is', 'in', 'at', 'of', 'for', 'to', 'a', 'an', 've', 'bir', 'bu', 'da', 'de', 'ile', 'ne', 'için', 'icin', 'hakkında', 'nedir', 'nelerdir', 'what', 'how', 'why'
    ])
    return String(query || '')
        .toLowerCase()
        .replace(/[^a-z0-9\u00c0-\u024f\u0400-\u04ff\u0600-\u06ff\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !stopWords.has(w))
}

/**
 * Lexical search across notebooks and uploaded documents (term frequency + heading boost).
 * Returns empty context/citations when nothing matches — callers must not invent sources.
 */
export function searchKnowledgeWorkspace(
    query: string,
    sources: {
        notebooks?: Array<{ id: string; title: string; content: string }>
        documents?: RAGDocument[]
    },
    maxResults = 5
): RAGSearchResult {
    const terms = extractSearchTerms(query)
    const allChunks: RAGChunk[] = []

    // 1. Process notebooks
    if (sources.notebooks?.length) {
        for (const nb of sources.notebooks) {
            const chunks = chunkDocumentContent(nb.id, nb.title || 'Notebook', nb.content, 'notebook')
            allChunks.push(...chunks)
        }
    }

    // 2. Process uploaded parsed documents
    if (sources.documents?.length) {
        for (const doc of sources.documents) {
            for (const sec of doc.sections) {
                const chunks = chunkDocumentContent(doc.id, doc.filename, sec.content, 'document')
                for (const c of chunks) {
                    if (!c.heading && sec.heading) c.heading = sec.heading
                    allChunks.push(c)
                }
            }
        }
    }

    if (!terms.length || !allChunks.length) {
        return { contextText: '', citations: [], chunks: [] }
    }

    // 3. Score chunks (keyword / substring counts — not embeddings)
    for (const chunk of allChunks) {
        let score = 0
        const lowerText = chunk.text.toLowerCase()
        const lowerTitle = chunk.title.toLowerCase()
        const lowerHeading = (chunk.heading || '').toLowerCase()

        for (const term of terms) {
            if (lowerTitle.includes(term)) score += 6
            if (lowerHeading.includes(term)) score += 5
            
            let pos = lowerText.indexOf(term)
            let occurrences = 0
            while (pos !== -1 && occurrences < 10) {
                occurrences++
                score += 2
                pos = lowerText.indexOf(term, pos + term.length)
            }
        }

        chunk.score = score
    }

    // 4. Sort and deduplicate top results
    const ranked = allChunks.filter(c => (c.score || 0) > 0).sort((a, b) => (b.score || 0) - (a.score || 0))
    const topChunks: RAGChunk[] = []
    const seen = new Set<string>()

    for (const chunk of ranked) {
        const key = `${chunk.documentId}:${chunk.text.slice(0, 50)}`
        if (!seen.has(key)) {
            seen.add(key)
            topChunks.push(chunk)
            if (topChunks.length >= maxResults) break
        }
    }

    if (!topChunks.length) {
        return { contextText: '', citations: [], chunks: [] }
    }

    // 5. Generate formatted context & citations (label mechanism honestly)
    const citations: AiCitation[] = topChunks.map((chunk, idx) => ({
        id: idx + 1,
        title: chunk.heading ? `${chunk.title} › ${chunk.heading}` : chunk.title,
        url: chunk.sourceType === 'notebook' ? `/notebooks#${chunk.documentId}` : `#doc-${chunk.documentId}`,
        snippet: chunk.text.length > 200 ? `${chunk.text.slice(0, 197)}...` : chunk.text,
        source: chunk.sourceType === 'notebook' ? 'Workspace Notebook' : 'Uploaded Research Document',
    }))

    const contextLines: string[] = [
        '### Lexical notebook/document matches (keyword score — not embedding/vector RAG):',
        'Cite only the numbered sources below. If they do not answer the query, say so — do not invent citations.',
    ]
    topChunks.forEach((chunk, idx) => {
        const citationId = idx + 1
        const header = `[Source ${citationId}] "${chunk.title}"${chunk.heading ? ` > ${chunk.heading}` : ''} (${chunk.sourceType}):`
        contextLines.push(`${header}\n"""\n${chunk.text}\n"""`)
    })

    return {
        contextText: contextLines.join('\n\n'),
        citations,
        chunks: topChunks,
    }
}

/**
 * Backward-compatible helper for legacy notebook workspace search.
 */
export function searchNotebookWorkspace(
    query: string,
    notebooks: Array<{ id: string; title: string; content: string }>,
    maxResults = 4
) {
    const result = searchKnowledgeWorkspace(query, { notebooks }, maxResults)
    return result.chunks.map(c => ({
        notebookId: c.documentId,
        title: c.title,
        heading: c.heading,
        text: c.text,
        score: c.score,
    }))
}

/**
 * Build prompt context from lexical notebook matches.
 * Fail closed: when nothing matches, return an explicit not-found note (empty → models invent citations).
 */
export function buildNotebookRAGContext(
    query: string,
    notebooks: Array<{ id: string; title: string; content: string }>
): string {
    const res = searchKnowledgeWorkspace(query, { notebooks }, 4)
    if (!res.chunks.length) {
        return '### Notebook lexical search\nNo matching passages found in the notebook (keyword/substring search — not embedding RAG). Do not invent notebook citations.'
    }
    return res.contextText
}
