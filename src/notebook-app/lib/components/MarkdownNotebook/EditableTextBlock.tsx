import clsx from 'clsx'
import {
    ClipboardEvent as ReactClipboardEvent,
    FormEvent,
    KeyboardEvent,
    MutableRefObject,
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
} from 'react'

import { IconX } from '@posthog/icons'
import { LemonButton } from '@posthog/lemon-ui'

import {
    getInsertMenuFilterQuery,
    getSlashTokenAt,
    SlashToken,
    getTextBlockShortcutReplacement,
    isTextBlockNode,
    planPasteInlineChildren,
    planPasteIntoTextBlock,
    shouldUseMarkdownPaste,
} from './documentModel'
import { planSplitTextBlock } from './insertMenuModel'
import {
    getCollapsedSelectionRange,
    getInlineLinkPasteResult,
    getSelectionRange,
    isSelectionAnchoredInsideElement,
    restoreSelection,
} from './domSelection'
import {
    InsertMenuSelectionDirection,
    InsertMenuState,
    RestoreSelectionRequest,
    TextSelectionPointerStartEvent,
} from './editorTypes'
import { splitInlineNodesAt } from './inlineContent'
import { editableHtmlMatches, noteChipsAreCurrent, syncInlineNoteChips, useNotebookAnnotations } from './annotations'
import { htmlElementToInlineNodes, htmlStringToInlineNodes, inlineNodesToHtml, parseMarkdownNotebook } from './markdown'
import { wasNotebookNodeJustInserted } from './freshlyInserted'
import { NotebookBlockNode, NotebookInlineNode, NotebookMode, NotebookTextBlockNode } from './types'
import { getInlineText, normalizeInlineNodes } from './utils'

const AI_THINKING_LABEL = 'Writing…'

export function EditableTextBlock({
    node,
    isTitleBlock,
    mode,
    placeholder,
    setBlockRef,
    updateNode,
    replaceNodeWithNodes,
    deleteSelectedNotebookBlocks,
    deleteNodeAndFocusPrevious,
    deleteNodeBefore,
    moveFocusToAdjacentNode,
    openInsertMenu,
    openSlashMenuAtToken,
    openDetachedInsertMenu,
    closeInsertMenu,
    moveInsertMenuSelection,
    toggleInsertMenu,
    activateInlineInsertMenuButton,
    showInlineInsertMenuButton,
    isInlineInsertMenuButtonVisible,
    isInsertMenuOpen,
    insertMenuMode,
    hasInvalidInsertMenuQuery,
    isAIWriting,
    isAIWritingPlaceholder,
    isAIShimmering,
    submitInsertMenuSelection,
    handleSelectionChange,
    startTextSelectionPointer,
    restoreSelectionRef,
    rootEditableInputHtmlByNodeIdRef,
}: {
    node: NotebookTextBlockNode
    isTitleBlock: boolean
    mode: NotebookMode
    placeholder: string | undefined
    setBlockRef: (element: HTMLElement | null) => void
    updateNode: (nodeId: string, updater: (node: NotebookBlockNode) => NotebookBlockNode | null) => void
    replaceNodeWithNodes: (nodeId: string, replacementNodes: NotebookBlockNode[]) => void
    deleteSelectedNotebookBlocks: () => boolean
    deleteNodeAndFocusPrevious: (nodeId: string) => boolean
    deleteNodeBefore: (nodeId: string, options?: { requireSameTextStyle?: boolean }) => boolean
    moveFocusToAdjacentNode: (nodeId: string, direction: InsertMenuSelectionDirection, offset: number) => boolean
    openInsertMenu: (query?: string) => void
    openSlashMenuAtToken?: (token: SlashToken, children: NotebookInlineNode[]) => boolean
    openDetachedInsertMenu: () => boolean
    closeInsertMenu: () => void
    moveInsertMenuSelection: (direction: InsertMenuSelectionDirection) => void
    toggleInsertMenu: () => void
    activateInlineInsertMenuButton: () => void
    showInlineInsertMenuButton: boolean
    isInlineInsertMenuButtonVisible: boolean
    isInsertMenuOpen: boolean
    insertMenuMode: InsertMenuState['mode'] | null
    hasInvalidInsertMenuQuery: boolean
    isAIWriting: boolean
    isAIWritingPlaceholder: boolean
    isAIShimmering?: boolean
    submitInsertMenuSelection: (queryOverride?: string) => boolean
    handleSelectionChange: () => void
    startTextSelectionPointer: (event: TextSelectionPointerStartEvent) => void
    restoreSelectionRef: MutableRefObject<RestoreSelectionRequest | null>
    rootEditableInputHtmlByNodeIdRef: MutableRefObject<Record<string, string>>
}): JSX.Element {
    const elementRef = useRef<HTMLElement | null>(null)
    const skipDomSyncForHtmlRef = useRef<string | null>(null)
    const annotations = useNotebookAnnotations()
    const toHtml = useCallback(
        (nodes: NotebookInlineNode[]) => inlineNodesToHtml(nodes, annotations),
        [annotations]
    )
    const renderedHtml = useMemo(() => toHtml(node.children), [node.children, toHtml])
    const text = getInlineText(node.children)
    const isEmpty = text.length === 0
    const aiThinkingLabel = isAIWritingPlaceholder ? AI_THINKING_LABEL : undefined
    const isToolInsertMenuOpen = isInsertMenuOpen && (!insertMenuMode || insertMenuMode === 'tools')
    const TextTag =
        node.type === 'heading' ? (`h${node.level ?? 1}` as const) : node.type === 'blockquote' ? 'blockquote' : 'p'

    const setElementRef = useCallback(
        (element: HTMLElement | null): void => {
            elementRef.current = element
            setBlockRef(element)
        },
        [setBlockRef]
    )

    useLayoutEffect(() => {
        const element = elementRef.current
        if (!element) {
            return
        }

        const selection = window.getSelection()
        const rootEditableInputHtml = rootEditableInputHtmlByNodeIdRef.current[node.id]
        delete rootEditableInputHtmlByNodeIdRef.current[node.id]

        const shouldSkipOwnInputSync =
            (document.activeElement === element || isSelectionAnchoredInsideElement(selection, element)) &&
            (skipDomSyncForHtmlRef.current === renderedHtml || rootEditableInputHtml === renderedHtml)
        skipDomSyncForHtmlRef.current = null

        if (
            !shouldSkipOwnInputSync &&
            element.innerHTML !== renderedHtml &&
            !editableHtmlMatches(element, renderedHtml)
        ) {
            element.innerHTML = renderedHtml
            syncInlineNoteChips(element, annotations)
        } else if (!noteChipsAreCurrent(element, annotations)) {
            syncInlineNoteChips(element, annotations)
        }
    }, [annotations, renderedHtml, TextTag, node.id, rootEditableInputHtmlByNodeIdRef])

    const updateChildren = (nextChildren: NotebookInlineNode[]): NotebookInlineNode[] => {
        skipDomSyncForHtmlRef.current = toHtml(nextChildren)
        updateNode(node.id, (currentNode) => {
            if (!isTextBlockNode(currentNode)) {
                return currentNode
            }
            return {
                ...currentNode,
                children: nextChildren,
            }
        })
        return nextChildren
    }

    // SIZE_PROBE_5K_END
