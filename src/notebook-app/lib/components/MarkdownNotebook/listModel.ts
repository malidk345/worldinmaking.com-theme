import type { RestoreInlineSelectionRequest } from './editorTypes'
import { splitInlineNodesAt } from './inlineContent'
import { makeEmptyParagraph, makeListItemId } from './markdown'
import {
    NotebookBlockNode,
    NotebookInlineNode,
    NotebookListBlockNode,
    NotebookListItem,
    NotebookTextBlockNode,
} from './types'
import { getInlineText, normalizeInlineNodes } from './utils'
import { getTaskItemShortcut } from './documentModel'

export type RenderedListItem = NotebookListItem & {
    index: number
    keyPath: string
    childrenItems: RenderedListItem[]
}

export function getListItemRefKey(nodeId: string, itemKey: string | number): string {
    return `${nodeId}:${String(itemKey)}`
}

export function buildRenderedListItems(items: NotebookListItem[]): RenderedListItem[] {
    const rootItems: RenderedListItem[] = []
    const stack: RenderedListItem[] = []

    items.forEach((item, index) => {
        const normalizedDepth = Math.max(0, item.depth)
        while (stack.length && normalizedDepth <= stack[stack.length - 1].depth) {
            stack.pop()
        }

        const parent = stack[stack.length - 1]
        const siblingIndex = parent ? parent.childrenItems.length : rootItems.length
        const renderedItem: RenderedListItem = {
            ...item,
            depth: normalizedDepth,
            index,
            keyPath: parent ? `${parent.keyPath}.${String(siblingIndex)}` : String(siblingIndex),
            childrenItems: [],
        }

        if (parent) {
            parent.childrenItems.push(renderedItem)
        } else {
            rootItems.push(renderedItem)
        }
        stack.push(renderedItem)
    })

    return rootItems
}

export function getOrderedListStart(
    items: NotebookListItem[],
    ordered: boolean,
    fallbackStart?: number
): number | undefined {
    if (!ordered) {
        return undefined
    }

    return items.find((item) => item.depth === 0 && (item.ordered ?? ordered))?.start ?? fallbackStart ?? 1
}

export function normalizeListItemDepths(items: NotebookListItem[]): NotebookListItem[] {
    const minimumDepth = Math.min(...items.map((item) => Math.max(0, item.depth)))
    const baseDepth = Number.isFinite(minimumDepth) ? Math.max(0, minimumDepth) : 0

    // Clamp each item to at most one level deeper than its predecessor, mirroring the parser:
    // deleting a mid-depth item must not leave a deeper survivor orphaned across a depth jump.
    let previousDepth = -1
    return items.map((item) => {
        const depth = Math.min(Math.max(0, item.depth) - baseDepth, previousDepth + 1)
        previousDepth = depth
        return { ...item, depth }
    })
}

/**
 * Builds the nodes that replace a list when one of its items is unwrapped into a paragraph
 * (or quote text when the list is quoted): the items before it stay a list, its children move
 * one depth up, and trailing items become a new list.
 */
export function getListItemParagraphReplacement(
    node: NotebookListBlockNode,
    targetItemIndex: number
): { replacementNodes: NotebookBlockNode[]; paragraphId: string } | null {
    const item = node.items[targetItemIndex]
    if (!item) {
        return null
    }

    const makeListNode = (
        items: NotebookListItem[],
        idSeed: string,
        idOverride?: string
    ): NotebookListBlockNode | null => {
        if (!items.length) {
            return null
        }

        const normalizedItems = normalizeListItemDepths(items)
        const ordered = normalizedItems[0]?.ordered ?? node.ordered
        return {
            ...node,
            id: idOverride ?? makeEmptyParagraph(idSeed).id,
            ordered,
            start: getOrderedListStart(normalizedItems, ordered, node.start),
            items: normalizedItems,
        }
    }

    const subtreeEndIndex = getListItemSubtreeEndIndex(node.items, targetItemIndex)
    const beforeListNode = makeListNode(node.items.slice(0, targetItemIndex), `before-list-${node.id}`, node.id)
    const paragraph: NotebookTextBlockNode = {
        id: beforeListNode ? makeEmptyParagraph(`unlisted-${node.id}`).id : node.id,
        type: node.blockquote ? 'blockquote' : 'paragraph',
        children: item.children,
    }
    const childItems = node.items
        .slice(targetItemIndex + 1, subtreeEndIndex)
        .map((childItem) => ({ ...childItem, depth: Math.max(0, childItem.depth - 1) }))
    const afterListNode = makeListNode([...childItems, ...node.items.slice(subtreeEndIndex)], `after-list-${node.id}`)
    const replacementNodes: NotebookBlockNode[] = []
    if (beforeListNode) {
        replacementNodes.push(beforeListNode)
    }
    replacementNodes.push(paragraph)
    if (afterListNode) {
        replacementNodes.push(afterListNode)
    }

    return { replacementNodes, paragraphId: paragraph.id }
}

export type ListItemSelectionRange = {
    firstItemIndex: number
    firstStart: number
    lastItemIndex: number
    lastEnd: number
}

export type ListItemSelectionDeletion = {
    items: NotebookListItem[]
    caretItemIndex: number
    caretItemId: string | undefined
    caretOffset: number
}

/**
 * Deletes a text selection that lives inside one list block: the first selected item keeps its
 * text before the selection (plus the optional replacement text) and inherits the last selected
 * item's text after it, the items in between are removed, and the caret lands where the
 * selection started. Returns null when the range describes no change.
 */
export function deleteListItemSelectionRange(
    items: NotebookListItem[],
    range: ListItemSelectionRange,
    replacementText: string = ''
): ListItemSelectionDeletion | null {
    const firstItem = items[range.firstItemIndex]
    const lastItem = items[range.lastItemIndex]
    if (!firstItem || !lastItem || range.lastItemIndex < range.firstItemIndex) {
        return null
    }

    const firstTextLength = getInlineText(firstItem.children).length
    const lastTextLength = getInlineText(lastItem.children).length
    const firstStart = Math.max(0, Math.min(range.firstStart, firstTextLength))
    const lastEnd = Math.max(0, Math.min(range.lastEnd, lastTextLength))
    if (range.firstItemIndex === range.lastItemIndex && firstStart >= lastEnd && !replacementText) {
        return null
    }

    const [beforeSelection] = splitInlineNodesAt(firstItem.children, firstStart)
    const [, afterSelection] = splitInlineNodesAt(lastItem.children, lastEnd)
    const insertedChildren: NotebookInlineNode[] = replacementText ? [{ type: 'text', text: replacementText }] : []
    const mergedItem: NotebookListItem = {
        ...firstItem,
        children: normalizeInlineNodes([...beforeSelection, ...insertedChildren, ...afterSelection]),
    }
    const nextItems = normalizeListItemDepths([
        ...items.slice(0, range.firstItemIndex),
        mergedItem,
        ...items.slice(range.lastItemIndex + 1),
    ])

    return {
        items: nextItems,
        caretItemIndex: range.firstItemIndex,
        caretItemId: mergedItem.id,
        caretOffset: getInlineText(beforeSelection).length + replacementText.length,
    }
}

/** Shifts a list item and its subtree one depth step in or out, or returns null when the shift is not allowed. */
export function shiftListItemSubtreeDepth(
    items: NotebookListItem[],
    itemIndex: number,
    direction: 'in' | 'out',
    listOrdered: boolean
): NotebookListItem[] | null {
    const item = items[itemIndex]
    if (!item) {
        return null
    }

    const maximumDepth = itemIndex === 0 ? 0 : items[itemIndex - 1].depth + 1
    const nextDepth = direction === 'in' ? Math.min(item.depth + 1, maximumDepth) : Math.max(0, item.depth - 1)
    const depthDelta = nextDepth - item.depth
    if (depthDelta === 0) {
        return null
    }

    const subtreeEndIndex = getListItemSubtreeEndIndex(items, itemIndex)
    return items.map((currentItem, index) => {
        if (index < itemIndex || index >= subtreeEndIndex) {
            return currentItem
        }

        const nextItem = { ...currentItem, depth: Math.max(0, currentItem.depth + depthDelta) }
        if (index === itemIndex && depthDelta > 0 && (nextItem.ordered ?? listOrdered)) {
            return { ...nextItem, start: undefined }
        }

        return nextItem
    })
}

export function getListItemSubtreeEndIndex(items: NotebookListItem[], itemIndex: number): number {
    const item = items[itemIndex]
    if (!item) {
        return itemIndex
    }

    let nextIndex = itemIndex + 1
    while (nextIndex < items.length && items[nextIndex].depth > item.depth) {
        nextIndex += 1
    }
    return nextIndex
}

export function getListItemIndex(items: NotebookListItem[], fallbackIndex: number, itemId?: string): number {
    if (itemId) {
        const itemIndex = items.findIndex((item) => item.id === itemId)
        if (itemIndex !== -1) {
            return itemIndex
        }
    }

    return fallbackIndex
}

export type ListEditPlan = {
    kind: 'outdent' | 'unwrap' | 'split'
    items?: NotebookListItem[]
    replacementNodes?: NotebookBlockNode[]
    focus: RestoreInlineSelectionRequest
}

function planUnwrapOrOutdentListItem(node: NotebookListBlockNode, targetItemIndex: number): ListEditPlan | null {
    const item = node.items[targetItemIndex]
    if (!item) {
        return null
    }

    if (item.depth > 0) {
        const nextItems = shiftListItemSubtreeDepth(node.items, targetItemIndex, 'out', node.ordered)
        if (!nextItems) {
            return null
        }
        return {
            kind: 'outdent',
            items: nextItems,
            focus: {
                nodeId: node.id,
                listItemIndex: targetItemIndex,
                listItemId: item.id,
                start: 0,
                end: 0,
            },
        }
    }

    const replacement = getListItemParagraphReplacement(node, targetItemIndex)
    if (!replacement) {
        return null
    }
    return {
        kind: 'unwrap',
        replacementNodes: replacement.replacementNodes,
        focus: { nodeId: replacement.paragraphId, start: 0, end: 0 },
    }
}

export function planSplitListItem(
    node: NotebookListBlockNode,
    targetItemIndex: number,
    selectionStart: number,
    selectionEnd: number
): ListEditPlan | null {
    const item = node.items[targetItemIndex]
    if (!item) {
        return null
    }

    const textLength = getInlineText(item.children).length
    const start = Math.max(0, Math.min(selectionStart, textLength))
    const end = Math.max(start, Math.min(selectionEnd, textLength))

    if (!textLength && start === 0 && end === 0) {
        return planUnwrapOrOutdentListItem(node, targetItemIndex)
    }

    const [before, selectionAndAfter] = splitInlineNodesAt(item.children, start)
    const [, after] = splitInlineNodesAt(selectionAndAfter, end - start)
    const nextItem: NotebookListItem = {
        id: makeListItemId(`split-${node.id}-${item.id ?? String(targetItemIndex)}`),
        children: after,
        depth: item.depth,
        ordered: item.ordered ?? node.ordered,
        checked: item.checked !== undefined ? false : undefined,
    }
    const nextItems = [...node.items]
    nextItems[targetItemIndex] = { ...item, children: before }
    nextItems.splice(targetItemIndex + 1, 0, nextItem)
    return {
        kind: 'split',
        items: nextItems,
        focus: {
            nodeId: node.id,
            listItemIndex: targetItemIndex + 1,
            listItemId: nextItem.id,
            start: 0,
            end: 0,
        },
    }
}

export function planDeleteListItemAtStart(
    node: NotebookListBlockNode,
    targetItemIndex: number,
    direction: 'backward' | 'forward'
): ListEditPlan | null {
    const item = node.items[targetItemIndex]
    if (!item) {
        return null
    }
    if (direction === 'forward' && getInlineText(item.children).length) {
        return null
    }
    return planUnwrapOrOutdentListItem(node, targetItemIndex)
}

export type ListItemTaskShortcutPlan = {
    items: NotebookListItem[]
    focus: RestoreInlineSelectionRequest
}

/**
 * When a bullet item's text starts with a GFM task marker (`[ ] ` / `[x] `),
 * convert that item into a task and restore the caret after the stripped marker.
 * Shared by EditableListBlock input and MarkdownNotebook list edits.
 */
export function planApplyListItemTaskShortcut(
    node: NotebookListBlockNode,
    itemIndex: number,
    itemId: string | undefined,
    children: NotebookInlineNode[],
    caretStart: number | null
): ListItemTaskShortcutPlan | null {
    const targetItemIndex = getListItemIndex(node.items, itemIndex, itemId)
    const item = node.items[targetItemIndex]
    if (!item || item.checked !== undefined || (item.ordered ?? node.ordered)) {
        return null
    }

    const taskShortcut = getTaskItemShortcut(children)
    if (!taskShortcut) {
        return null
    }

    const caretOffset = Math.max(0, (caretStart ?? taskShortcut.markerLength) - taskShortcut.markerLength)
    const nextItems = node.items.map((currentItem, index) =>
        index === targetItemIndex
            ? { ...currentItem, checked: taskShortcut.checked, children: taskShortcut.children }
            : currentItem
    )

    return {
        items: nextItems,
        focus: {
            nodeId: node.id,
            listItemIndex: targetItemIndex,
            listItemId: item.id,
            start: caretOffset,
            end: caretOffset,
        },
    }
}

export type ListItemChildrenUpdatePlan = {
    items: NotebookListItem[]
}

/**
 * Replace one list item's inline children (lookup by index + optional id).
 * Shared by EditableListBlock input and MarkdownNotebook list edits.
 */
export function planUpdateListItemChildren(
    node: NotebookListBlockNode,
    itemIndex: number,
    itemId: string | undefined,
    children: NotebookInlineNode[]
): ListItemChildrenUpdatePlan | null {
    const targetItemIndex = getListItemIndex(node.items, itemIndex, itemId)
    if (!node.items[targetItemIndex]) {
        return null
    }

    return {
        items: node.items.map((item, index) =>
            index === targetItemIndex ? { ...item, children } : item
        ),
    }
}
