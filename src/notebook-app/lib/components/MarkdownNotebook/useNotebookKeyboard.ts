import { useCallback, useEffect, type KeyboardEvent, type MutableRefObject } from 'react'

import {
    getFocusedComponentNode,
    getSelectedComponentNodeIds,
    inputEventCrossesInlineEditableBoundary,
    isNativeEditableElement,
    isSelectionInsideElement,
    restoreSelection,
    selectionMatchesRange,
    setNotebookSelectionEnd,
    setNotebookSelectionStart,
    findTextPosition,
} from './domSelection'
import { serializeNotebookNodes } from './documentModel'
import {
    type FloatingToolbarListItemRange,
    type FloatingToolbarTextRange,
    type InsertMenuState,
} from './editorTypes'
import { NATIVE_RANGE_EDIT_INPUT_TYPES } from './notebookEditorModel'
import type { NotebookBlockNode, NotebookDocument, NotebookInlineMark, NotebookMode } from './types'

export function useNotebookKeyboard({
    mode,
    insertMenu,
    documentRef,
    notebookElementRef,
    canvasRef,
    blockRefs,
    emptyNodeRef,
    undoHistory,
    redoHistory,
    copyMarkdownToNotebookClipboard,
    pasteNotebookClipboardAfterNode,
    applyInlineMark,
    getCurrentSelectionInlineRanges,
    setSelectedComponentNodeIds,
    scheduleFloatingToolbarUpdateFromSelection,
    deleteListItemAtCurrentSelection,
    deleteListItemRangeAtCurrentSelection,
    deleteSelectedNotebookBlocks,
    deleteTextAtCurrentSelection,
    insertNewlineInCodeBlockAtCurrentSelection,
    insertTableRowAtCurrentSelection,
    splitListItemAtCurrentSelection,
    splitTextBlockAtCurrentSelection,
    startInsertMenuAtCurrentTextSelection,
}: {
    mode: NotebookMode
    insertMenu: InsertMenuState | null
    documentRef: MutableRefObject<NotebookDocument>
    notebookElementRef: MutableRefObject<HTMLDivElement | null>
    canvasRef: MutableRefObject<HTMLDivElement | null>
    blockRefs: MutableRefObject<Record<string, HTMLElement | null>>
    emptyNodeRef: MutableRefObject<NotebookBlockNode>
    undoHistory: () => boolean
    redoHistory: () => boolean
    copyMarkdownToNotebookClipboard: (markdown: string) => void
    pasteNotebookClipboardAfterNode: (nodeId: string) => void
    applyInlineMark: (
        markType: NotebookInlineMark['type'],
        activeRanges: {
            textRanges: FloatingToolbarTextRange[] | null | undefined
            listItemRanges: FloatingToolbarListItemRange[] | null | undefined
        }
    ) => boolean
    getCurrentSelectionInlineRanges: () => {
        textRanges: FloatingToolbarTextRange[]
        listItemRanges: FloatingToolbarListItemRange[]
    }
    setSelectedComponentNodeIds: (ids: Set<string>) => void
    scheduleFloatingToolbarUpdateFromSelection: () => void
    deleteListItemAtCurrentSelection: (direction: 'backward' | 'forward') => boolean
    deleteListItemRangeAtCurrentSelection: (replacementText?: string, claimSingleItemRange?: boolean) => boolean
    deleteSelectedNotebookBlocks: (replacementText?: string) => boolean
    deleteTextAtCurrentSelection: (direction: 'backward' | 'forward') => boolean
    insertNewlineInCodeBlockAtCurrentSelection: () => boolean
    insertTableRowAtCurrentSelection: () => boolean
    splitListItemAtCurrentSelection: () => boolean
    splitTextBlockAtCurrentSelection: () => boolean
    startInsertMenuAtCurrentTextSelection: () => boolean
}): {
    handleNotebookKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
} {
    useEffect(() => {
        const notebookElement = notebookElementRef.current
        if (!notebookElement) {
            return
        }

        const handleBeforeInput = (event: Event): void => {
            if (mode !== 'edit') {
                return
            }

            if (event.target instanceof HTMLElement && isNativeEditableElement(event.target)) {
                return
            }

            const nativeEvent = event as InputEvent
            if (
                (nativeEvent.inputType === 'insertParagraph' || nativeEvent.inputType === 'insertLineBreak') &&
                insertNewlineInCodeBlockAtCurrentSelection()
            ) {
                event.preventDefault()
                event.stopPropagation()
                return
            }

            if (
                nativeEvent.inputType === 'insertParagraph' &&
                (splitListItemAtCurrentSelection() ||
                    insertTableRowAtCurrentSelection() ||
                    splitTextBlockAtCurrentSelection())
            ) {
                event.preventDefault()
                event.stopPropagation()
                return
            }

            if (
                nativeEvent.inputType === 'insertText' &&
                nativeEvent.data === '/' &&
                startInsertMenuAtCurrentTextSelection()
            ) {
                event.preventDefault()
                event.stopPropagation()
                return
            }

            if (
                nativeEvent.inputType === 'insertText' &&
                typeof nativeEvent.data === 'string' &&
                nativeEvent.data.length > 0 &&
                (deleteSelectedNotebookBlocks(nativeEvent.data) ||
                    deleteListItemRangeAtCurrentSelection(nativeEvent.data))
            ) {
                event.preventDefault()
                event.stopPropagation()
                return
            }

            if (
                (nativeEvent.inputType === 'deleteContentBackward' ||
                    nativeEvent.inputType === 'deleteContentForward') &&
                deleteSelectedNotebookBlocks()
            ) {
                event.preventDefault()
                event.stopPropagation()
                return
            }

            if (
                (nativeEvent.inputType === 'deleteContentBackward' ||
                    nativeEvent.inputType === 'deleteContentForward') &&
                (deleteListItemRangeAtCurrentSelection() ||
                    deleteListItemAtCurrentSelection(
                        nativeEvent.inputType === 'deleteContentBackward' ? 'backward' : 'forward'
                    ) ||
                    deleteTextAtCurrentSelection(
                        nativeEvent.inputType === 'deleteContentBackward' ? 'backward' : 'forward'
                    ))
            ) {
                event.preventDefault()
                event.stopPropagation()
                return
            }

            // A native edit whose range crosses inline-editable boundaries would restructure
            // React-managed DOM and crash the next React commit. If no handler above claimed
            // the edit, dropping it is the safe outcome.
            if (
                NATIVE_RANGE_EDIT_INPUT_TYPES.has(nativeEvent.inputType) &&
                inputEventCrossesInlineEditableBoundary(nativeEvent, notebookElement)
            ) {
                event.preventDefault()
                event.stopPropagation()
                return
            }

            if (nativeEvent.inputType !== 'historyUndo' && nativeEvent.inputType !== 'historyRedo') {
                return
            }

            if (nativeEvent.inputType === 'historyUndo') {
                undoHistory()
            } else {
                redoHistory()
            }

            event.preventDefault()
            event.stopPropagation()
        }

        notebookElement.addEventListener('beforeinput', handleBeforeInput, true)
        return () => notebookElement.removeEventListener('beforeinput', handleBeforeInput, true)
    }, [
        deleteListItemAtCurrentSelection,
        deleteListItemRangeAtCurrentSelection,
        deleteSelectedNotebookBlocks,
        deleteTextAtCurrentSelection,
        insertNewlineInCodeBlockAtCurrentSelection,
        insertTableRowAtCurrentSelection,
        mode,
        notebookElementRef,
        redoHistory,
        splitListItemAtCurrentSelection,
        splitTextBlockAtCurrentSelection,
        startInsertMenuAtCurrentTextSelection,
        undoHistory,
    ])

    const selectNotebookContents = useCallback((): boolean => {
        const canvasElement = canvasRef.current
        const selection = window.getSelection()
        if (!canvasElement || !selection) {
            return false
        }

        const nodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]
        const firstNode = nodes.find((node) => blockRefs.current[node.id])
        const lastNode = [...nodes].reverse().find((node) => blockRefs.current[node.id])
        if (!firstNode || !lastNode) {
            return false
        }

        const firstElement = blockRefs.current[firstNode.id]
        const lastElement = blockRefs.current[lastNode.id]
        if (!firstElement || !lastElement) {
            return false
        }

        const range = canvasElement.ownerDocument.createRange()
        setNotebookSelectionStart(range, firstNode, firstElement)
        setNotebookSelectionEnd(range, lastNode, lastElement)
        selection.removeAllRanges()
        selection.addRange(range)

        setSelectedComponentNodeIds(getSelectedComponentNodeIds(selection, nodes, blockRefs.current))
        scheduleFloatingToolbarUpdateFromSelection()
        return true
    }, [
        blockRefs,
        canvasRef,
        documentRef,
        emptyNodeRef,
        scheduleFloatingToolbarUpdateFromSelection,
        setSelectedComponentNodeIds,
    ])

    const selectTextBlockContents = useCallback(
        (target: EventTarget | null): boolean => {
            if (!(target instanceof HTMLElement)) {
                return false
            }

            const activeTextBlockElement = target.closest('.MarkdownNotebook__text-block')
            const selection = window.getSelection()
            if (!(activeTextBlockElement instanceof HTMLElement) || !canvasRef.current?.contains(activeTextBlockElement)) {
                return false
            }

            if (!selection) {
                return false
            }

            const range = activeTextBlockElement.ownerDocument.createRange()
            const startPosition = findTextPosition(activeTextBlockElement, 0)
            const endPosition = findTextPosition(activeTextBlockElement, activeTextBlockElement.textContent?.length ?? 0)
            range.setStart(startPosition.node, startPosition.offset)
            range.setEnd(endPosition.node, endPosition.offset)
            if (selectionMatchesRange(selection, range)) {
                return false
            }

            selection.removeAllRanges()
            selection.addRange(range)

            setSelectedComponentNodeIds(new Set())
            scheduleFloatingToolbarUpdateFromSelection()
            return true
        },
        [canvasRef, scheduleFloatingToolbarUpdateFromSelection, setSelectedComponentNodeIds]
    )

    const selectCodeBlockContents = useCallback(
        (target: EventTarget | null): boolean => {
            if (!(target instanceof HTMLElement)) {
                return false
            }

            const codeBlockElement = target.closest('.MarkdownNotebook__code-block')
            if (!(codeBlockElement instanceof HTMLElement) || !canvasRef.current?.contains(codeBlockElement)) {
                return false
            }

            const selection = window.getSelection()
            if (!selection) {
                return false
            }

            const range = codeBlockElement.ownerDocument.createRange()
            const startPosition = findTextPosition(codeBlockElement, 0)
            const endPosition = findTextPosition(codeBlockElement, codeBlockElement.textContent?.length ?? 0)
            range.setStart(startPosition.node, startPosition.offset)
            range.setEnd(endPosition.node, endPosition.offset)
            if (selectionMatchesRange(selection, range)) {
                return false
            }

            codeBlockElement.focus()
            selection.removeAllRanges()
            selection.addRange(range)
            setSelectedComponentNodeIds(new Set())
            scheduleFloatingToolbarUpdateFromSelection()
            return true
        },
        [canvasRef, scheduleFloatingToolbarUpdateFromSelection, setSelectedComponentNodeIds]
    )

    const selectAIPromptContents = useCallback(
        (target: EventTarget | null): boolean => {
            if (!(target instanceof HTMLElement)) {
                return false
            }

            const aiPromptTextBlock = target.closest('.MarkdownNotebook__text-block--ai-prompt')
            if (!(aiPromptTextBlock instanceof HTMLElement) || !canvasRef.current?.contains(aiPromptTextBlock)) {
                return false
            }

            aiPromptTextBlock.focus()
            restoreSelection(aiPromptTextBlock, 0, aiPromptTextBlock.textContent?.length ?? 0)
            scheduleFloatingToolbarUpdateFromSelection()
            return true
        },
        [canvasRef, scheduleFloatingToolbarUpdateFromSelection]
    )

    const handleNotebookKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>): void => {
            if (mode !== 'edit' || event.altKey || !(event.metaKey || event.ctrlKey)) {
                return
            }

            if (event.target instanceof HTMLElement && isNativeEditableElement(event.target)) {
                return
            }

            const key = event.key.toLowerCase()
            const inlineMarkShortcuts: Partial<Record<string, NotebookInlineMark['type']>> = {
                b: 'bold',
                i: 'italic',
                u: 'underline',
            }
            const shiftInlineMarkShortcuts: Partial<Record<string, NotebookInlineMark['type']>> = {
                x: 'strike',
            }

            if (!event.shiftKey && key === 'a') {
                if (selectAIPromptContents(event.target)) {
                    event.preventDefault()
                    event.stopPropagation()
                    return
                }

                if (insertMenu) {
                    return
                }

                if (selectTextBlockContents(event.target) || selectCodeBlockContents(event.target)) {
                    event.preventDefault()
                    event.stopPropagation()
                    return
                }

                if (selectNotebookContents()) {
                    event.preventDefault()
                    event.stopPropagation()
                }
                return
            }

            const inlineMarkType = event.shiftKey ? shiftInlineMarkShortcuts[key] : inlineMarkShortcuts[key]
            if (inlineMarkType) {
                if (insertMenu) {
                    return
                }

                if (applyInlineMark(inlineMarkType, getCurrentSelectionInlineRanges())) {
                    event.preventDefault()
                    event.stopPropagation()
                }
                return
            }

            const focusedComponentNode = getFocusedComponentNode(
                window.document.activeElement,
                documentRef.current.nodes,
                blockRefs.current
            )
            if (focusedComponentNode && !event.shiftKey && key === 'c') {
                const focusedComponentElement = blockRefs.current[focusedComponentNode.id]
                if (focusedComponentElement && isSelectionInsideElement(window.getSelection(), focusedComponentElement)) {
                    return
                }

                copyMarkdownToNotebookClipboard(serializeNotebookNodes([focusedComponentNode]))
                event.preventDefault()
                event.stopPropagation()
                return
            }
            if (focusedComponentNode && !event.shiftKey && key === 'v') {
                pasteNotebookClipboardAfterNode(focusedComponentNode.id)
                event.preventDefault()
                event.stopPropagation()
                return
            }

            const isUndoShortcut = key === 'z'
            const isRedoShortcut = key === 'y' && !event.shiftKey
            if (!isUndoShortcut && !isRedoShortcut) {
                return
            }

            if (isUndoShortcut) {
                if (event.shiftKey) {
                    redoHistory()
                } else {
                    undoHistory()
                }
            } else {
                redoHistory()
            }

            event.preventDefault()
            event.stopPropagation()
        },
        [
            applyInlineMark,
            blockRefs,
            copyMarkdownToNotebookClipboard,
            documentRef,
            getCurrentSelectionInlineRanges,
            insertMenu,
            mode,
            pasteNotebookClipboardAfterNode,
            redoHistory,
            selectAIPromptContents,
            selectCodeBlockContents,
            selectNotebookContents,
            selectTextBlockContents,
            undoHistory,
        ]
    )

    return { handleNotebookKeyDown }
}
