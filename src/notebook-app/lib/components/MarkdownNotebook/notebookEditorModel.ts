import { InsertCommand, MarkdownNotebookInsertMenuApi, RestoreSelectionRequest } from './editorTypes'
import { getNotebookStringProp, isPromptComponentNode } from './documentModel'
import { makeEmptyParagraph } from './markdown'
import { NOTEBOOK_AI_WRITING_PLACEHOLDER } from './notebookAI'
import type { NotebookOperation } from './operations'
import { MarkdownNotebookCaretPosition, RemoteNotebookCaret } from './remoteCarets'
import {
    NotebookBlockNode,
    NotebookCollaborationConflict,
    NotebookComponentBlockNode,
    NotebookComponentProps,
    NotebookComponentRegistry,
    NotebookMode,
} from './types'
import { cloneNotebookNode, getInlineText, getNodeFingerprint } from './utils'

export type MarkdownNotebookProps = {
    value: string
    onChange?: (value: string) => void
    onAskAI?: (request: MarkdownNotebookAskAIRequest) => void | Promise<string | void>
    isAskAIDisabled?: boolean
    createAIConversationId?: () => string
    mode?: NotebookMode
    registry?: NotebookComponentRegistry
    extraInsertCommands?: (api: MarkdownNotebookInsertMenuApi) => InsertCommand[]
    hiddenInsertCommandKeys?: string[]
    selectionAIActions?: Array<{ id: string; label: string; tooltip: string; prompt: string }>
    remoteValue?: string
    remoteVersion?: number
    deferRemoteValue?: boolean
    clientId?: string
    onConflict?: (conflicts: NotebookCollaborationConflict[]) => void
    onInteractionStateChange?: (isInteractionActive: boolean) => void
    remoteCarets?: RemoteNotebookCaret[]
    onCaretChange?: (position: MarkdownNotebookCaretPosition | null) => void
    initialInsertMenu?: { nodeIndex?: number; query?: string }
    convertExternalDataTransferToNodes?: (
        dataTransfer: DataTransfer
    ) => NotebookBlockNode[] | Promise<NotebookBlockNode[] | null> | null
    focusAIPromptRequest?: number
    aiWritingNodeIndexes?: number[]
    allowViewModeFilters?: boolean
    placeholder?: string
    className?: string
    autoFocus?: boolean
    'data-attr'?: string
}

export type MarkdownNotebookAskAIRequest = {
    conversationId: string
    instruction: string
    query: string
    source: 'slash' | 'selection'
    apply?: 'block' | 'inline'
    responseNodeId: string
    responseNodeIndex: number
    responseMarker: string
    markdown: string
    markdownWithResponse: string
    selectedMarkdown?: string
    selectedRefId?: string
    selectionStart?: number
    selectionEnd?: number
    listItemIndex?: number
}

export type CommitDocumentOptions = {
    addToHistory?: boolean
    historyOperations?: NotebookOperation[]
    remoteMergeVersion?: number
    coalesce?: boolean
}

export type RemoteCaretAnchor = {
    caret: RemoteNotebookCaret
    source: MarkdownNotebookCaretPosition
    position: MarkdownNotebookCaretPosition
}

export type NotebookHistoryEntry = {
    ops: NotebookOperation[]
    selection: RestoreSelectionRequest | null
    editedAt: number
    coalesceNodeId: string | null
}

export type NotebookHistoryState = {
    undo: NotebookHistoryEntry[]
    redo: NotebookHistoryEntry[]
}

export const POINTER_INERT_LINK_CONTAINER_SELECTOR =
    '.MarkdownNotebook__text-block[contenteditable="true"], .MarkdownNotebook__list-block[contenteditable="true"], .MarkdownNotebook__table-cell-content[contenteditable="true"]'

export const UNDO_TYPING_GROUP_MS = 1000
export const MAX_TRACKED_LOCAL_SNAPSHOTS = 100
export const EMPTY_AI_WRITING_NODE_INDEX_SET = new Set<number>()

export const NATIVE_RANGE_EDIT_INPUT_TYPES = new Set([
    'insertText',
    'insertParagraph',
    'insertLineBreak',
    'insertFromPaste',
    'insertFromPasteAsQuotation',
    'insertFromDrop',
    'insertFromYank',
    'insertReplacementText',
    'insertTranspose',
    'deleteContent',
    'deleteContentBackward',
    'deleteContentForward',
    'deleteWordBackward',
    'deleteWordForward',
    'deleteSoftLineBackward',
    'deleteSoftLineForward',
    'deleteHardLineBackward',
    'deleteHardLineForward',
    'deleteEntireSoftLine',
    'deleteByCut',
    'deleteByDrag',
])

export function createDefaultAIConversationId(): string {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
        return window.crypto.randomUUID()
    }
    return makeEmptyParagraph('ai-conversation').id
}

export function createNotebookRefId(): string {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
        return window.crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    }
    return Math.random().toString(36).slice(2, 10)
}

export function getAIWritingPlaceholderNodeIds(nodes: NotebookBlockNode[]): Set<string> {
    const nodeIds = new Set<string>()
    for (const node of nodes) {
        if (node.type === 'paragraph' && getInlineText(node.children) === NOTEBOOK_AI_WRITING_PLACEHOLDER) {
            nodeIds.add(node.id)
        }
    }
    return nodeIds
}

export function getLatestEmptyAIPromptNodeId(nodes: NotebookBlockNode[]): string | null {
    for (let index = nodes.length - 1; index >= 0; index--) {
        const node = nodes[index]
        if (node && isPromptComponentNode(node) && !(getNotebookStringProp(node.props.question) ?? '').trim()) {
            return node.id
        }
    }
    return null
}

export function getComponentNodeUpdateHistoryOperations(
    nodes: NotebookBlockNode[],
    index: number,
    previousNode: NotebookBlockNode,
    nextNode: NotebookBlockNode | null
): NotebookOperation[] | undefined {
    if (previousNode.type !== 'component' && nextNode?.type !== 'component') {
        return undefined
    }

    const previousAfterId = index === 0 ? null : (nodes[index - 1]?.id ?? null)
    if (!nextNode) {
        return [{ type: 'insert_block', afterId: previousAfterId, node: cloneNotebookNode(previousNode) }]
    }

    if (
        previousNode.type === 'component' &&
        nextNode.type === 'component' &&
        areComponentNodesEquivalent(previousNode, nextNode)
    ) {
        return []
    }

    if (previousNode.id === nextNode.id) {
        return [{ type: 'replace_block', nodeId: previousNode.id, node: cloneNotebookNode(previousNode) }]
    }

    return [
        { type: 'delete_block', nodeId: nextNode.id },
        { type: 'insert_block', afterId: previousAfterId, node: cloneNotebookNode(previousNode) },
    ]
}

export function areComponentNodesEquivalent(
    previousNode: NotebookComponentBlockNode,
    nextNode: NotebookComponentBlockNode
): boolean {
    return (
        previousNode.id === nextNode.id &&
        previousNode.raw === nextNode.raw &&
        getNodeFingerprint(previousNode) === getNodeFingerprint(nextNode) &&
        componentNodeErrorsKey(previousNode) === componentNodeErrorsKey(nextNode)
    )
}

function componentNodeErrorsKey(node: NotebookComponentBlockNode): string {
    return node.errors?.join('\n') ?? ''
}

export type BlockMoreMenuAction = 'comment' | 'invite' | 'wim-ai' | 'delete'

export type BlockMoreMenuItem = {
    key: BlockMoreMenuAction
    label: string
    status?: 'danger'
}

export function canShowBlockMoreMenu(options: {
    mode: NotebookMode
    isTitleRow: boolean
    isAIPrompt: boolean
    isAIWriting: boolean
    isDiscussionComment: boolean
}): boolean {
    return (
        options.mode === 'edit' &&
        !options.isTitleRow &&
        !options.isAIPrompt &&
        !options.isAIWriting &&
        !options.isDiscussionComment
    )
}

export function buildBlockMoreMenuItems(options: { canInvite?: boolean; canAskAI?: boolean } = {}): BlockMoreMenuItem[] {
    const items: BlockMoreMenuItem[] = [{ key: 'comment', label: 'Comment' }]
    if (options.canInvite !== false) {
        items.push({ key: 'invite', label: 'Invite' })
    }
    if (options.canAskAI) {
        items.push({ key: 'wim-ai', label: 'WIM AI' })
    }
    items.push({ key: 'delete', label: 'Delete', status: 'danger' })
    return items
}

export function makePromptComponentNode(id: string, props: NotebookComponentProps): NotebookComponentBlockNode {
    return {
        id,
        type: 'component',
        tagName: 'Prompt',
        props,
    }
}
