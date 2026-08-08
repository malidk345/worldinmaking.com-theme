/**
 * LangChain Text Splitter & RAG Document Chunking — WorldInMaking.com
 *
 * Uses LangChain `RecursiveCharacterTextSplitter` to split long notebooks,
 * PDFs, and markdown documents into semantically coherent paragraphs.
 */

import { RecursiveCharacterTextSplitter } from '@langchain/core/documents';

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
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ['\n\n', '\n', '. ', ' ', ''],
    });

    const docs = await splitter.createDocuments([text], [metadata]);
    return docs.map((d) => ({
        pageContent: d.pageContent,
        metadata: d.metadata,
    }));
}
