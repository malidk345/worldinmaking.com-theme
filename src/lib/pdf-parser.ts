/**
 * Client-side PDF text extract (pdf.js). Every page is kept as `[Page N]`
 * so `read_document` can open one page of a whole book. The file is not
 * shortened to the first pages.
 */

import { PDF_NO_TEXT } from './pdf-pages'
import { pdfItemsToText } from './bots/pdf-text'

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
        const pageTexts: string[] = []
        let failedPages = 0

        try {
            for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
                try {
                    const page = await pdf.getPage(pageNum)
                    const textContent = await page.getTextContent()
                    const items = (textContent.items as Array<{ str?: string; hasEOL?: boolean }>).map((item) => ({
                        str: typeof item.str === 'string' ? item.str : '',
                        hasEOL: Boolean(item.hasEOL),
                    }))
                    const pageBody = pdfItemsToText(items)
                    if (pageBody) {
                        pageTexts.push(`[Page ${pageNum}]\n${pageBody}`)
                    }
                    page.cleanup()
                } catch (pageErr) {
                    failedPages += 1
                    console.warn(`[PDF Parser] Error reading page ${pageNum}:`, pageErr)
                }
            }
        } finally {
            try {
                await pdf.destroy()
            } catch {
                /* the extract is already in hand */
            }
        }

        const text = pageTexts.join('\n\n')
        if (!text.trim()) {
            return { ...empty, pageCount, truncated: failedPages > 0 }
        }
        return {
            text,
            pageCount,
            extractedPages: pageTexts.length,
            hasText: true,
            truncated: failedPages > 0,
        }
    } catch (err) {
        console.error('[PDF Parser] pdfjs extraction failed:', err)
        return empty
    }
}