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
    planDowngradeTextBlockToParagraph,
    planPasteInlineChildren,
    planPasteIntoTextBlock,
    shouldUseMarkdownPaste,
} from './documentModel'
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
import { htmlElementToInlineNodes, htmlStringToInlineNodes, inlineNodesToHtml, makeEmptyParagraph, parseMarkdownNotebook } from './markdown'
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

    const updateElementAndChildren = (
        element: HTMLElement,
        nextChildren: NotebookInlineNode[]
    ): NotebookInlineNode[] => {
        const nextHtml = toHtml(nextChildren)
        if (element.innerHTML !== nextHtml && !editableHtmlMatches(element, nextHtml)) {
            element.innerHTML = nextHtml
        }
        syncInlineNoteChips(element, annotations)
        restoreSelection(element, getInlineText(nextChildren).length, getInlineText(nextChildren).length)
        return updateChildren(nextChildren)
    }

    const updateFromElement = (element: HTMLElement): NotebookInlineNode[] =>
        updateChildren(htmlElementToInlineNodes(element))

    const replaceWithParagraph = (start = 0, end = start): void => {
        closeInsertMenu()
        updateNode(node.id, (currentNode) => {
            if (!isTextBlockNode(currentNode)) {
                return currentNode
            }

            // Shared with planDeleteTextAtSelection: quoted heading stays quote text.
            return planDowngradeTextBlockToParagraph(currentNode)
        })
        restoreSelectionRef.current = { nodeId: node.id, start, end }
    }

    const pasteMarkdownNodes = (
        element: HTMLElement,
        pastedNodes: NotebookBlockNode[],
        pastedMarkdown: string
    ): void => {
        const selection = getSelectionRange(element, node.id)
        const currentTextLength = getInlineText(node.children).length
        const selectionStart = selection ? Math.min(selection.start, selection.end) : currentTextLength
        const selectionEnd = selection ? Math.max(selection.start, selection.end) : currentTextLength
        const plan = planPasteIntoTextBlock(
            node,
            isTitleBlock,
            selectionStart,
            selectionEnd,
            pastedNodes,
            pastedMarkdown
        )
        if (!plan) {
            return
        }
        if (plan.kind === 'update') {
            updateNode(node.id, (currentNode) => (isTextBlockNode(currentNode) ? plan.nextNode : currentNode))
            restoreSelectionRef.current = plan.focus
            return
        }
        replaceNodeWithNodes(node.id, plan.replacementNodes)
        if (plan.focus) {
            restoreSelectionRef.current = plan.focus
        }
    }

    const handleInput = (event: FormEvent<HTMLElement>): void => {
        if (isAIWriting) {
            event.currentTarget.innerHTML = renderedHtml
            syncInlineNoteChips(event.currentTarget, annotations)
            return
        }

        const element = event.currentTarget
        const elementChildren = htmlElementToInlineNodes(element)
        const elementText = getInlineText(elementChildren)

        const shortcutReplacement = getTextBlockShortcutReplacement(node, isTitleBlock, elementText)
        if (shortcutReplacement) {
            closeInsertMenu()
            event.currentTarget.innerHTML = ''
            replaceNodeWithNodes(node.id, shortcutReplacement.nodes)
            restoreSelectionRef.current = shortcutReplacement.restoreSelection
            return
        }

        const caret = getCollapsedSelectionRange(element, node.id)?.end ?? elementText.length
        const slashToken = !isTitleBlock && !isToolInsertMenuOpen ? getSlashTokenAt(elementText, caret) : null
        if (slashToken && openSlashMenuAtToken?.(slashToken, elementChildren)) {
            return
        }
        if (!isTitleBlock && slashToken && slashToken.start === 0) {
            const queryChildren: NotebookInlineNode[] = slashToken.query
                ? [{ type: 'text', text: slashToken.query }]
                : []
            openInsertMenu(slashToken.query)
            updateElementAndChildren(element, queryChildren)
            return
        }

        const nextChildren = updateChildren(elementChildren)
        const nextText = getInlineText(nextChildren)
        if (isToolInsertMenuOpen) {
            openInsertMenu(nextText)
            return
        }

        closeInsertMenu()
    }

    const handlePaste = (event: ReactClipboardEvent<HTMLElement>): void => {
        if (isAIWriting) {
            event.preventDefault()
            return
        }

        const plainText = event.clipboardData.getData('text/plain')
        const html = event.clipboardData.getData('text/html')
        const linkPasteResult = getInlineLinkPasteResult(event.currentTarget, node.id, node.children, plainText)
        if (linkPasteResult) {
            event.preventDefault()
            updateElementAndChildren(event.currentTarget, linkPasteResult.children)
            restoreSelectionRef.current = {
                nodeId: node.id,
                start: linkPasteResult.start,
                end: linkPasteResult.end,
            }
            return
        }

        const pastedDocument = plainText ? parseMarkdownNotebook(plainText) : null
        if (pastedDocument && shouldUseMarkdownPaste(plainText, html, pastedDocument)) {
            event.preventDefault()
            pasteMarkdownNodes(event.currentTarget, pastedDocument.nodes, plainText)
            return
        }

        if (!html) {
            return
        }

        event.preventDefault()
        const pastedChildren = htmlStringToInlineNodes(html)
        if (!pastedChildren.length) {
            return
        }
        const selection = getSelectionRange(event.currentTarget, node.id)
        const currentTextLength = getInlineText(node.children).length
        const selectionStart = selection ? Math.min(selection.start, selection.end) : currentTextLength
        const selectionEnd = selection ? Math.max(selection.start, selection.end) : currentTextLength
        const plan = planPasteInlineChildren(node.children, selectionStart, selectionEnd, pastedChildren)
        updateNode(node.id, (currentNode) =>
            isTextBlockNode(currentNode) ? { ...currentNode, children: plan.children } : currentNode
        )
        restoreSelectionRef.current = { nodeId: node.id, start: plan.start, end: plan.end }
    }

    const handleBlur = (event: FormEvent<HTMLElement>): void => {
        const element = event.currentTarget
        const sanitizedHtml = toHtml(htmlElementToInlineNodes(element))
        if (element.innerHTML !== sanitizedHtml && !editableHtmlMatches(element, sanitizedHtml)) {
            element.innerHTML = sanitizedHtml
        }
        syncInlineNoteChips(element, annotations)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
        if (isAIWriting) {
            if (
                event.key.length === 1 ||
                event.key === 'Backspace' ||
                event.key === 'Delete' ||
                event.key === 'Enter'
            ) {
                event.preventDefault()
                event.stopPropagation()
            }
            return
        }

        if (isInsertMenuOpen && event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            toggleInsertMenu()
            return
        }

        if (isToolInsertMenuOpen && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
            event.preventDefault()
            event.stopPropagation()
            const textLength = getInlineText(node.children).length
            restoreSelection(event.currentTarget, 0, textLength)
            return
        }

        if (isToolInsertMenuOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault()
            moveInsertMenuSelection(event.key === 'ArrowDown' ? 'next' : 'previous')
            return
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const selection = getCollapsedSelectionRange(event.currentTarget, node.id)
            if (
                selection &&
                moveFocusToAdjacentNode(node.id, event.key === 'ArrowDown' ? 'next' : 'previous', selection.start)
            ) {
                event.preventDefault()
                return
            }
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            const inputText = event.currentTarget.textContent ?? ''
            const insertMenuQuery = isToolInsertMenuOpen ? getInsertMenuFilterQuery(inputText) : undefined

            if (submitInsertMenuSelection(insertMenuQuery)) {
                event.preventDefault()
                return
            }

            event.preventDefault()
            const selection = getCollapsedSelectionRange(event.currentTarget, node.id)
            const expandedSelection = getSelectionRange(event.currentTarget, node.id)
            const textLength = getInlineText(node.children).length
            const selectionStart = expandedSelection
                ? Math.max(0, Math.min(Math.min(expandedSelection.start, expandedSelection.end), textLength))
                : (selection?.start ?? textLength)
            const selectionEnd = expandedSelection
                ? Math.max(
                      selectionStart,
                      Math.min(Math.max(expandedSelection.start, expandedSelection.end), textLength)
                  )
                : selectionStart
            const [before, selectionAndAfter] = splitInlineNodesAt(node.children, selectionStart)
            const [, after] = splitInlineNodesAt(selectionAndAfter, selectionEnd - selectionStart)
            if (isTitleBlock) {
                const nextParagraph = makeEmptyParagraph(`after-title-${node.id}`)
                nextParagraph.children = after
                replaceNodeWithNodes(node.id, [{ ...node, type: 'heading', level: 1, children: before }, nextParagraph])
                restoreSelectionRef.current = { nodeId: nextParagraph.id, start: 0, end: 0 }
                return
            }

            if (node.type === 'heading') {
                if (selectionStart === 0) {
                    const previousParagraph = makeEmptyParagraph(`before-${node.id}`)
                    replaceNodeWithNodes(node.id, [previousParagraph, { ...node, children: after }])
                    restoreSelectionRef.current = { nodeId: previousParagraph.id, start: 0, end: 0 }
                    return
                }

                const nextHeadingId = makeEmptyParagraph(`after-${node.id}`).id
                replaceNodeWithNodes(node.id, [
                    { ...node, children: before },
                    {
                        ...node,
                        id: nextHeadingId,
                        children: after,
                    },
                ])
                restoreSelectionRef.current = { nodeId: nextHeadingId, start: 0, end: 0 }
                return
            }

            if (node.type === 'blockquote') {
                if (selectionStart === 0) {
                    const previousParagraph = makeEmptyParagraph(`before-${node.id}`)
                    replaceNodeWithNodes(node.id, [previousParagraph, { ...node, children: after }])
                    restoreSelectionRef.current = { nodeId: previousParagraph.id, start: 0, end: 0 }
                    return
                }

                const nextBlockquoteId = makeEmptyParagraph(`after-${node.id}`).id
                replaceNodeWithNodes(node.id, [
                    { ...node, children: before },
                    {
                        ...node,
                        id: nextBlockquoteId,
                        children: after,
                    },
                ])
                restoreSelectionRef.current = { nodeId: nextBlockquoteId, start: 0, end: 0 }
                return
            }

            const nextParagraph = makeEmptyParagraph(`after-${node.id}`)
            nextParagraph.children = after

            replaceNodeWithNodes(node.id, [{ ...node, children: before }, nextParagraph])
            restoreSelectionRef.current = { nodeId: nextParagraph.id, start: 0, end: 0 }
            return
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {
            if (deleteSelectedNotebookBlocks()) {
                event.preventDefault()
                event.stopPropagation()
                return
            }

            const expandedSelection = getSelectionRange(event.currentTarget, node.id)
            if (expandedSelection && expandedSelection.start !== expandedSelection.end) {
                const textLength = getInlineText(node.children).length
                const selectionStart = Math.max(
                    0,
                    Math.min(Math.min(expandedSelection.start, expandedSelection.end), textLength)
                )
                const selectionEnd = Math.max(
                    selectionStart,
                    Math.min(Math.max(expandedSelection.start, expandedSelection.end), textLength)
                )
                const [beforeSelection, selectionAndAfter] = splitInlineNodesAt(node.children, selectionStart)
                const [, afterSelection] = splitInlineNodesAt(selectionAndAfter, selectionEnd - selectionStart)
                const nextChildren = normalizeInlineNodes([...beforeSelection, ...afterSelection])
                const nextHtml = toHtml(nextChildren)

                event.preventDefault()
                if (event.currentTarget.innerHTML !== nextHtml && !editableHtmlMatches(event.currentTarget, nextHtml)) {
                    event.currentTarget.innerHTML = nextHtml
                }
                syncInlineNoteChips(event.currentTarget, annotations)
                restoreSelection(event.currentTarget, selectionStart, selectionStart)
                updateChildren(nextChildren)
                if (isToolInsertMenuOpen) {
                    openInsertMenu(getInlineText(nextChildren))
                }
                restoreSelectionRef.current = { nodeId: node.id, start: selectionStart, end: selectionStart }
                return
            }

            const selection = getCollapsedSelectionRange(event.currentTarget, node.id)
            if (isTitleBlock && event.key === 'Backspace' && selection?.start === 0 && selection.end === 0) {
                event.preventDefault()
                event.stopPropagation()
                restoreSelectionRef.current = { nodeId: node.id, start: 0, end: 0 }
                return
            }

            if (isEmpty && !isTitleBlock && node.type === 'paragraph' && event.key === 'Backspace') {
                event.preventDefault()
                if (!deleteNodeAndFocusPrevious(node.id)) {
                    updateNode(node.id, () => null)
                }
                return
            }

            if (
                !isTitleBlock &&
                event.key === 'Backspace' &&
                (node.type === 'heading' || node.type === 'blockquote') &&
                selection?.start === 0 &&
                selection.end === 0
            ) {
                event.preventDefault()
                if (deleteNodeBefore(node.id, { requireSameTextStyle: true })) {
                    return
                }
                replaceWithParagraph(0)
                return
            }

            if (
                event.key === 'Backspace' &&
                selection?.start === 0 &&
                selection.end === 0 &&
                deleteNodeBefore(node.id)
            ) {
                event.preventDefault()
                return
            }

            if (isEmpty && !isTitleBlock) {
                event.preventDefault()
                updateNode(node.id, () => null)
            }
        }
    }

    const focusEditableBlock = (): void => {
        const element = elementRef.current
        if (!element) {
            return
        }

        element.focus()
        const endOffset = getInlineText(htmlElementToInlineNodes(element)).length
        restoreSelection(element, endOffset, endOffset)
    }

    const handleInsertMenuButtonClick = (): void => {
        const isInsideTextGroup = elementRef.current?.closest('.MarkdownNotebook__text-group') instanceof HTMLElement
        const shouldDetachInsertMenu = isInsideTextGroup && !isToolInsertMenuOpen

        if (isToolInsertMenuOpen) {
            const caretOffset = getInlineText(node.children).length
            restoreSelectionRef.current = { nodeId: node.id, start: caretOffset, end: caretOffset }
            toggleInsertMenu()
            return
        }

        if (shouldDetachInsertMenu && openDetachedInsertMenu()) {
            return
        }

        toggleInsertMenu()
        focusEditableBlock()
    }

    return (
        <div
            className={clsx(
                'MarkdownNotebook__text-row',
                showInlineInsertMenuButton &&
                    isInlineInsertMenuButtonVisible &&
                    'MarkdownNotebook__text-row--inline-menu-visible',
                isAIShimmering && 'MarkdownNotebook__text-row--ai-shimmer',
                wasNotebookNodeJustInserted(node.id) && 'MarkdownNotebook__text-row--inserted-glow'
            )}
        >
            {showInlineInsertMenuButton ? (
                <span
                    className="MarkdownNotebook__line-insert-menu-hit-area"
                    contentEditable={false}
                    onMouseEnter={activateInlineInsertMenuButton}
                    onMouseMove={activateInlineInsertMenuButton}
                >
                    <LemonButton
                        size="xsmall"
                        icon={
                            <span className="MarkdownNotebook__line-insert-menu-icon">
                                {isToolInsertMenuOpen ? <IconX /> : '+'}
                            </span>
                        }
                        className="MarkdownNotebook__line-insert-menu-button"
                        active={isToolInsertMenuOpen}
                        tooltip={isToolInsertMenuOpen ? 'Close menu' : 'Add block'}
                        onClick={handleInsertMenuButtonClick}
                        aria-label={isInsertMenuOpen ? 'Close add block menu' : 'Open add block menu'}
                        aria-expanded={isInsertMenuOpen}
                        tabIndex={isInlineInsertMenuButtonVisible ? 0 : -1}
                    />
                </span>
            ) : null}
            <TextTag
                ref={setElementRef}
                className={clsx(
                    'MarkdownNotebook__text-block',
                    `MarkdownNotebook__text-block--${node.type}`,
                    isTitleBlock && 'MarkdownNotebook__text-block--title',
                    isToolInsertMenuOpen && 'MarkdownNotebook__text-block--insert-placeholder',
                    isAIWriting && 'MarkdownNotebook__text-block--ai-writing',
                    isAIWritingPlaceholder && 'MarkdownNotebook__text-block--ai-thinking',
                    isAIShimmering && 'MarkdownNotebook__text-block--ai-shimmer',
                    hasInvalidInsertMenuQuery && 'MarkdownNotebook__text-block--invalid-insert-filter'
                )}
                data-markdown-notebook-node-id={node.id}
                data-ai-thinking-label={aiThinkingLabel}
                contentEditable={mode === 'edit' && !isAIWriting}
                suppressContentEditableWarning
                aria-busy={isAIWriting || undefined}
                data-placeholder={isEmpty ? placeholder : undefined}
                onInput={handleInput}
                onPaste={handlePaste}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onMouseDown={startTextSelectionPointer}
                onPointerDown={startTextSelectionPointer}
                onTouchStart={startTextSelectionPointer}
                onMouseUp={handleSelectionChange}
                onKeyUp={handleSelectionChange}
            />
        </div>
    )
}
