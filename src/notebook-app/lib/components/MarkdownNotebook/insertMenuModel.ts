import {
    collectSlashSplitNodes,
    getSlashCommandQuery,
    getSlashTokenAt,
    isTextBlockNode,
    isTextGroupNode,
    mergeDetachedSlashMenuBack,
    slashMenuRestoreText,
    splitListItemAtSlashToken,
    splitTextBlockAtSlashToken,
} from './documentModel'
import type { InsertMenuState, RestoreInlineSelectionRequest } from './editorTypes'
import { splitInlineNodesAt } from './inlineContent'
import { makeEmptyParagraph, makeListItemId } from './markdown'
import type {
    NotebookBlockNode,
    NotebookInlineNode,
    NotebookListBlockNode,
    NotebookTextBlockNode,
} from './types'
import { getInlineText, normalizeInlineNodes } from './utils'

export function nextOpenInsertMenuState(
    currentMenu: InsertMenuState | null,
    nodeId: string,
    query: string
): InsertMenuState {
    const sameNode = currentMenu?.nodeId === nodeId
    return {
        nodeId,
        query,
        selectedIndex: sameNode && currentMenu.query === query ? currentMenu.selectedIndex : 0,
        mode: sameNode && currentMenu.mode === 'ai' ? 'ai' : 'tools',
        detached: sameNode ? currentMenu.detached : undefined,
        removeNodeOnClose: sameNode ? currentMenu.removeNodeOnClose : undefined,
        rejoinNodeIdOnClose: sameNode ? currentMenu.rejoinNodeIdOnClose : undefined,
        source: sameNode ? currentMenu.source : undefined,
    }
}

export function nextBeginSlashInsertMenuState(
    currentMenu: InsertMenuState | null,
    nodeId: string,
    query: string,
    options?: { detached?: boolean }
): InsertMenuState {
    return {
        nodeId,
        query,
        selectedIndex: 0,
        mode: 'tools',
        detached: options?.detached ?? (currentMenu?.nodeId === nodeId ? currentMenu.detached : undefined),
        removeNodeOnClose: currentMenu?.nodeId === nodeId ? currentMenu.removeNodeOnClose : undefined,
        rejoinNodeIdOnClose: currentMenu?.nodeId === nodeId ? currentMenu.rejoinNodeIdOnClose : undefined,
        source: 'slash',
    }
}

export type BoundaryInsertPlan = {
    nodes: NotebookBlockNode[]
    insertedId: string
    rejoinNodeIdOnClose?: string
}

export function planInsertAtBoundary(nodes: NotebookBlockNode[], boundaryIndex: number): BoundaryInsertPlan | null {
    if (boundaryIndex <= 0) {
        return null
    }

    const insertedNode: NotebookTextBlockNode = {
        ...makeEmptyParagraph(`boundary-${String(boundaryIndex)}`),
        startsGroup: true,
    }
    const clampedBoundaryIndex = Math.max(1, Math.min(boundaryIndex, nodes.length))
    const followingNode = nodes[clampedBoundaryIndex]
    const rejoinNodeIdOnClose =
        followingNode && isTextGroupNode(followingNode) && !followingNode.startsGroup ? followingNode.id : undefined

    return {
        insertedId: insertedNode.id,
        rejoinNodeIdOnClose,
        nodes: [
            ...nodes.slice(0, clampedBoundaryIndex),
            insertedNode,
            ...nodes
                .slice(clampedBoundaryIndex)
                .map((node) => (node.id === rejoinNodeIdOnClose ? { ...node, startsGroup: true } : node)),
        ],
    }
}

export function planRemoveTemporaryInsertNode(
    nodes: NotebookBlockNode[],
    menu: InsertMenuState
): NotebookBlockNode[] | null {
    if (!menu.removeNodeOnClose) {
        return null
    }

    const nodeIndex = nodes.findIndex((node) => node.id === menu.nodeId)
    const node = nodes[nodeIndex]
    if (!node || !isTextBlockNode(node)) {
        return null
    }

    return nodes
        .filter((_, index) => index !== nodeIndex)
        .map((entry) => (entry.id === menu.rejoinNodeIdOnClose ? { ...entry, startsGroup: undefined } : entry))
}

export type SlashDismissPlan = {
    nodes: NotebookBlockNode[]
    focus: { nodeId: string; offset: number }
    removedNodeId?: string
}

export function planDismissSlashMenu(nodes: NotebookBlockNode[], menu: InsertMenuState): SlashDismissPlan | null {
    if (menu.source !== 'slash' || (menu.mode !== undefined && menu.mode !== 'tools')) {
        return null
    }

    if (menu.detached) {
        const restored = mergeDetachedSlashMenuBack(nodes, menu.nodeId, menu.query)
        if (restored) {
            return { ...restored, removedNodeId: menu.nodeId }
        }
    }

    const node = nodes.find((candidate) => candidate.id === menu.nodeId)
    if (!node || !isTextBlockNode(node)) {
        return null
    }

    const restoredText = slashMenuRestoreText(menu.query)
    return {
        nodes: nodes.map((candidate) =>
            candidate.id === node.id ? { ...node, children: [{ type: 'text', text: restoredText }] } : candidate
        ),
        focus: { nodeId: node.id, offset: restoredText.length },
    }
}

export type SlashInsertPlan = {
    replacementNodes: NotebookBlockNode[]
    commandNodeId: string
    query?: string
}

/** `/` is not in the document yet (beforeinput cancelled it). Split at the caret. */
export function planSlashInsertAtTextCaret(
    node: NotebookTextBlockNode,
    selectionStart: number,
    selectionEnd: number,
    query: string
): SlashInsertPlan {
    const [before, selectionAndAfter] = splitInlineNodesAt(node.children, selectionStart)
    const [, after] = splitInlineNodesAt(selectionAndAfter, Math.max(0, selectionEnd - selectionStart))
    const commandNode = makeEmptyParagraph(`slash-command-${node.id}`)
    commandNode.children = query ? [{ type: 'text', text: query }] : []
    const replacementNodes: NotebookBlockNode[] = []
    if (getInlineText(before).length > 0) {
        replacementNodes.push({ ...node, children: normalizeInlineNodes(before) })
    }
    replacementNodes.push(commandNode)
    if (getInlineText(after).length > 0) {
        replacementNodes.push({
            ...node,
            id: makeEmptyParagraph(`after-slash-command-${node.id}`).id,
            children: normalizeInlineNodes(after),
        })
    }
    return { replacementNodes, commandNodeId: commandNode.id }
}

export function planSlashInsertAtListCaret(
    node: NotebookListBlockNode,
    itemIndex: number,
    selectionStart: number,
    selectionEnd: number,
    query: string
): SlashInsertPlan | null {
    const item = node.items[itemIndex]
    if (!item) {
        return null
    }

    const [before, selectionAndAfter] = splitInlineNodesAt(item.children, selectionStart)
    const [, after] = splitInlineNodesAt(selectionAndAfter, Math.max(0, selectionEnd - selectionStart))
    const commandNode = makeEmptyParagraph(`slash-command-${node.id}`)
    commandNode.children = query ? [{ type: 'text', text: query }] : []

    const beforeItems = node.items.slice(0, itemIndex)
    if (getInlineText(before).length > 0) {
        beforeItems.push({ ...item, children: normalizeInlineNodes(before) })
    }
    const afterItems = [...node.items.slice(itemIndex + 1)]
    if (getInlineText(after).length > 0) {
        afterItems.unshift({
            ...item,
            id: makeListItemId(`after-slash-${item.id ?? String(itemIndex)}`),
            children: normalizeInlineNodes(after),
        })
    }

    const replacementNodes: NotebookBlockNode[] = []
    if (beforeItems.length) {
        replacementNodes.push({ ...node, items: beforeItems })
    }
    replacementNodes.push(commandNode)
    if (afterItems.length) {
        replacementNodes.push({
            ...node,
            id: makeEmptyParagraph(`after-slash-list-${node.id}`).id,
            items: afterItems,
        })
    }
    return { replacementNodes, commandNodeId: commandNode.id }
}

export type TypedSlashPlan =
    | { type: 'same-node'; query: string; children: NotebookInlineNode[] }
    | { type: 'split'; query: string; nodes: NotebookBlockNode[]; commandId: string }

/** `/query` is already in the text (onInput fallback). */
export function planTextBlockTypedSlash(
    node: NotebookTextBlockNode,
    nodeIndex: number,
    children: NotebookInlineNode[],
    caret: number,
    insertMenuNodeId?: string
): TypedSlashPlan | null {
    if (insertMenuNodeId === node.id || nodeIndex <= 0) {
        return null
    }

    const nextText = getInlineText(children)
    const slashToken = getSlashTokenAt(nextText, caret)
    if (!slashToken) {
        return null
    }

    const slashQuery = getSlashCommandQuery(nextText)
    if (slashToken.start === 0 && slashQuery !== null) {
        const queryChildren: NotebookInlineNode[] = slashQuery ? [{ type: 'text', text: slashQuery }] : []
        return { type: 'same-node', query: slashQuery, children: queryChildren }
    }

    const parts = splitTextBlockAtSlashToken(node, children, slashToken)
    return {
        type: 'split',
        query: slashToken.query,
        nodes: collectSlashSplitNodes(parts),
        commandId: parts.command.id,
    }
}

export function planListItemTypedSlash(
    node: NotebookListBlockNode,
    itemIndex: number,
    children: NotebookInlineNode[],
    caret: number,
    insertMenuNodeId?: string
): SlashInsertPlan | null {
    if (insertMenuNodeId === node.id || !node.items[itemIndex]) {
        return null
    }

    const nextText = getInlineText(children)
    const slashToken = getSlashTokenAt(nextText, caret)
    if (!slashToken) {
        return null
    }

    const { replacementNodes, commandNodeId } = splitListItemAtSlashToken(node, itemIndex, children, slashToken)
    return { replacementNodes, commandNodeId, query: slashToken.query }
}

export function planSplitTextBlock(
    node: NotebookTextBlockNode,
    nodeIndex: number,
    selectionStart: number,
    selectionEnd: number
): { replacementNodes: NotebookBlockNode[]; focus: RestoreInlineSelectionRequest } {
    const [before, selectionAndAfter] = splitInlineNodesAt(node.children, selectionStart)
    const [, after] = splitInlineNodesAt(selectionAndAfter, Math.max(0, selectionEnd - selectionStart))

    if (nodeIndex === 0) {
        const nextParagraph = makeEmptyParagraph(`after-title-${node.id}`)
        nextParagraph.children = after
        return {
            replacementNodes: [{ ...node, type: 'heading', level: 1, children: before }, nextParagraph],
            focus: { nodeId: nextParagraph.id, start: 0, end: 0 },
        }
    }

    if (node.type === 'heading' || node.type === 'blockquote') {
        if (selectionStart === 0) {
            const previousParagraph = makeEmptyParagraph(`before-${node.id}`)
            return {
                replacementNodes: [previousParagraph, { ...node, children: after }],
                focus: { nodeId: previousParagraph.id, start: 0, end: 0 },
            }
        }
        const nextBlock = { ...node, id: makeEmptyParagraph(`after-${node.id}`).id, children: after }
        return {
            replacementNodes: [{ ...node, children: before }, nextBlock],
            focus: { nodeId: nextBlock.id, start: 0, end: 0 },
        }
    }

    const nextParagraph = makeEmptyParagraph(`after-${node.id}`)
    nextParagraph.children = after
    return {
        replacementNodes: [{ ...node, children: before }, nextParagraph],
        focus: { nodeId: nextParagraph.id, start: 0, end: 0 },
    }
}
