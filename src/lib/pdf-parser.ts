/**
 * Client-side PDF text extract (pdf.js). Page labels are `[Page N]` so Edge
 * `read_document` can slice without pdfjs.
 */

import { PDF_NO_TEXT } from './pdf-pages'

export const PDF_EXTRACT_PAGE_CAP = 200

export type PdfExtractResult = {
    text: string
    pageCount: number
    extractedPages: number
    hasText: boolean
    truncated: boolean
}

export async function extractTextFromPdf(file: File | ArrayBuffer | Uint8Array): Promise<PdfExtractResult> {
    const empty: PdfExtractResult = {
        text: PDF_NO_TEXT,
        pageCount: 0,
        extractedPages: 0,
        hasText: false,
        truncated: false,
    }
    try {
        let uint8Data: Uint8Array
        if (typeof File !== 'undefined' && file instanceof File) {
            const buffer = await file.arrayBuffer()
            uint8Data = new Uint8Array(buffer)
        } else if (file instanceof ArrayBuffer) {
            uint8Data = new Uint8Array(file)
        } else {
            uint8Data = file as Uint8Array
        }

        const pdfjs = await import('pdfjs-dist')
        if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions?.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '3.11.174'}/pdf.worker.min.js`
        }

        const loadingTask = pdfjs.getDocument({
            data: uint8Data,
            useSystemFonts: true,
            isEvalSupported: false,
        })

        const pdf = await loadingTask.promise
        const pageCount = pdf.numPages
        const limit = Math.min(pageCount, PDF_EXTRACT_PAGE_CAP)
        const pageTexts: string[] = []

        for (let pageNum = 1; pageNum <= limit; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum)
                const textContent = await page.getTextContent()
                const items = textContent.items
                    .map((item: { str?: string }) => ('str' in item ? item.str : ''))
                    .filter(Boolean)
                const pageBody = items.join(' ').replace(/\s+/g, ' ').trim()
                if (pageBody) {
                    pageTexts.push(`[Page ${pageNum}]\n${pageBody}`)
                }
            } catch (pageErr) {
                console.warn(`[PDF Parser] Error reading page ${pageNum}:`, pageErr)
            }
        }

        const text = pageTexts.join('\n\n')
        if (!text.trim()) {
            return { ...empty, pageCount, truncated: pageCount > limit }
        }
        return {
            text,
            pageCount,
            extractedPages: pageTexts.length,
            hasText: true,
            truncated: pageCount > limit,
        }
    } catch (err) {
        console.error('[PDF Parser] pdfjs extraction failed:', err)
        return empty
    }
}
