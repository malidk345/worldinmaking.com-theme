import React, { useState, useCallback } from 'react'
import {
    NotebookBlockNode,
    NotebookDocument,
    NotebookInlineNode,
} from './types'
import { isTextBlockNode } from './documentModel'
import {
    getInlineText,
    normalizeInlineNodes,
} from './utils'
import { splitInlineNodesAt, removeFootnoteFromInlineNodes } from './inlineContent'
import { FootnotePopover } from './FootnotePopover'
import {
    FloatingToolbarPosition,
    FloatingToolbarState,
} from './editorTypes'

export function collectFootnoteIdsFromNodes(nodes: NotebookBlockNode[]): string[] {
    const list: string[] = []
    const seen = new Set<string>()
    const visitInline = (children: NotebookInlineNode[]): void => {
        for (const child of children) {
            if (child.type === 'hardBreak') continue
            for (const mark of child.marks || []) {
                if (mark.type === 'footnote' && mark.id && !seen.has(mark.id)) {
                    seen.add(mark.id)
                    list.push(mark.id)
                }
            }
        }
    }
    for (const node of nodes) {
        if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
            visitInline(node.children)
        } else if (node.type === 'list') {
            for (const item of node.items) visitInline(item.children)
        } else if (node.type === 'table') {
            for (const cell of node.headers) visitInline(cell.children)
            for (const row of node.rows) {
                for (const cell of row) visitInline(cell.children)
            }
        }
    }
    return list
}

export interface UseNotebookFootnotesProps {
    documentRef: React.MutableRefObject<NotebookDocument>
    commitDocument: (document: NotebookDocument) => void
    floatingToolbar: FloatingToolbarState | null
    focusedNodeId: string | null
    renderedNodes: NotebookBlockNode[]
    clampOverlayPosition: (rect: { top: number; bottom: number; left: number }) => {
        top: number
        left: number
    }
    clearInsertMenu: () => void
    setFloatingToolbar: (toolbar: FloatingToolbarState | null) => void
    floatingToolbarPositionLockRef: React.MutableRefObject<FloatingToolbarPosition | null>
    insertMenuQuery?: string
}

export interface ActiveFootnotePopoverState {
    id: string
    number: number
    text: string
    top: number
    left: number
}

export function useNotebookFootnotes({
    documentRef,
    commitDocument,
    floatingToolbar,
    focusedNodeId,
    renderedNodes,
    clampOverlayPosition,
    clearInsertMenu,
    setFloatingToolbar,
    floatingToolbarPositionLockRef,
    insertMenuQuery,
}: UseNotebookFootnotesProps) {
    const [activeFootnotePopover, setActiveFootnotePopover] =
        useState<ActiveFootnotePopoverState | null>(null)

    const openFootnotePopoverForElement = useCallback(
        (footnoteEl: HTMLElement) => {
            const fnId = footnoteEl.getAttribute('data-notebook-footnote') || ''
            if (!fnId) return
            const rect = footnoteEl.getBoundingClientRect()
            const overlay = clampOverlayPosition(rect)
            const orderedIds = collectFootnoteIdsFromNodes(documentRef.current.nodes)
            const num = orderedIds.indexOf(fnId) !== -1 ? orderedIds.indexOf(fnId) + 1 : 1
            setActiveFootnotePopover({
                id: fnId,
                number: typeof num === 'number' ? num : 1,
                text: documentRef.current.footnotes?.[fnId] || '',
                top: overlay.top,
                left: overlay.left,
            })
        },
        [clampOverlayPosition, documentRef]
    )

    const addFootnoteAtTarget = useCallback(
        (explicitTargetNodeId?: string): void => {
            const textRange = floatingToolbar?.textRanges?.[0]
            const listRange = floatingToolbar?.listItemRanges?.[0]
            let targetNodeId =
                explicitTargetNodeId ||
                textRange?.node.id ||
                listRange?.node.id ||
                focusedNodeId ||
                renderedNodes[0]?.id
            if (!targetNodeId) return

            let currentDocument = documentRef.current
            let nodes = [...currentDocument.nodes]
            let targetIndex = nodes.findIndex((n) => n.id === targetNodeId)
            if (targetIndex === -1) return

            // If targetNodeId was a detached slash command block from an eager split, merge back
            if (targetNodeId.startsWith('slash-command-') && targetIndex > 0) {
                const prev = nodes[targetIndex - 1]
                const next = nodes[targetIndex + 1]
                if (prev && isTextBlockNode(prev)) {
                    const isNextSplit =
                        next && isTextBlockNode(next) && next.id.startsWith('after-slash-command-')
                    const rejoinedChildren = normalizeInlineNodes([
                        ...prev.children,
                        ...(isNextSplit ? next.children : []),
                    ])
                    nodes = nodes.filter(
                        (_, idx) => idx !== targetIndex && !(isNextSplit && idx === targetIndex + 1)
                    )
                    nodes = nodes.map((n) =>
                        n.id === prev.id ? { ...prev, children: rejoinedChildren } : n
                    )
                    targetNodeId = prev.id
                    targetIndex = nodes.findIndex((n) => n.id === prev.id)
                } else if (prev && prev.type === 'list' && prev.items.length > 0) {
                    const lastItemIdx = prev.items.length - 1
                    const nextList =
                        next && next.type === 'list' && next.id.startsWith('after-slash-list-')
                            ? next
                            : null
                    const updatedItems = prev.items.map((it, idx) =>
                        idx === lastItemIdx
                            ? { ...it, children: normalizeInlineNodes([...it.children]) }
                            : it
                    )
                    if (nextList) {
                        updatedItems.push(...nextList.items)
                    }
                    nodes = nodes.filter(
                        (_, idx) => idx !== targetIndex && !(nextList && idx === targetIndex + 1)
                    )
                    nodes = nodes.map((n) => (n.id === prev.id ? { ...prev, items: updatedItems } : n))
                    targetNodeId = prev.id
                    targetIndex = nodes.findIndex((n) => n.id === prev.id)
                }
            }

            const node = nodes[targetIndex]
            if (!node || node.type === 'component' || node.type === 'divider') return

            const orderedIds = collectFootnoteIdsFromNodes(nodes)
            let nextNum = 1
            while (
                orderedIds.includes(String(nextNum)) ||
                (currentDocument.footnotes &&
                    currentDocument.footnotes[String(nextNum)] !== undefined)
            ) {
                nextNum++
            }
            const nextId = String(nextNum)

            const footnoteNode: NotebookInlineNode = {
                type: 'text',
                text: nextId,
                marks: [{ type: 'footnote', id: nextId }],
            }

            if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
                const fullText = getInlineText(node.children)
                let insertionOffset = fullText.length
                let stripLength = 0

                const slashIdx = fullText.lastIndexOf('/')
                if (slashIdx !== -1) {
                    insertionOffset = slashIdx
                    stripLength = fullText.length - slashIdx
                    if (insertionOffset > 0 && fullText[insertionOffset - 1] === ' ') {
                        insertionOffset -= 1
                        stripLength += 1
                    }
                } else if (insertMenuQuery && fullText.endsWith(insertMenuQuery)) {
                    insertionOffset = fullText.length - insertMenuQuery.length
                    stripLength = insertMenuQuery.length
                    if (insertionOffset > 0 && fullText[insertionOffset - 1] === ' ') {
                        insertionOffset -= 1
                        stripLength += 1
                    }
                } else if (textRange && textRange.node.id === node.id) {
                    insertionOffset = Math.max(textRange.range.start, textRange.range.end)
                    stripLength = 0
                }

                const [beforeNodes, afterWithSlash] = splitInlineNodesAt(node.children, insertionOffset)
                const [, afterNodes] = splitInlineNodesAt(afterWithSlash, stripLength)
                const updatedChildren = normalizeInlineNodes([...beforeNodes, footnoteNode, ...afterNodes])
                nodes = nodes.map((n) => (n.id === node.id ? { ...n, children: updatedChildren } : n))
            } else if (node.type === 'list' && node.items.length) {
                const itemIndex =
                    listRange && listRange.node.id === targetNodeId
                        ? listRange.itemIndex
                        : node.items.length - 1
                const item = node.items[itemIndex]
                if (item) {
                    const fullText = getInlineText(item.children)
                    let insertionOffset = fullText.length
                    let stripLength = 0

                    const slashIdx = fullText.lastIndexOf('/')
                    if (slashIdx !== -1) {
                        insertionOffset = slashIdx
                        stripLength = fullText.length - slashIdx
                        if (insertionOffset > 0 && fullText[insertionOffset - 1] === ' ') {
                            insertionOffset -= 1
                            stripLength += 1
                        }
                    } else if (insertMenuQuery && fullText.endsWith(insertMenuQuery)) {
                        insertionOffset = fullText.length - insertMenuQuery.length
                        stripLength = insertMenuQuery.length
                        if (insertionOffset > 0 && fullText[insertionOffset - 1] === ' ') {
                            insertionOffset -= 1
                            stripLength += 1
                        }
                    } else if (listRange && listRange.node.id === node.id) {
                        insertionOffset = Math.max(listRange.range.start, listRange.range.end)
                        stripLength = 0
                    }

                    const [beforeNodes, afterWithSlash] = splitInlineNodesAt(item.children, insertionOffset)
                    const [, afterNodes] = splitInlineNodesAt(afterWithSlash, stripLength)
                    const updatedItemChildren = normalizeInlineNodes([
                        ...beforeNodes,
                        footnoteNode,
                        ...afterNodes,
                    ])
                    const updatedItems = node.items.map((it, idx) =>
                        idx === itemIndex ? { ...it, children: updatedItemChildren } : it
                    )
                    nodes = nodes.map((n) => (n.id === node.id ? { ...n, items: updatedItems } : n))
                }
            }

            const nextFootnotes = { ...(currentDocument.footnotes || {}), [nextId]: '' }
            commitDocument({
                ...currentDocument,
                nodes,
                footnotes: nextFootnotes,
            })
            floatingToolbarPositionLockRef.current = null
            setFloatingToolbar(null)
            clearInsertMenu()

            setTimeout(() => {
                const footnoteEl = window.document.querySelector(
                    `[data-notebook-footnote="${nextId}"]`
                ) as HTMLElement | null
                const rect = footnoteEl?.getBoundingClientRect() || {
                    top: 250,
                    bottom: 250,
                    left: 250,
                }
                const overlay = clampOverlayPosition(rect)
                setActiveFootnotePopover({
                    id: nextId,
                    number: nextNum,
                    text: '',
                    top: overlay.top,
                    left: overlay.left,
                })
            }, 60)
        },
        [
            clampOverlayPosition,
            clearInsertMenu,
            commitDocument,
            documentRef,
            floatingToolbar,
            floatingToolbarPositionLockRef,
            focusedNodeId,
            insertMenuQuery,
            renderedNodes,
            setFloatingToolbar,
        ]
    )

    const saveFootnote = useCallback(
        (id: string, text: string) => {
            commitDocument({
                ...documentRef.current,
                footnotes: {
                    ...(documentRef.current.footnotes || {}),
                    [id]: text.trim(),
                },
            })
            setActiveFootnotePopover(null)
        },
        [commitDocument, documentRef]
    )

    const closeFootnotePopover = useCallback(() => {
        const current = activeFootnotePopover
        if (current && current.text.trim() !== (documentRef.current.footnotes?.[current.id] || '')) {
            commitDocument({
                ...documentRef.current,
                footnotes: {
                    ...(documentRef.current.footnotes || {}),
                    [current.id]: current.text.trim(),
                },
            })
        }
        setActiveFootnotePopover(null)
    }, [activeFootnotePopover, commitDocument, documentRef])

    const deleteFootnote = useCallback(
        (id: string) => {
            const nextFootnotes = { ...(documentRef.current.footnotes || {}) }
            delete nextFootnotes[id]
            const nextNodes = documentRef.current.nodes.map((node) => {
                if (
                    node.type === 'paragraph' ||
                    node.type === 'heading' ||
                    node.type === 'blockquote'
                ) {
                    return {
                        ...node,
                        children: removeFootnoteFromInlineNodes(node.children, id),
                    }
                }
                if (node.type === 'list') {
                    return {
                        ...node,
                        items: node.items.map((item) => ({
                            ...item,
                            children: removeFootnoteFromInlineNodes(item.children, id),
                        })),
                    }
                }
                return node
            })
            commitDocument({
                ...documentRef.current,
                nodes: nextNodes,
                footnotes: Object.keys(nextFootnotes).length ? nextFootnotes : undefined,
            })
            setActiveFootnotePopover(null)
        },
        [commitDocument, documentRef]
    )

    const renderFootnotePopover = useCallback(() => {
        if (!activeFootnotePopover) return null
        return React.createElement(FootnotePopover, {
            id: activeFootnotePopover.id,
            number: activeFootnotePopover.number,
            text: activeFootnotePopover.text,
            top: activeFootnotePopover.top,
            left: activeFootnotePopover.left,
            onChangeText: (val: string) =>
                setActiveFootnotePopover((cur) => (cur ? { ...cur, text: val } : cur)),
            onSave: () => saveFootnote(activeFootnotePopover.id, activeFootnotePopover.text),
            onClose: closeFootnotePopover,
            onDelete: () => deleteFootnote(activeFootnotePopover.id),
        })
    }, [activeFootnotePopover, closeFootnotePopover, deleteFootnote, saveFootnote])

    const renderDocumentFootnotesSection = useCallback(() => {
        const docFootnotes = documentRef.current.footnotes
        const footnoteEntries = Object.entries(docFootnotes || {})
        if (!footnoteEntries.length) return null

        const orderedFootnoteIds = collectFootnoteIdsFromNodes(documentRef.current.nodes)
        const sortedEntries = [...footnoteEntries].sort(([aId], [bId]) => {
            const aIdx = orderedFootnoteIds.indexOf(aId)
            const bIdx = orderedFootnoteIds.indexOf(bId)
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
            if (aIdx !== -1) return -1
            if (bIdx !== -1) return 1
            return aId.localeCompare(bId)
        })

        return React.createElement(
            'section',
            {
                className:
                    'MarkdownNotebook__footnotes-section mt-12 pt-6 border-t border-border/40 text-xs text-secondary selection:bg-primary/20',
                contentEditable: false,
                'aria-label': 'Footnotes',
            },
            React.createElement(
                'h4',
                {
                    className:
                        'text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5',
                },
                React.createElement('span', null, 'Footnotes'),
                React.createElement(
                    'span',
                    { className: 'text-[10px] font-mono px-1 py-0.5 rounded bg-muted/20' },
                    sortedEntries.length
                )
            ),
            React.createElement(
                'ol',
                { className: 'space-y-2 list-none p-0 m-0' },
                sortedEntries.map(([fnId, fnText], idx) =>
                    React.createElement(
                        'li',
                        {
                            key: fnId,
                            className:
                                'flex items-start gap-2 group hover:bg-muted/10 p-1 rounded transition-colors',
                        },
                        React.createElement(
                            'span',
                            {
                                className:
                                    'font-semibold text-primary select-none w-5 text-right flex-shrink-0',
                            },
                            `${idx + 1}.`
                        ),
                        React.createElement(
                            'div',
                            { className: 'flex-1 text-secondary leading-relaxed break-words' },
                            fnText ||
                                React.createElement(
                                    'span',
                                    { className: 'italic text-muted/60' },
                                    '(Empty footnote)'
                                )
                        ),
                        React.createElement(
                            'div',
                            {
                                className:
                                    'flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity',
                            },
                            React.createElement(
                                'button',
                                {
                                    type: 'button',
                                    onClick: () => {
                                        const badge = window.document.querySelector(
                                            `[data-notebook-footnote="${fnId}"]`
                                        ) as HTMLElement | null
                                        if (badge) {
                                            badge.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'center',
                                            })
                                            const rect = badge.getBoundingClientRect()
                                            const overlay = clampOverlayPosition(rect)
                                            setActiveFootnotePopover({
                                                id: fnId,
                                                number: idx + 1,
                                                text: String(fnText || ''),
                                                top: overlay.top,
                                                left: overlay.left,
                                            })
                                        }
                                    },
                                    className:
                                        'text-xs text-muted hover:text-primary p-1 rounded transition-colors',
                                    title: 'Edit footnote',
                                },
                                '?'
                            ),
                            React.createElement(
                                'button',
                                {
                                    type: 'button',
                                    onClick: () => {
                                        const badge = window.document.querySelector(
                                            `[data-notebook-footnote="${fnId}"]`
                                        ) as HTMLElement | null
                                        if (badge) {
                                            badge.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'center',
                                            })
                                            badge.classList.add('MarkdownNotebook__footnote--highlight')
                                            setTimeout(
                                                () =>
                                                    badge.classList.remove(
                                                        'MarkdownNotebook__footnote--highlight'
                                                    ),
                                                1500
                                            )
                                        }
                                    },
                                    className:
                                        'text-xs text-muted hover:text-blue-500 p-1 rounded transition-colors',
                                    title: 'Back to text',
                                },
                                '?'
                            )
                        )
                    )
                )
            )
        )
    }, [clampOverlayPosition, documentRef])

    return {
        activeFootnotePopover,
        setActiveFootnotePopover,
        openFootnotePopoverForElement,
        addFootnoteAtTarget,
        saveFootnote,
        deleteFootnote,
        closeFootnotePopover,
        renderFootnotePopover,
        renderDocumentFootnotesSection,
    }
}
