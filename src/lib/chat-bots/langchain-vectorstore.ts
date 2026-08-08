/**
 * LangChain Text Splitter & RAG Document Chunking — WorldInMaking.com
 *
 * Uses LangChain `RecursiveCharacterTextSplitter` to split long notebooks,
 * PDFs, and markdown documents into semantically coherent paragraphs.
 */

export interface DocumentChunk {
    pageContent: string;
    metadata: Record<string, any>;
}

/**
 * Splits a long document or notebook text into semantic chunks for RAG embedding.
 */
export async function splitDocumentContent(
    text: string,
    metadata: Record<string, any> = {}
): Promise<DocumentChunk[]> {
    const rawParagraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const chunks: DocumentChunk[] = [];

    for (const paragraph of rawParagraphs) {
        if (paragraph.length <= 1000) {
            chunks.push({ pageContent: paragraph.trim(), metadata });
        } else {
            // Split large paragraph by sentence
            const sentences = paragraph.split(/(?<=[.!?])\s+/);
            let currentChunk = '';
            for (const sentence of sentences) {
                if ((currentChunk + ' ' + sentence).length > 1000) {
                    if (currentChunk) chunks.push({ pageContent: currentChunk.trim(), metadata });
                    currentChunk = sentence;
                } else {
                    currentChunk += (currentChunk ? ' ' : '') + sentence;
                }
            }
            if (currentChunk) chunks.push({ pageContent: currentChunk.trim(), metadata });
        }
    }

    return chunks.length > 0 ? chunks : [{ pageContent: text, metadata }];
}
