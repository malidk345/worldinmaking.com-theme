import { parseMarkdownNotebook } from '../../lib/components/MarkdownNotebook/markdown'
import { getNodeText } from '../../lib/components/MarkdownNotebook/utils'

export type OutlineHeading = {
    id: string
    level: 1 | 2 | 3
    text: string
}

/** Extract H1–H3 headings from notebook markdown for the outline panel. */
export function extractOutlineHeadings(markdown: string): OutlineHeading[] {
    if (!markdown?.trim()) return []

    try {
        const doc = parseMarkdownNotebook(markdown)
        const headings: OutlineHeading[] = []

        for (const node of doc.nodes) {
            if (node.type !== 'heading') continue
            const level = (node.level === 2 || node.level === 3 ? node.level : 1) as 1 | 2 | 3
            const text = getNodeText(node).replace(/\s+/g, ' ').trim()
            if (!text) continue
            headings.push({ id: node.id, level, text })
        }

        return headings
    } catch {
        // Fallback: line-based parse if document model fails
        return extractOutlineFromRawMarkdown(markdown)
    }
}

function extractOutlineFromRawMarkdown(markdown: string): OutlineHeading[] {
    const headings: OutlineHeading[] = []
    const lines = markdown.split(/\r?\n/)
    let index = 0

    for (const line of lines) {
        const match = /^(#{1,3})\s+(.+?)\s*$/.exec(line)
        if (!match) continue
        const level = match[1].length as 1 | 2 | 3
        const text = match[2].replace(/#+\s*$/, '').trim()
        if (!text) continue
        headings.push({ id: `outline-line-${index}`, level, text })
        index += 1
    }

    return headings
}

export function scrollToNotebookNode(nodeId: string, root?: HTMLElement | Document | null): boolean {
    const scope: ParentNode = root ?? (typeof document !== 'undefined' ? document : null as any)
    if (!scope || typeof (scope as Document).querySelector !== 'function' && !(scope as Element).querySelector) {
        return false
    }

    const escaped =
        typeof CSS !== 'undefined' && CSS.escape
            ? CSS.escape(nodeId)
            : nodeId.replace(/"/g, '\\"')

    const el = (scope as Document | Element).querySelector(
        `[data-markdown-notebook-node-id="${escaped}"]`
    ) as HTMLElement | null

    if (!el) return false

    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Brief focus ring so the jump is obvious
    el.classList.add('notebook-outline-flash')
    window.setTimeout(() => el.classList.remove('notebook-outline-flash'), 1200)
    return true
}

/** Safe download filename from notebook title. */
export function notebookFilename(title: string, ext: string): string {
    const base = (title || 'notebook')
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80)
    return `${base || 'notebook'}.${ext.replace(/^\./, '')}`
}
