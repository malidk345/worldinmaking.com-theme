/**
 * One Sources-panel card per uploaded PDF. The model does not receive the
 * whole file in the prompt. It gets a page index, then reads one page with
 * read_document. The [P#] is the file, and the sentence names the page.
 */
import type { AiCitation } from '../ai/contracts'
import { isPdfWithoutText, pdfPageCatalog, pdfPageCount } from '../pdf-pages'

export function isUploadedPdf(name: string, content: string): boolean {
    return /\.pdf$/i.test(name) || /\[Page\s+\d+\]/i.test(content || '')
}

export function seedUploadCitations(attachments: Array<{ name: string; content: string }> | undefined): {
    citations: AiCitation[]
    note: string
} {
    const citations: AiCitation[] = []
    const notes: string[] = []
    for (const att of attachments || []) {
        const name = String(att?.name || '').trim()
        const content = String(att?.content || '')
        if (!name || !isUploadedPdf(name, content)) continue
        const id = citations.length + 1
        const scanned = isPdfWithoutText(content)
        const pages = scanned ? 0 : pdfPageCount(content)
        const venue = scanned
            ? 'Uploaded PDF, no extractable text'
            : `Uploaded PDF, ${pages} page${pages === 1 ? '' : 's'}`
        citations.push({
            id,
            kind: 'upload',
            title: name,
            url: '',
            snippet: scanned
                ? 'Uploaded PDF. No extractable text (scanned or image-only). Do not invent quotations.'
                : `Uploaded PDF, ${pages} page${pages === 1 ? '' : 's'}. Cite as [P${id}] and name the page you read.`,
            source: 'Upload',
            venue,
            workType: 'upload',
        })
        if (scanned) {
            notes.push(`[P${id}] ${name}: scanned or image-only. OCR is not available. Do not invent quotations.`)
            continue
        }
        const catalog = pdfPageCatalog(content, 40)
        const more =
            catalog.pageCount > catalog.listed
                ? `\n${catalog.pageCount - catalog.listed} further pages are stored. Call read_document with page= to read them.`
                : ''
        notes.push(
            `[P${id}] ${name} (${pages} pages). This index is not the page text.\n${catalog.lines.join('\n')}${more}\nRead one page with read_document name="${name}" page=N. Cite this file as [P${id}] and name the page. Do not quote a page you have not read.`
        )
    }
    const note = notes.length
        ? `Uploaded PDFs are sources in this turn. They are not web pages and not literature-search results.\n\n${notes.join('\n\n')}`
        : ''
    return { citations, note }
}

/** Prefix a local read so the model cites the card already registered for this file. */
export function prefixUploadSource(text: string, citations: AiCitation[] | undefined): string {
    const hit = (citations || []).find((item) => item.kind === 'upload' && item.title && text.includes(item.title))
    if (!hit || text.includes(`[P${hit.id}]`)) return text
    return `Uploaded source [P${hit.id}] (${hit.title}). Cite this id and name the page. Do not invent text from other pages.\n${text}`
}
