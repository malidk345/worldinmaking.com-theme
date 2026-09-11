import { parseMarkdownNotebook } from '../../lib/components/MarkdownNotebook/markdown'
import { getInlineText } from '../../lib/components/MarkdownNotebook/utils'
import type {
    NotebookBlockNode,
    NotebookComponentBlockNode,
    NotebookInlineNode,
    NotebookListItem,
} from '../../lib/components/MarkdownNotebook/types'
import { getNotebookWithContent } from './notebookStorage'
import { notebookFilename } from './outlineModel'

const A4_CSS_PX = 794
const PAGE_MARGIN_MM = 16
const PAGE_W_MM = 210
const PAGE_H_MM = 297
const CONTENT_W_MM = PAGE_W_MM - PAGE_MARGIN_MM * 2

const FONT_FAMILY = 'DejaVu'
const FONT_URLS = {
    normal: 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf',
    bold: 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf',
}

let fontCache: { normal: string; bold: string } | null = null

function applyStyles(node: HTMLElement, styles: Record<string, string>): HTMLElement {
    Object.assign(node.style, styles)
    return node
}

function textEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text: string,
    styles?: Record<string, string>
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag)
    node.textContent = text
    if (styles) applyStyles(node, styles)
    return node
}

function listMarker(item: NotebookListItem, index: number, ordered: boolean, start: number): string {
    if (item.checked === true) return '☑'
    if (item.checked === false) return '☐'
    if (ordered) return `${start + index}.`
    return '•'
}

function inlineToText(nodes: NotebookInlineNode[]): string {
    let out = ''
    for (const node of nodes) {
        if (node.type === 'hardBreak') {
            out += '\n'
            continue
        }
        out += node.text
        const link = node.marks?.find((mark) => mark.type === 'link')
        if (link && link.type === 'link' && link.href && !node.text.includes(link.href)) {
            out += ` (${link.href})`
        }
    }
    return out
}

function renderComponent(node: NotebookComponentBlockNode): HTMLElement | null {
    const tag = node.tagName
    if (tag === 'Divider') {
        return applyStyles(document.createElement('hr'), {
            border: '0',
            borderTop: '1px solid #d0d0d0',
            margin: '20px 0',
        })
    }
    if (tag === 'Image') {
        const src = typeof node.props.src === 'string' ? node.props.src : ''
        const alt = typeof node.props.alt === 'string' ? node.props.alt : ''
        if (!src) return alt ? textEl('p', alt, { color: '#555', fontStyle: 'italic' }) : null
        const wrap = applyStyles(document.createElement('figure'), { margin: '16px 0' })
        const img = document.createElement('img')
        img.src = src
        img.alt = alt
        img.crossOrigin = 'anonymous'
        img.referrerPolicy = 'no-referrer'
        applyStyles(img, { maxWidth: '100%', height: 'auto', display: 'block' })
        wrap.appendChild(img)
        if (alt) wrap.appendChild(textEl('figcaption', alt, { fontSize: '12px', color: '#666', marginTop: '6px' }))
        return wrap
    }
    if (tag === 'Comment') {
        const text = typeof node.props.text === 'string' ? node.props.text : ''
        if (!text.trim()) return null
        return textEl('p', text, { fontSize: '13px', color: '#555', fontStyle: 'italic', margin: '10px 0' })
    }
    const label = typeof node.props.title === 'string' ? node.props.title : tag
    const extra =
        typeof node.props.content === 'string'
            ? node.props.content
            : typeof node.props.src === 'string'
              ? node.props.src
              : ''
    const box = applyStyles(document.createElement('div'), {
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '10px 12px',
        margin: '12px 0',
        background: '#fafafa',
        fontSize: '13px',
        color: '#333',
    })
    box.appendChild(textEl('div', label, { fontWeight: '600' }))
    if (extra) box.appendChild(textEl('div', extra, { marginTop: '4px', whiteSpace: 'pre-wrap' }))
    return box
}

function renderBlock(node: NotebookBlockNode): HTMLElement | null {
    if (node.type === 'heading') {
        const level = Math.min(Math.max(node.level ?? 1, 1), 4) as 1 | 2 | 3 | 4
        const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'
        const sizes = { 1: '28px', 2: '22px', 3: '18px', 4: '16px' }
        return textEl(tag, inlineToText(node.children) || getInlineText(node.children), {
            fontSize: sizes[level],
            fontWeight: '700',
            lineHeight: '1.3',
            margin: level === 1 ? '0 0 16px' : '22px 0 10px',
            color: '#111',
        })
    }
    if (node.type === 'paragraph') {
        const text = inlineToText(node.children)
        if (!text.trim()) return applyStyles(document.createElement('div'), { height: '10px' })
        return textEl('p', text, { margin: '0 0 12px', fontSize: '15px', lineHeight: '1.65', color: '#1a1a1a' })
    }
    if (node.type === 'blockquote') {
        const quote = applyStyles(document.createElement('blockquote'), {
            margin: '12px 0',
            padding: '4px 0 4px 14px',
            borderLeft: '3px solid #ccc',
            color: '#444',
            fontStyle: 'italic',
        })
        quote.appendChild(textEl('p', inlineToText(node.children), { margin: '0', lineHeight: '1.6' }))
        return quote
    }
    if (node.type === 'list') {
        const list = applyStyles(document.createElement('div'), { margin: '8px 0 14px' })
        node.items.forEach((item, index) => {
            const row = applyStyles(document.createElement('div'), {
                display: 'flex',
                gap: '8px',
                paddingLeft: `${Math.max(0, item.depth) * 18}px`,
                margin: '3px 0',
                fontSize: '15px',
                lineHeight: '1.55',
            })
            row.appendChild(
                textEl('span', listMarker(item, index, node.ordered, node.start ?? 1), {
                    flex: '0 0 auto',
                    color: '#333',
                })
            )
            row.appendChild(textEl('span', inlineToText(item.children), { minWidth: '0' }))
            list.appendChild(row)
        })
        return list
    }
    if (node.type === 'code') {
        return textEl('pre', node.text, {
            margin: '12px 0',
            padding: '12px 14px',
            background: '#f4f4f5',
            borderRadius: '6px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '12px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: '#111',
        })
    }
    if (node.type === 'table') {
        const table = applyStyles(document.createElement('table'), {
            width: '100%',
            borderCollapse: 'collapse',
            margin: '14px 0',
            fontSize: '13px',
        })
        const thead = document.createElement('thead')
        const headRow = document.createElement('tr')
        node.headers.forEach((cell) => {
            const th = textEl('th', inlineToText(cell.children), {
                textAlign: 'left',
                border: '1px solid #ddd',
                padding: '6px 8px',
                background: '#f6f6f6',
                fontWeight: '600',
            })
            headRow.appendChild(th)
        })
        thead.appendChild(headRow)
        table.appendChild(thead)
        const tbody = document.createElement('tbody')
        node.rows.forEach((row) => {
            const tr = document.createElement('tr')
            row.forEach((cell) => {
                const td = textEl('td', inlineToText(cell.children), {
                    border: '1px solid #ddd',
                    padding: '6px 8px',
                    verticalAlign: 'top',
                })
                tr.appendChild(td)
            })
            tbody.appendChild(tr)
        })
        table.appendChild(tbody)
        return table
    }
    if (node.type === 'component') return renderComponent(node)
    return null
}

function buildPrintArticle(title: string, markdown: string): HTMLElement {
    const article = applyStyles(document.createElement('article'), {
        boxSizing: 'border-box',
        width: `${A4_CSS_PX}px`,
        padding: '48px 56px 64px',
        background: '#ffffff',
        color: '#111111',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        textAlign: 'left',
    })
    const doc = parseMarkdownNotebook(markdown)
    const first = doc.nodes[0]
    const firstIsTitle = first?.type === 'heading' && (first.level ?? 1) === 1
    if (!firstIsTitle && title.trim()) {
        article.appendChild(
            textEl('h1', title.trim(), {
                fontSize: '28px',
                fontWeight: '700',
                lineHeight: '1.3',
                margin: '0 0 16px',
                color: '#111',
            })
        )
    }
    for (const node of doc.nodes) {
        const block = renderBlock(node)
        if (block) article.appendChild(block)
    }
    if (!article.childElementCount) {
        article.appendChild(textEl('p', 'This notebook is empty.', { color: '#666' }))
    }
    return article
}

async function waitForImages(root: ParentNode): Promise<void> {
    const images = Array.from(root.querySelectorAll('img'))
    await Promise.all(
        images.map((image) =>
            image.complete
                ? Promise.resolve()
                : Promise.race([
                      new Promise<void>((resolve) => {
                          image.onload = () => resolve()
                          image.onerror = () => resolve()
                      }),
                      new Promise<void>((resolve) => window.setTimeout(resolve, 8000)),
                  ])
        )
    )
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    const chunk = 0x8000
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(binary)
}

async function loadUnicodeFont(): Promise<{ normal: string; bold: string } | null> {
    if (fontCache) return fontCache
    try {
        const loaded = await Promise.race([
            Promise.all(
                [FONT_URLS.normal, FONT_URLS.bold].map(async (url) => {
                    const res = await fetch(url)
                    if (!res.ok) throw new Error(`font ${res.status}`)
                    return arrayBufferToBase64(await res.arrayBuffer())
                })
            ),
            new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('font timeout')), 10000)),
        ])
        fontCache = { normal: loaded[0], bold: loaded[1] }
        return fontCache
    } catch {
        return null
    }
}

async function rasterizeImage(src: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.referrerPolicy = 'no-referrer'
        const timer = window.setTimeout(() => resolve(null), 8000)
        img.onload = () => {
            window.clearTimeout(timer)
            try {
                const max = 1600
                let width = img.naturalWidth || img.width
                let height = img.naturalHeight || img.height
                if (!width || !height) {
                    resolve(null)
                    return
                }
                if (width > max) {
                    height = (height * max) / width
                    width = max
                }
                const canvas = document.createElement('canvas')
                canvas.width = Math.max(1, Math.round(width))
                canvas.height = Math.max(1, Math.round(height))
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    resolve(null)
                    return
                }
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                resolve({
                    dataUrl: canvas.toDataURL('image/jpeg', 0.86),
                    width: canvas.width,
                    height: canvas.height,
                })
            } catch {
                resolve(null)
            }
        }
        img.onerror = () => {
            window.clearTimeout(timer)
            resolve(null)
        }
        img.src = src
    })
}

function ptToMm(pt: number): number {
    return pt * 0.352778
}

function lineHeightMm(sizePt: number, ratio = 1.38): number {
    return ptToMm(sizePt) * ratio
}

type PdfDoc = {
    addPage: () => void
    setFont: (font: string, style: string) => void
    setFontSize: (size: number) => void
    setTextColor: (r: number, g: number, b: number) => void
    setDrawColor: (n: number) => void
    setFillColor: (r: number, g: number, b: number) => void
    setLineWidth: (n: number) => void
    splitTextToSize: (text: string, width: number) => string[]
    text: (text: string, x: number, y: number) => void
    line: (x1: number, y1: number, x2: number, y2: number) => void
    rect: (x: number, y: number, w: number, h: number, style?: string) => void
    addImage: (
        image: string,
        format: string,
        x: number,
        y: number,
        w: number,
        h: number,
        alias?: string,
        compression?: string
    ) => void
}

class PdfWriter {
    private readonly pdf: PdfDoc
    private readonly fontName: string
    private y: number

    constructor(pdf: PdfDoc, fontName: string) {
        this.pdf = pdf
        this.fontName = fontName
        this.y = PAGE_MARGIN_MM
    }

    private setFace(size: number, weight: 'normal' | 'bold', color = '#111111'): void {
        this.pdf.setFont(this.fontName, weight)
        this.pdf.setFontSize(size)
        const value = color.replace('#', '')
        const n = parseInt(value, 16)
        this.pdf.setTextColor((n >> 16) & 255, (n >> 8) & 255, n & 255)
    }

    private ensure(height: number): void {
        if (this.y + height <= PAGE_H_MM - PAGE_MARGIN_MM) return
        this.pdf.addPage()
        this.y = PAGE_MARGIN_MM
    }

    gap(mm: number): void {
        this.y += mm
    }

    textBlock(
        text: string,
        options: {
            size?: number
            weight?: 'normal' | 'bold'
            color?: string
            indent?: number
            after?: number
            width?: number
        } = {}
    ): void {
        const size = options.size ?? 11
        const weight = options.weight ?? 'normal'
        const indent = options.indent ?? 0
        const width = options.width ?? CONTENT_W_MM - indent
        const after = options.after ?? 3.2
        const body = text.replace(/\r\n/g, '\n')
        this.setFace(size, weight, options.color)
        const lines = this.pdf.splitTextToSize(body, Math.max(20, width)) as string[]
        const lh = lineHeightMm(size)
        for (const line of lines) {
            this.ensure(lh)
            this.pdf.text(line, PAGE_MARGIN_MM + indent, this.y + ptToMm(size))
            this.y += lh
        }
        this.y += after
    }

    divider(): void {
        this.ensure(8)
        this.pdf.setDrawColor(200)
        this.pdf.setLineWidth(0.3)
        this.pdf.line(PAGE_MARGIN_MM, this.y + 2, PAGE_MARGIN_MM + CONTENT_W_MM, this.y + 2)
        this.y += 8
    }

    table(headers: string[], rows: string[][]): void {
        const cols = Math.max(headers.length, ...rows.map((row) => row.length), 1)
        const colW = CONTENT_W_MM / cols
        const size = 9
        const pad = 1.6
        const lh = lineHeightMm(size, 1.28)
        const wrap = (value: string) => this.pdf.splitTextToSize(value || ' ', colW - pad * 2) as string[]
        const draw = (cells: string[], header: boolean) => {
            this.setFace(size, header ? 'bold' : 'normal')
            const wrapped = Array.from({ length: cols }, (_, i) => wrap(cells[i] || ''))
            const maxLines = Math.max(1, ...wrapped.map((lines) => lines.length))
            const height = maxLines * lh + pad * 2
            this.ensure(height)
            this.pdf.setDrawColor(210)
            this.pdf.setFillColor(header ? 246 : 255, header ? 246 : 255, header ? 246 : 255)
            this.pdf.rect(PAGE_MARGIN_MM, this.y, CONTENT_W_MM, height, 'FD')
            for (let i = 1; i < cols; i++) {
                const x = PAGE_MARGIN_MM + colW * i
                this.pdf.line(x, this.y, x, this.y + height)
            }
            wrapped.forEach((lines, i) => {
                lines.forEach((line, lineIndex) => {
                    this.pdf.text(
                        line,
                        PAGE_MARGIN_MM + colW * i + pad,
                        this.y + pad + ptToMm(size) + lineIndex * lh
                    )
                })
            })
            this.y += height
        }
        if (headers.length) draw(headers, true)
        rows.forEach((row) => draw(row, false))
        this.y += 4
    }

    image(dataUrl: string, pxW: number, pxH: number): void {
        const maxW = CONTENT_W_MM
        const maxH = PAGE_H_MM - PAGE_MARGIN_MM * 2
        const ratio = pxH / Math.max(pxW, 1)
        let w = maxW
        let h = w * ratio
        if (h > maxH) {
            h = maxH
            w = h / ratio
        }
        this.ensure(h + 4)
        this.pdf.addImage(dataUrl, 'JPEG', PAGE_MARGIN_MM, this.y, w, h, undefined, 'MEDIUM')
        this.y += h + 5
    }
}

async function writeNotebookPdf(title: string, markdown: string, filename: string): Promise<void> {
    const [{ default: jsPDF }] = await Promise.all([import('jspdf')])
    const fonts = await loadUnicodeFont()
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    if (fonts) {
        pdf.addFileToVFS('DejaVuSans.ttf', fonts.normal)
        pdf.addFont('DejaVuSans.ttf', FONT_FAMILY, 'normal')
        pdf.addFileToVFS('DejaVuSans-Bold.ttf', fonts.bold)
        pdf.addFont('DejaVuSans-Bold.ttf', FONT_FAMILY, 'bold')
        pdf.setFont(FONT_FAMILY, 'normal')
    }
    const writer = new PdfWriter(pdf as unknown as PdfDoc, fonts ? FONT_FAMILY : 'helvetica')
    const doc = parseMarkdownNotebook(markdown)
    const first = doc.nodes[0]
    const firstIsTitle = first?.type === 'heading' && (first.level ?? 1) === 1
    if (!firstIsTitle && title.trim()) {
        writer.textBlock(title.trim(), { size: 20, weight: 'bold', after: 6 })
    }

    const writeComponent = async (node: NotebookComponentBlockNode): Promise<void> => {
        if (node.tagName === 'Divider') {
            writer.divider()
            return
        }
        if (node.tagName === 'Image') {
            const src = typeof node.props.src === 'string' ? node.props.src : ''
            const alt = typeof node.props.alt === 'string' ? node.props.alt : ''
            if (src) {
                const image = await rasterizeImage(src)
                if (image) writer.image(image.dataUrl, image.width, image.height)
                else if (alt) writer.textBlock(alt, { size: 10, color: '#555555', after: 4 })
            } else if (alt) {
                writer.textBlock(alt, { size: 10, color: '#555555', after: 4 })
            }
            return
        }
        if (node.tagName === 'Comment') {
            const text = typeof node.props.text === 'string' ? node.props.text : ''
            if (text.trim()) writer.textBlock(text.trim(), { size: 10, color: '#555555', after: 4 })
            return
        }
        const label = typeof node.props.title === 'string' ? node.props.title : node.tagName
        const extra =
            typeof node.props.content === 'string'
                ? node.props.content
                : typeof node.props.src === 'string'
                  ? node.props.src
                  : ''
        writer.textBlock(label, { size: 11, weight: 'bold', after: 1.5 })
        if (extra) writer.textBlock(extra, { size: 10, color: '#333333', after: 4 })
    }

    for (const node of doc.nodes) {
        if (node.type === 'heading') {
            const level = Math.min(Math.max(node.level ?? 1, 1), 4)
            const sizes = { 1: 20, 2: 16, 3: 13, 4: 12 }
            writer.gap(level === 1 ? 0 : 3)
            writer.textBlock(inlineToText(node.children), {
                size: sizes[level as 1 | 2 | 3 | 4],
                weight: 'bold',
                after: 3,
            })
            continue
        }
        if (node.type === 'paragraph') {
            const text = inlineToText(node.children)
            if (!text.trim()) {
                writer.gap(3)
                continue
            }
            writer.textBlock(text, { size: 11, after: 3.4 })
            continue
        }
        if (node.type === 'blockquote') {
            writer.textBlock(inlineToText(node.children), {
                size: 11,
                color: '#444444',
                indent: 6,
                after: 4,
            })
            continue
        }
        if (node.type === 'list') {
            node.items.forEach((item, index) => {
                const marker = listMarker(item, index, node.ordered, node.start ?? 1)
                writer.textBlock(`${marker}  ${inlineToText(item.children)}`, {
                    size: 11,
                    indent: Math.max(0, item.depth) * 6,
                    after: 1.6,
                })
            })
            writer.gap(2)
            continue
        }
        if (node.type === 'code') {
            writer.textBlock(node.text || ' ', { size: 9, after: 4 })
            continue
        }
        if (node.type === 'table') {
            writer.table(
                node.headers.map((cell) => inlineToText(cell.children)),
                node.rows.map((row) => row.map((cell) => inlineToText(cell.children)))
            )
            continue
        }
        if (node.type === 'component') await writeComponent(node)
    }

    if (!doc.nodes.length) {
        writer.textBlock('This notebook is empty.', { size: 11, color: '#666666' })
    }

    pdf.setProperties({
        title: title || 'Untitled Notebook',
        creator: 'WorldInMaking',
    })
    pdf.save(filename)
}

function printArticle(title: string, article: HTMLElement): Promise<boolean> {
    return new Promise((resolve) => {
        const iframe = document.createElement('iframe')
        iframe.setAttribute('aria-hidden', 'true')
        Object.assign(iframe.style, {
            position: 'fixed',
            right: '0',
            bottom: '0',
            width: '0',
            height: '0',
            border: '0',
        })
        document.body.appendChild(iframe)
        const doc = iframe.contentDocument
        const win = iframe.contentWindow
        if (!doc || !win) {
            iframe.remove()
            resolve(false)
            return
        }
        doc.open()
        doc.write(
            `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
                title
            )}</title><style>@page{margin:16mm}html,body{margin:0;background:#fff;color:#111}article{width:auto!important;padding:0!important}img{max-width:100%;height:auto}</style></head><body></body></html>`
        )
        doc.close()
        doc.body.appendChild(doc.importNode(article, true))
        const cleanup = () => {
            iframe.remove()
        }
        win.onafterprint = () => {
            cleanup()
            resolve(true)
        }
        void waitForImages(doc).then(() => {
            window.setTimeout(() => {
                try {
                    win.focus()
                    win.print()
                } catch {
                    cleanup()
                    resolve(false)
                }
            }, 120)
        })
        window.setTimeout(() => {
            if (document.body.contains(iframe)) cleanup()
        }, 120000)
    })
}

/**
 * Download a real text PDF (selectable glyphs, not a JPEG of the article).
 */
export async function exportNotebookAsPdf(notebookId: string): Promise<boolean> {
    const notebook = await getNotebookWithContent(notebookId)
    if (!notebook) return false
    try {
        await writeNotebookPdf(
            notebook.title || 'Untitled Notebook',
            notebook.content || '',
            notebookFilename(notebook.title || 'notebook', 'pdf')
        )
        return true
    } catch {
        return false
    }
}

/** Print the notebook as a paper article (browser can also Save as PDF). */
export async function printNotebook(notebookId: string): Promise<boolean> {
    const notebook = await getNotebookWithContent(notebookId)
    if (!notebook) return false
    const article = buildPrintArticle(notebook.title || 'Untitled Notebook', notebook.content || '')
    await waitForImages(article)
    return printArticle(notebook.title || 'Untitled Notebook', article)
}
