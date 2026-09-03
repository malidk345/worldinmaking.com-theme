import { parseMarkdownNotebook } from '../../lib/components/MarkdownNotebook/markdown'
import { getInlineText } from '../../lib/components/MarkdownNotebook/utils'
import type {
    NotebookBlockNode,
    NotebookComponentBlockNode,
    NotebookListItem,
} from '../../lib/components/MarkdownNotebook/types'
import { getNotebook } from './notebookStorage'
import { notebookFilename } from './outlineModel'

const A4_CSS_PX = 794
const PAGE_MARGIN_MM = 12

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
        const tag = (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4')
        const sizes = { 1: '28px', 2: '22px', 3: '18px', 4: '16px' }
        return textEl(tag, getInlineText(node.children), {
            fontSize: sizes[level],
            fontWeight: '700',
            lineHeight: '1.3',
            margin: level === 1 ? '0 0 16px' : '22px 0 10px',
            color: '#111',
        })
    }
    if (node.type === 'paragraph') {
        const text = getInlineText(node.children)
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
        quote.appendChild(textEl('p', getInlineText(node.children), { margin: '0', lineHeight: '1.6' }))
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
            row.appendChild(textEl('span', getInlineText(item.children), { minWidth: '0' }))
            list.appendChild(row)
        })
        return list
    }
    if (node.type === 'code') {
        const pre = textEl('pre', node.text, {
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
        return pre
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
            const th = textEl('th', getInlineText(cell.children), {
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
                const td = textEl('td', getInlineText(cell.children), {
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

async function waitForImages(root: HTMLElement): Promise<void> {
    const images = Array.from(root.querySelectorAll('img'))
    await Promise.all(
        images.map(
            (image) =>
                image.complete
                    ? Promise.resolve()
                    : new Promise<void>((resolve) => {
                          image.onload = () => resolve()
                          image.onerror = () => resolve()
                      })
        )
    )
}

function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

/**
 * Build a real PDF file from notebook markdown and trigger a download.
 * Does not open the print dialog.
 */
export async function exportNotebookAsPdf(notebookId: string): Promise<boolean> {
    const notebook = getNotebook(notebookId)
    if (!notebook) return false

    const [{ default: jsPDF }, { toJpeg }] = await Promise.all([import('jspdf'), import('html-to-image')])

    const host = applyStyles(document.createElement('div'), {
        position: 'fixed',
        left: '0',
        top: '0',
        width: `${A4_CSS_PX}px`,
        background: '#ffffff',
        opacity: '0',
        pointerEvents: 'none',
        zIndex: '-1',
    })
    host.setAttribute('aria-hidden', 'true')
    host.appendChild(buildPrintArticle(notebook.title || 'Untitled Notebook', notebook.content || ''))
    document.body.appendChild(host)

    try {
        await waitForImages(host)
        await nextFrame()
        const capture = (pixelRatio: number) =>
            toJpeg(host, {
                quality: 0.92,
                pixelRatio,
                backgroundColor: '#ffffff',
                skipFonts: true,
                width: A4_CSS_PX,
                style: {
                    opacity: '1',
                    left: '0',
                    top: '0',
                    position: 'static',
                },
            })
        const dataUrl = await capture(2).catch(() => capture(1))
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error('PDF image failed to load'))
            img.src = dataUrl
        })
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const usableWidth = pageWidth - PAGE_MARGIN_MM * 2
        const usableHeight = pageHeight - PAGE_MARGIN_MM * 2
        const imgWidth = usableWidth
        const imgHeight = ((img.naturalHeight || img.height) * imgWidth) / Math.max(img.naturalWidth || img.width, 1)
        let y = PAGE_MARGIN_MM
        let remaining = imgHeight
        pdf.addImage(dataUrl, 'JPEG', PAGE_MARGIN_MM, y, imgWidth, imgHeight, undefined, 'MEDIUM')
        remaining -= usableHeight
        while (remaining > 0.4) {
            y -= usableHeight
            pdf.addPage()
            pdf.addImage(dataUrl, 'JPEG', PAGE_MARGIN_MM, y, imgWidth, imgHeight, undefined, 'MEDIUM')
            remaining -= usableHeight
        }
        pdf.setProperties({
            title: notebook.title || 'Untitled Notebook',
            creator: 'WorldInMaking',
        })
        pdf.save(notebookFilename(notebook.title || 'notebook', 'pdf'))
        return true
    } catch (error) {
        console.error('Error exporting notebook PDF:', error)
        return false
    } finally {
        host.remove()
    }
}
