/** Shared by client extract and Edge `read_document`. No pdfjs. */

export const PDF_NO_TEXT =
    '[PDF has no extractable text — scanned or image-only. OCR is not available.]'

export type PdfPageBlock = { page: number; text: string }

export function isPdfWithoutText(content: string): boolean {
    const body = String(content || '').trim()
    if (!body) return true
    return body === PDF_NO_TEXT || /scanned or image-only/i.test(body)
}

export function parsePdfPageBlocks(content: string): PdfPageBlock[] {
    const raw = String(content || '')
    if (!raw.trim() || isPdfWithoutText(raw)) return []
    const matches = [...raw.matchAll(/\[Page\s+(\d+)\]\s*\n?/gi)]
    if (matches.length === 0) {
        return [{ page: 1, text: raw.trim() }]
    }
    const blocks: PdfPageBlock[] = []
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const page = parseInt(match[1], 10)
        const start = (match.index || 0) + match[0].length
        const end = i + 1 < matches.length ? matches[i + 1].index || raw.length : raw.length
        const text = raw.slice(start, end).trim()
        if (Number.isFinite(page) && page > 0) {
            blocks.push({ page, text })
        }
    }
    return blocks
}

export function pdfPageCount(content: string): number {
    const blocks = parsePdfPageBlocks(content)
    if (blocks.length === 0) return 0
    return Math.max(...blocks.map((block) => block.page), blocks.length)
}

export function slicePdfByPage(
    content: string,
    page?: number
): { text: string; pageCount: number; page?: number; error?: string } {
    const raw = String(content || '')
    if (isPdfWithoutText(raw)) {
        return { text: '', pageCount: 0, error: PDF_NO_TEXT }
    }
    const blocks = parsePdfPageBlocks(raw)
    const pageCount = pdfPageCount(raw)
    if (!page) {
        return { text: raw.trim(), pageCount }
    }
    const found = blocks.find((block) => block.page === page)
    if (!found) {
        return {
            text: '',
            pageCount,
            page,
            error: `Page ${page} is not in this extract (${pageCount} page${pageCount === 1 ? '' : 's'}).`,
        }
    }
    return { text: `[Page ${found.page}]\n${found.text}`, pageCount, page }
}

export function pdfPageCatalog(
    content: string,
    maxLines = 80,
    leadChars = 72
): { lines: string[]; pageCount: number; listed: number } {
    const blocks = parsePdfPageBlocks(content)
    const pageCount = pdfPageCount(content)
    const listed = blocks.slice(0, maxLines)
    return {
        pageCount,
        listed: listed.length,
        lines: listed.map((block) => {
            const lead = block.text.replace(/\s+/g, ' ').trim().slice(0, leadChars)
            return `${block.page}. ${lead || '(blank)'}`
        }),
    }
}

export function pdfPromptExcerpt(name: string, content: string): string {
    if (isPdfWithoutText(content)) {
        return `User uploaded PDF this turn: ${name}. No extractable text (scanned or image-only). OCR is not available. Do not invent quotations.`
    }
    const pages = pdfPageCount(content)
    const first = parsePdfPageBlocks(content)[0]
    const lead = (first?.text || '').replace(/\s+/g, ' ').trim().slice(0, 160)
    return `User uploaded PDF this turn: ${name} (${pages} page${pages === 1 ? '' : 's'}, stored page by page). Page 1 begins: ${lead}\nThe file has ${pages} pages. Reading the first pages does not make the file that short.\nCall read_document with name="${name}" and page=N to read any page in full. Pages already read are not the length of the file. A follow-up or a specific question must call read_document again. Cite the file with its [P#] and name the page. Do not quote a page you have not read.`
}

/** Follow-up history must not carry PDF bodies. A few pasted pages look like the whole file. */
export function historyPdfPointer(name: string, pages?: number): string {
    const safe = String(name || 'document').replace(/[\r\n"]/g, ' ').trim() || 'document'
    const count =
        pages && pages > 0 ? `${pages} page${pages === 1 ? '' : 's'} are stored. ` : ''
    return `[Document: ${safe}] ${count}Pages already read in this chat are not the length of the file. On a follow-up or a specific question, call read_document with name="${safe}" and page=N. Do not answer from pages you already saw.`
}

export function historyAttachmentNote(name: string, content: string, type?: string): string {
    const raw = String(content || '')
    const pdf = type === 'pdf' || /\.pdf$/i.test(name) || /\[Page\s+\d+\]/i.test(raw)
    if (!pdf) return `[Document: ${name}]\n${raw.slice(0, 3000)}`
    if (isPdfWithoutText(raw)) {
        return `[Document: ${name}] Scanned or image-only. OCR is not available. Do not invent quotations.`
    }
    return historyPdfPointer(name, pdfPageCount(raw))
}

/** Drop a pasted PDF body from an older user turn. Do not recount pages from the snippet. */
export function omitPastedPdfBodies(content: string): string {
    return String(content || '').replace(
        /\[Document:\s*([^\]]+)\]\n([\s\S]*?)(?=\n\[Document:|$)/g,
        (full, rawName: string, body: string) => {
            const name = String(rawName || '').trim()
            const pdf = /\.pdf$/i.test(name) || /\[Page\s+\d+\]/i.test(body)
            if (!pdf) return full
            if (isPdfWithoutText(body)) {
                return `[Document: ${name}] Scanned or image-only. OCR is not available. Do not invent quotations.`
            }
            if (!/\[Page\s+\d+\]/i.test(body) && /call read_document/i.test(body)) return full.trimEnd()
            return historyPdfPointer(name)
        }
    )
}

export function isStoredDocumentPage(text: string): boolean {
    const raw = String(text || '')
    if (!raw.trim()) return false
    if (/^\s*\{/.test(raw) && /"ok"\s*:\s*false/.test(raw)) return false
    return (
        /\[Page\s+\d+\]/i.test(raw) ||
        /page \d+ of \d+/i.test(raw) ||
        /Page index only/i.test(raw) ||
        /Uploaded source \[P\d+\]/i.test(raw)
    )
}

export function historyReadDocumentStub(args?: string): string {
    let name = ''
    let page = ''
    try {
        const parsed = JSON.parse(String(args || '{}')) as { name?: unknown; page?: unknown; url?: unknown }
        if (typeof parsed.name === 'string') name = parsed.name.replace(/[\r\n"]/g, ' ').trim()
        if (!name && typeof parsed.url === 'string') name = parsed.url.replace(/[\r\n"]/g, ' ').trim()
        if (typeof parsed.page === 'number' && Number.isFinite(parsed.page) && parsed.page > 0) {
            page = String(Math.floor(parsed.page))
        }
    } catch {
        /* clipped arguments */
    }
    const seen = [name && `name="${name}"`, page && `page=${page}`].filter(Boolean).join(' ')
    const called = seen ? ` (already called with ${seen})` : ''
    return `read_document returned one page${called}. That page is not the file. Pages already read are not the length of the document. Call read_document again with name= and page= for the page this question needs. Do not answer from pages already in the chat.`
}

/** Prior read_document page text must not ride into the next question. Errors stay. */
export function historyToolResult(name: string, args: string | undefined, result: string): string {
    const raw = String(result || '')
    if (name !== 'read_document' || !isStoredDocumentPage(raw)) return raw
    return historyReadDocumentStub(args)
}
