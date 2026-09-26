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
    return `User uploaded PDF this turn: ${name} (${pages} page${pages === 1 ? '' : 's'}, stored page by page). Page 1 begins: ${lead}\nCall read_document with name="${name}" and page=N to read any page in full. Cite the file with its [P#] and name the page. Do not quote a page you have not read.`
}
