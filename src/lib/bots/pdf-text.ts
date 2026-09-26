/**
 * Real PDF text extraction for the edge runtime (package E3).
 *
 * The legacy reader in `tools/read-document.ts` only regex-scans raw bytes for
 * `BT … ET` blocks, so compressed PDFs (FlateDecode content streams, object
 * streams — e.g. every DergiPark article) yield nothing. This wraps `unpdf`
 * (the serverless build of Mozilla pdf.js, no worker / canvas / Node APIs) with
 * caps sized for Cloudflare Pages Functions:
 *   - bytes: PDFs larger than PDF_TEXT_LIMITS.maxBytes are refused up front;
 *   - pages: at most `maxPages` pages are decoded;
 *   - text:  stops after `maxChars` characters;
 *   - time:  stops between pages once `timeBudgetMs` has elapsed.
 * The library is imported lazily so cold starts of routes that never read a
 * PDF do not pay for it. Page numbers are the real PDF page indexes; when the
 * pages carry a consistent printed number (journal pagination), it is reported
 * as `printed` too.
 */

export const PDF_TEXT_LIMITS = {
    maxBytes: 12_000_000,
    maxPages: 60,
    maxChars: 400_000,
    timeBudgetMs: 8_000,
}

export interface PdfTextPage {
    /** 1-based PDF page index (real, not an estimate). */
    page: number
    /** Printed page number when the document shows a consistent pagination (e.g. journal page 132). */
    printed?: number
    text: string
}

export interface PdfTextResult {
    pages: PdfTextPage[]
    totalPages: number
    /** Some pages were not decoded (page / character / time cap). */
    truncated: boolean
    note?: string
}

export function looksLikePdf(bytes: Uint8Array): boolean {
    // "%PDF-" within the first 1 KB (some servers prepend junk / BOM).
    const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.byteLength, 1024)))
    return head.includes('%PDF-')
}

type TextItem = { str?: string; hasEOL?: boolean }

/** pdf.js text items → lines; joins words hyphenated across a line break ("bırakma-\nsının" → "bırakmasının"). */
/** Lowercase letter in any script (Turkish ç/ğ/ı/ö/ş/ü included). */
function isLowerLetter(ch: string): boolean {
    return ch.toLowerCase() === ch && ch.toUpperCase() !== ch
}

export function pdfItemsToText(items: TextItem[]): string {
    let out = ''
    for (const item of items) {
        if (typeof item.str !== 'string') continue
        out += item.str
        if (item.hasEOL) out += '\n'
    }
    return out
        .replace(/[ \t]+\n/g, '\n')
        .replace(/(\S)[-\u00AD]\n(\S)/g, (match, a: string, b: string) => (isLowerLetter(a) && isLowerLetter(b) ? a + b : match))
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

/**
 * Detects journal pagination: a number in the first / last line of each page
 * that equals `pdfPage + offset` on most pages. Returns the offset or null.
 */
export function detectPrintedPageOffset(pages: Array<{ page: number; text: string }>): number | null {
    if (pages.length < 3) return null
    const votes = new Map<number, number>()
    for (const p of pages) {
        const lines = p.text.split('\n').map((l) => l.trim()).filter(Boolean)
        const edge = [lines[0], lines[1], lines[lines.length - 2], lines[lines.length - 1]].filter(Boolean).join(' ')
        const seen = new Set<number>()
        const re = /(?:^|[\s|•·–-])(\d{1,4})(?=$|[\s|•·–-]|[A-ZÀ-ÞĀ-Ž])/g
        let m: RegExpExecArray | null
        while ((m = re.exec(edge))) {
            const offset = Number(m[1]) - p.page
            if (offset < 0 || offset > 5000 || seen.has(offset)) continue
            seen.add(offset)
            votes.set(offset, (votes.get(offset) || 0) + 1)
        }
    }
    let best: number | null = null
    let bestVotes = 0
    for (const [offset, count] of Array.from(votes)) {
        if (count > bestVotes || (count === bestVotes && best !== null && offset < best)) {
            best = offset
            bestVotes = count
        }
    }
    // Most pages must agree (cover pages often have no number).
    return best !== null && bestVotes >= Math.max(3, Math.ceil(pages.length * 0.6)) ? best : null
}

type PdfProxy = {
    numPages: number
    getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: TextItem[] }>; cleanup?: () => void }>
    destroy?: () => Promise<void> | void
}

/**
 * Extracts per-page text. Throws only for unusable input (not a PDF, too large,
 * encrypted / corrupt) so callers can fall back to their previous reader.
 */
export async function extractPdfPages(
    bytes: Uint8Array,
    options: Partial<typeof PDF_TEXT_LIMITS> & { signal?: AbortSignal; now?: () => number } = {}
): Promise<PdfTextResult> {
    const limits = { ...PDF_TEXT_LIMITS, ...options }
    if (bytes.byteLength > limits.maxBytes) throw new Error(`PDF is larger than ${Math.round(limits.maxBytes / 1_000_000)} MB`)
    if (!looksLikePdf(bytes)) throw new Error('not a PDF')
    const now = options.now || (() => Date.now())
    const started = now()
    const { getDocumentProxy } = await import('unpdf')
    // pdf.js may transfer / detach the buffer: hand it a copy.
    const pdf = (await getDocumentProxy(new Uint8Array(bytes), { isEvalSupported: false, verbosity: 0 } as Record<string, unknown>)) as unknown as PdfProxy
    const pages: PdfTextPage[] = []
    let chars = 0
    let truncated = false
    let note: string | undefined
    try {
        const totalPages = pdf.numPages
        const last = Math.min(totalPages, limits.maxPages)
        if (totalPages > last) {
            truncated = true
            note = `first ${last} of ${totalPages} pages read`
        }
        for (let n = 1; n <= last; n++) {
            if (options.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' })
            if (n > 1 && now() - started > limits.timeBudgetMs) {
                truncated = true
                note = `first ${n - 1} of ${totalPages} pages read (time limit)`
                break
            }
            const page = await pdf.getPage(n)
            const content = await page.getTextContent()
            page.cleanup?.()
            const text = pdfItemsToText(content.items)
            pages.push({ page: n, text })
            chars += text.length
            if (chars >= limits.maxChars) {
                if (n < totalPages) {
                    truncated = true
                    note = `first ${n} of ${totalPages} pages read (text limit)`
                }
                break
            }
        }
        const offset = detectPrintedPageOffset(pages)
        if (offset !== null) for (const p of pages) p.printed = p.page + offset
        return { pages, totalPages, truncated, note }
    } finally {
        try {
            await pdf.destroy?.()
        } catch {
            /* ignore */
        }
    }
}

/** "p. 132 (PDF page 2)" when the printed pagination differs, "p. 15" when it matches, else "PDF page 2". */
export function pdfPageLabel(page: PdfTextPage): string {
    if (!page.printed) return `PDF page ${page.page}`
    return page.printed === page.page ? `p. ${page.page}` : `p. ${page.printed} (PDF page ${page.page})`
}
