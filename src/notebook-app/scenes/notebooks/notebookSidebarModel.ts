import { parseMarkdownNotebook } from '../../lib/components/MarkdownNotebook/markdown'
import { getNodeText } from '../../lib/components/MarkdownNotebook/utils'
import { isDiscussionCommentNode } from '../../lib/components/MarkdownNotebook/documentModel'
import { parseDiscussionReplies } from '../../lib/components/MarkdownNotebook/discussionComments'
import { scrollToNotebookNode } from './outlineModel'

export type NotebookSearchHit = {
    id: string
    text: string
}

export type NotebookCommentItem = {
    id: string
    author: string
    text: string
    kind: string
    nodeId: string
}

export function extractNotebookSearchHits(markdown: string, query: string, limit = 16): NotebookSearchHit[] {
    const q = query.trim().toLowerCase()
    if (!q || !markdown.trim()) return []
    try {
        const doc = parseMarkdownNotebook(markdown)
        const hits: NotebookSearchHit[] = []
        for (const node of doc.nodes) {
            const text = getNodeText(node).replace(/\s+/g, ' ').trim()
            if (!text) continue
            const index = text.toLowerCase().indexOf(q)
            if (index < 0) continue
            const start = Math.max(0, index - 24)
            const slice = `${start > 0 ? '…' : ''}${text.slice(start, index + q.length + 40)}${
                index + q.length + 40 < text.length ? '…' : ''
            }`
            hits.push({ id: node.id, text: slice })
            if (hits.length >= limit) break
        }
        return hits
    } catch {
        return []
    }
}

export function extractNotebookComments(markdown: string): NotebookCommentItem[] {
    if (!markdown?.trim()) return []
    try {
        const doc = parseMarkdownNotebook(markdown)
        const items: NotebookCommentItem[] = []
        for (const [refId, annotation] of Object.entries(doc.annotations || {})) {
            for (const note of annotation.notes || []) {
                const text = (note.text || '').trim()
                if (!text) continue
                items.push({
                    id: `${refId}-${note.createdAt || note.by || text.slice(0, 12)}`,
                    author: note.name || note.by || 'Someone',
                    text,
                    kind: note.intent || (note.kind === 'bot' ? 'invite' : 'note'),
                    nodeId: refId,
                })
            }
        }
        for (const node of doc.nodes) {
            if (!isDiscussionCommentNode(node) && !(node.type === 'component' && node.tagName === 'Comment')) {
                continue
            }
            const replies = parseDiscussionReplies(node.props.replies)
            if (replies.length === 0) {
                const title = typeof node.props.title === 'string' ? node.props.title : ''
                const body = typeof node.props.body === 'string' ? node.props.body : ''
                const text = (title || body).trim()
                if (text) {
                    items.push({
                        id: node.id,
                        author: 'Comment',
                        text,
                        kind: 'discussion',
                        nodeId: node.id,
                    })
                }
                continue
            }
            for (const reply of replies) {
                if (!reply.text.trim()) continue
                items.push({
                    id: reply.id,
                    author: reply.author,
                    text: reply.text.trim(),
                    kind: 'discussion',
                    nodeId: node.id,
                })
            }
        }
        return items
    } catch {
        return []
    }
}

export function jumpToNotebookHit(nodeId: string, root?: HTMLElement | null): void {
    scrollToNotebookNode(nodeId, root)
}
