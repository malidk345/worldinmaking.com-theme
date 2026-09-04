/**
 * Lexical notebook/post search — worldinmaking (wim)
 *
 * Honest mechanism: bag-of-words term frequency + cosine similarity on tokens,
 * plus substring/keyword boosts. This is NOT embedding / vector-database RAG,
 * NOT TF-IDF, and NOT learned semantic similarity.
 */

export interface SemanticDocument {
    id: string
    title: string
    content: string
    type?: 'notebook' | 'post' | 'thought'
    slug?: string
    updatedAt?: string
}

export interface SemanticSearchHit {
    objectID: string
    title: string
    excerpt: string
    type: 'notebook' | 'post' | 'thought'
    slug: string
    score: number
    fields: { slug: string; type?: string }
}

/** Prefer this name in new code; same shape as SemanticDocument (legacy name). */
export type LexicalDocument = SemanticDocument
/** Prefer this name in new code; same shape as SemanticSearchHit (legacy name). */
export type LexicalSearchHit = SemanticSearchHit

const STOP_WORDS = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'for', 'to', 'of', 'with',
    'bir', 've', 'veya', 'bu', 'şu', 'o', 'için', 'ile', 'de', 'da', 'mi', 'mu', 'ise', 'gibi',
    'ne', 'kadar', 'daha', 'çok', 'en', 'olarak', 'olan', 'göre', 'ancak', 'ama', 'fakat',
])

/**
 * Tokenizes text into normalized lexical terms (words only; no embeddings).
 */
export function tokenizeText(text: string): string[] {
    if (!text) return []
    const clean = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .trim()

    const words = clean.split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    return words
}

/**
 * Computes raw term-frequency counts for a token stream.
 */
export function computeTermFrequency(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>()
    for (const token of tokens) {
        tf.set(token, (tf.get(token) || 0) + 1)
    }
    return tf
}

/**
 * Cosine similarity between two term-frequency maps (lexical, not embedding vectors).
 */
export function cosineSimilarity(
    vecA: Map<string, number>,
    vecB: Map<string, number>
): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (const [term, countA] of vecA.entries()) {
        normA += countA * countA
        const countB = vecB.get(term)
        if (countB) {
            dotProduct += countA * countB
        }
    }

    for (const countB of vecB.values()) {
        normB += countB * countB
    }

    if (normA === 0 || normB === 0) return 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Extracts a paragraph excerpt that contains query terms (substring match).
 */
export function extractRelevantExcerpt(content: string, queryTokens: string[], maxLen = 180): string {
    if (!content) return ''
    const paragraphs = content.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean)

    if (paragraphs.length === 0) {
        return content.slice(0, maxLen).trim()
    }

    let bestParagraph = paragraphs[0]
    let maxMatchCount = 0

    for (const p of paragraphs) {
        const pLower = p.toLowerCase()
        let matchCount = 0
        for (const token of queryTokens) {
            if (pLower.includes(token)) matchCount++
        }
        if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount
            bestParagraph = p
        }
    }

    if (bestParagraph.length <= maxLen) return bestParagraph
    return `${bestParagraph.slice(0, maxLen).trim()}…`
}

/**
 * Lexical search across documents: TF cosine + keyword/substring boosts.
 * Prefer this name in new code. No embedding model or vector index is used.
 */
export function searchLexicalDocuments(
    query: string,
    documents: SemanticDocument[],
    limit = 20
): SemanticSearchHit[] {
    const q = query.trim()
    if (!q || !documents || documents.length === 0) return []

    const queryTokens = tokenizeText(q)
    if (queryTokens.length === 0) return []

    const queryVec = computeTermFrequency(queryTokens)
    const qLower = q.toLowerCase()

    const scoredHits: SemanticSearchHit[] = []

    for (const doc of documents) {
        const titleTokens = tokenizeText(doc.title)
        const bodyTokens = tokenizeText(doc.content)
        const combinedTokens = [...titleTokens, ...titleTokens, ...bodyTokens] // Double weight on title

        const docVec = computeTermFrequency(combinedTokens)
        let sim = cosineSimilarity(queryVec, docVec)

        const titleLower = (doc.title || '').toLowerCase()
        const contentLower = (doc.content || '').toLowerCase()

        // Exact substring boost
        if (titleLower.includes(qLower)) sim += 0.5
        else if (contentLower.includes(qLower)) sim += 0.2

        // Keyword overlap boost
        let termMatches = 0
        for (const token of queryTokens) {
            if (titleLower.includes(token)) termMatches += 2
            else if (contentLower.includes(token)) termMatches += 1
        }
        sim += (termMatches / (queryTokens.length * 2)) * 0.3

        if (sim > 0.05) {
            const rawSlug = doc.slug || (doc.type === 'notebook' ? `/notebooks/${doc.id}` : `/posts/${doc.id}`)
            const slug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`
            const excerpt = extractRelevantExcerpt(doc.content, queryTokens, 160)

            scoredHits.push({
                objectID: doc.id,
                title: doc.title || (doc.type === 'notebook' ? 'Untitled Notebook' : 'Untitled Post'),
                excerpt,
                type: doc.type || 'notebook',
                slug,
                score: Math.min(1, sim),
                fields: { slug, type: doc.type || 'notebook' },
            })
        }
    }

    scoredHits.sort((a, b) => b.score - a.score)
    return scoredHits.slice(0, limit)
}

/**
 * @deprecated Name claimed "semantic"; implementation is lexical. Use searchLexicalDocuments.
 */
export const searchSemanticDocuments = searchLexicalDocuments
