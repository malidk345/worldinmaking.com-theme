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

export function pdfPromptExcerpt(name: string, content: string, firstPageChars = 1400): string {
    if (isPdfWithoutText(content)) {
        return `User uploaded PDF this turn: ${name}. No extractable text (scanned or image-only). OCR is not available.`
    }
    const pages = pdfPageCount(content)
    const first = slicePdfByPage(content, 1)
    const excerpt = (first.text || content).replace(/^\[Page\s+1\]\s*/i, '').slice(0, firstPageChars)
    return `User uploaded PDF this turn: ${name} (${pages} page${pages === 1 ? '' : 's'}). Page 1 excerpt:\n${excerpt}\nCall read_document with name="${name}" and page= or query= to read more.`
}
