import { upsertAnnotation } from './annotations'
import { isTextBlockNode, stripNotebookRefMarksFromNodes } from './documentModel'
import { applyRefToRange, findPhraseOffsets } from './inlineNotes'
import {
    NotebookAnnotationMap,
    NotebookBlockNode,
    NotebookDocument,
    NotebookInlineNode,
    NotebookListBlockNode,
} from './types'
import { getInlineText, normalizeInlineNodes } from './utils'

export type NotebookTextSpan = {
    nodeId: string
    start: number
    end: number
    listItemIndex?: number
}

type CommentableRun = {
    nodeId: string
    listItemIndex?: number
    text: string
    skip: boolean
}

export function notebookReadableText(nodes: NotebookBlockNode[]): string {
    return collectCommentableRuns(nodes)
        .filter((run) => !run.skip && run.text.trim())
        .map((run) => run.text.trim())
        .join('\n\n')
}

export function collectExistingRefSpans(nodes: NotebookBlockNode[]): NotebookTextSpan[] {
    const spans: NotebookTextSpan[] = []
    for (const run of collectCommentableRuns(nodes)) {
        const children = getRunChildren(nodes, run)
        if (!children) continue
        let offset = 0
        let open: { id: string; start: number } | null = null
        const flush = (end: number): void => {
            if (!open || end <= open.start) {
                open = null
                return
            }
            spans.push({
                nodeId: run.nodeId,
                start: open.start,
                end,
                listItemIndex: run.listItemIndex,
            })
            open = null
        }
        for (const child of children) {
            const length = child.type === 'hardBreak' ? 1 : child.text.length
            const refId = child.type === 'hardBreak' ? null : child.marks?.find((mark) => mark.type === 'ref')?.id || null
            if (refId) {
                if (open && open.id !== refId) flush(offset)
                if (!open) open = { id: refId, start: offset }
            } else if (open) {
                flush(offset)
            }
            offset += length
        }
        if (open) flush(offset)
    }
    return spans
}

export function resolveAutonomousSpan(
    nodes: NotebookBlockNode[],
    phrase: string | undefined,
    used: NotebookTextSpan[],
    salt: string
): NotebookTextSpan | null {
    const fromPhrase = findPhraseSpan(nodes, phrase, used)
    if (fromPhrase) return fromPhrase
    return pickFallbackSpan(nodes, used, salt)
}

export function findPhraseSpan(
    nodes: NotebookBlockNode[],
    phrase: string | undefined,
    used: NotebookTextSpan[]
): NotebookTextSpan | null {
    const needle = (phrase || '').trim()
    if (needle.length < 4) return null
    for (const run of collectCommentableRuns(nodes)) {
        if (run.skip || !run.text.trim()) continue
        let cursor = 0
        let haystack = run.text
        while (cursor < haystack.length) {
            const found = findPhraseOffsets(haystack.slice(cursor), needle)
            if (!found) break
            const span: NotebookTextSpan = {
                nodeId: run.nodeId,
                start: cursor + found.start,
                end: cursor + found.end,
                listItemIndex: run.listItemIndex,
            }
            if (!overlapsAny(span, used)) return span
            cursor += found.end
        }
    }
    return null
}

export function pickFallbackSpan(
    nodes: NotebookBlockNode[],
    used: NotebookTextSpan[],
    salt: string
): NotebookTextSpan | null {
    const candidates: NotebookTextSpan[] = []
    for (const run of collectCommentableRuns(nodes)) {
        if (run.skip || run.text.trim().length < 12) continue
        for (const window of candidateWindows(run.text)) {
            const span: NotebookTextSpan = {
                nodeId: run.nodeId,
                start: window.start,
                end: window.end,
                listItemIndex: run.listItemIndex,
            }
            if (!overlapsAny(span, used)) candidates.push(span)
        }
    }
    if (!candidates.length) return null
    return candidates[hashSalt(salt) % candidates.length] || candidates[0]
}

export function applyRefOnNotebookSpan(
    nodes: NotebookBlockNode[],
    span: NotebookTextSpan,
    refId: string
): NotebookBlockNode[] {
    return nodes.map((node) => {
        if (node.id !== span.nodeId) return node
        if (isTextBlockNode(node)) {
            return {
                ...node,
                children: applyRefToRange(node.children, { start: span.start, end: span.end }, refId),
            }
        }
        if (node.type === 'list' && span.listItemIndex !== undefined) {
            return applyRefOnListItem(node, span.listItemIndex, span, refId)
        }
        return node
    })
}

export function deleteNotebookAnnotation(
    document: NotebookDocument,
    refId: string,
    by?: string
): NotebookDocument {
    const current = document.annotations?.[refId]?.notes || []
    const remaining = by ? current.filter((note) => note.by !== by) : []
    const annotations: NotebookAnnotationMap | undefined = upsertAnnotation(document.annotations, refId, remaining)
    if (remaining.length) {
        return { ...document, annotations }
    }
    return {
        ...document,
        nodes: stripNotebookRefMarksFromNodes(document.nodes, new Set([refId])),
        annotations,
    }
}

export function replaceRefQuotedText(
    nodes: NotebookBlockNode[],
    refId: string,
    nextText: string
): NotebookBlockNode[] {
    const rewrite = (children: NotebookInlineNode[]): NotebookInlineNode[] => {
        const output: NotebookInlineNode[] = []
        let wrote = false
        for (const child of children) {
            const isTarget =
                child.type !== 'hardBreak' && child.marks?.some((mark) => mark.type === 'ref' && mark.id === refId)
            if (!isTarget) {
                output.push(child)
                continue
            }
            if (!wrote) {
                output.push({ type: 'text', text: nextText, marks: child.marks })
                wrote = true
            }
        }
        return wrote ? normalizeInlineNodes(output) : children
    }

    return nodes.map((node) => {
        if (isTextBlockNode(node)) {
            const children = rewrite(node.children)
            return children === node.children ? node : { ...node, children }
        }
        if (node.type === 'list') {
            let changed = false
            const items = node.items.map((item) => {
                const children = rewrite(item.children)
                if (children === item.children) return item
                changed = true
                return { ...item, children }
            })
            return changed ? { ...node, items } : node
        }
        return node
    })
}

export function getRefQuote(nodes: NotebookBlockNode[], refId: string): string {
    const parts: string[] = []
    const visit = (children: NotebookInlineNode[]): void => {
        for (const child of children) {
            if (child.type === 'hardBreak') continue
            if (child.marks?.some((mark) => mark.type === 'ref' && mark.id === refId)) {
                parts.push(child.text)
            }
        }
    }
    for (const node of nodes) {
        if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
            visit(node.children)
        } else if (node.type === 'list') {
            for (const item of node.items) visit(item.children)
        }
    }
    return parts.join('').replace(/\s+/g, ' ').trim()
}

export function spansOverlap(left: NotebookTextSpan, right: NotebookTextSpan): boolean {
    if (left.nodeId !== right.nodeId) return false
    if ((left.listItemIndex ?? -1) !== (right.listItemIndex ?? -1)) return false
    return left.start < right.end && right.start < left.end
}

function applyRefOnListItem(
    node: NotebookListBlockNode,
    itemIndex: number,
    span: NotebookTextSpan,
    refId: string
): NotebookListBlockNode {
    return {
        ...node,
        items: node.items.map((item, index) =>
            index === itemIndex
                ? {
                      ...item,
                      children: applyRefToRange(item.children, { start: span.start, end: span.end }, refId),
                  }
                : item
        ),
    }
}

function collectCommentableRuns(nodes: NotebookBlockNode[]): CommentableRun[] {
    const runs: CommentableRun[] = []
    let sawTitle = false
    for (const node of nodes) {
        if (node.type === 'heading' && !sawTitle) {
            sawTitle = true
            runs.push({
                nodeId: node.id,
                text: getInlineText(node.children),
                skip: true,
            })
            continue
        }
        if (isTextBlockNode(node)) {
            runs.push({
                nodeId: node.id,
                text: getInlineText(node.children),
                skip: false,
            })
            continue
        }
        if (node.type === 'list') {
            node.items.forEach((item, listItemIndex) => {
                runs.push({
                    nodeId: node.id,
                    listItemIndex,
                    text: getInlineText(item.children),
                    skip: false,
                })
            })
        }
    }
    return runs
}

function getRunChildren(nodes: NotebookBlockNode[], run: CommentableRun): NotebookInlineNode[] | null {
    const node = nodes.find((entry) => entry.id === run.nodeId)
    if (!node) return null
    if (isTextBlockNode(node)) return node.children
    if (node.type === 'list' && run.listItemIndex !== undefined) {
        return node.items[run.listItemIndex]?.children || null
    }
    return null
}

function overlapsAny(span: NotebookTextSpan, used: NotebookTextSpan[]): boolean {
    return used.some((entry) => spansOverlap(span, entry))
}

function candidateWindows(text: string): Array<{ start: number; end: number }> {
    const windows: Array<{ start: number; end: number }> = []
    const sentence = /[^.!?\n]+[.!?]?/g
    let match: RegExpExecArray | null = sentence.exec(text)
    while (match) {
        const raw = match[0]
        const leading = raw.match(/^\s*/)?.[0].length ?? 0
        const inner = raw.trim()
        if (inner.length >= 16) {
            windows.push({ start: match.index + leading, end: match.index + leading + inner.length })
        }
        match = sentence.exec(text)
    }
    if (windows.length) return windows

    const words = [...text.matchAll(/\S+/g)]
    if (words.length < 4) {
        const trimmed = text.trim()
        if (trimmed.length >= 12) {
            const start = text.indexOf(trimmed)
            return [{ start, end: start + trimmed.length }]
        }
        return []
    }
    const take = Math.min(8, words.length)
    const start = words[0].index ?? 0
    const last = words[take - 1]
    return [{ start, end: (last.index ?? start) + last[0].length }]
}

function hashSalt(value: string): number {
    let hash = 5381
    for (let index = 0; index < value.length; index++) {
        hash = (hash * 33) ^ value.charCodeAt(index)
    }
    return hash >>> 0
}
