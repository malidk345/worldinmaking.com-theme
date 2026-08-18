import { useCallback, useRef, type ClipboardEvent as ReactClipboardEvent, type MutableRefObject } from 'react'

import {
    getClipboardMarkdown,
    readSystemClipboardText,
    serializeNotebookNodes,
    setClipboardMarkdown,
    writeSystemClipboardText,
} from './documentModel'
import {
    getComponentNodeForSelection,
    getFocusedComponentNode,
    getSelectedNotebookMarkdown,
    isNativeEditableElement,
} from './domSelection'
import type { NotebookBlockNode, NotebookDocument, NotebookMode } from './types'

export function useNotebookClipboard({
    mode,
    documentRef,
    notebookElementRef,
    blockRefs,
    listItemRefs,
    emptyNodeRef,
    convertExternalDataTransferToNodes,
    insertMarkdownAfterNode,
    insertExternalNodesAtBoundary,
    deleteSelectedNotebookBlocks,
    deleteListItemRangeAtCurrentSelection,
    deleteTextAtCurrentSelection,
    requestFocusAfterRemovingNode,
    updateNode,
}: {
    mode: NotebookMode
    documentRef: MutableRefObject<NotebookDocument>
    notebookElementRef: MutableRefObject<HTMLElement | null>
    blockRefs: MutableRefObject<Record<string, HTMLElement | null>>
    listItemRefs: MutableRefObject<Record<string, HTMLElement | null>>
    emptyNodeRef: MutableRefObject<NotebookBlockNode>
    convertExternalDataTransferToNodes?: (
        dataTransfer: DataTransfer
    ) => NotebookBlockNode[] | Promise<NotebookBlockNode[] | null> | null
    insertMarkdownAfterNode: (nodeId: string, markdown: string, seed: string) => boolean
    insertExternalNodesAtBoundary: (insertedNodes: NotebookBlockNode[], boundaryIndex: number) => void
    deleteSelectedNotebookBlocks: (replacementText?: string) => boolean
    deleteListItemRangeAtCurrentSelection: (replacementText?: string, claimSingleItemRange?: boolean) => boolean
    deleteTextAtCurrentSelection: (direction: 'backward' | 'forward') => boolean
    requestFocusAfterRemovingNode: (nodeId: string) => void
    updateNode: (nodeId: string, updater: (node: NotebookBlockNode) => NotebookBlockNode | null) => void
}): {
    copyMarkdownToNotebookClipboard: (markdown: string) => void
    pasteNotebookClipboardAfterNode: (nodeId: string) => void
    handleCopy: (event: ReactClipboardEvent<HTMLDivElement>) => void
    handleCut: (event: ReactClipboardEvent<HTMLDivElement>) => void
    handleNotebookPaste: (event: ReactClipboardEvent<HTMLDivElement>) => void
} {
    const notebookClipboardMarkdownRef = useRef<string | null>(null)

    const copyMarkdownToNotebookClipboard = useCallback((markdown: string): void => {
        notebookClipboardMarkdownRef.current = markdown
        writeSystemClipboardText(markdown)
    }, [])

    const pasteNotebookClipboardAfterNode = useCallback(
        (nodeId: string): void => {
            const fallbackMarkdown = notebookClipboardMarkdownRef.current
            const pasteMarkdown = (markdown: string | null): void => {
                const nextMarkdown = markdown || fallbackMarkdown
                if (!nextMarkdown) {
                    return
                }

                insertMarkdownAfterNode(nodeId, nextMarkdown, `component-keyboard-paste-${nodeId}-${nextMarkdown.length}`)
            }

            void readSystemClipboardText().then(pasteMarkdown)
        },
        [insertMarkdownAfterNode]
    )

    const handleCopy = useCallback(
        (event: ReactClipboardEvent<HTMLDivElement>): void => {
            if (event.target instanceof HTMLElement && isNativeEditableElement(event.target)) {
                return
            }

            const selection = window.getSelection()
            if (getComponentNodeForSelection(selection, documentRef.current.nodes, blockRefs.current)) {
                return
            }

            const notebookElement = notebookElementRef.current
            const markdown = notebookElement
                ? getSelectedNotebookMarkdown(
                      selection,
                      notebookElement,
                      documentRef.current.nodes,
                      blockRefs.current,
                      listItemRefs.current
                  )
                : null
            if (markdown) {
                event.preventDefault()
                setClipboardMarkdown(event.clipboardData, markdown)
                return
            }

            const focusedComponentNode = getFocusedComponentNode(
                window.document.activeElement,
                documentRef.current.nodes,
                blockRefs.current
            )
            if (focusedComponentNode) {
                const nextMarkdown = serializeNotebookNodes([focusedComponentNode])
                notebookClipboardMarkdownRef.current = nextMarkdown
                event.preventDefault()
                setClipboardMarkdown(event.clipboardData, nextMarkdown)
            }
        },
        [blockRefs, documentRef, listItemRefs, notebookElementRef]
    )

    const handleCut = useCallback(
        (event: ReactClipboardEvent<HTMLDivElement>): void => {
            if (mode !== 'edit' || (event.target instanceof HTMLElement && isNativeEditableElement(event.target))) {
                return
            }

            const selection = window.getSelection()
            if (getComponentNodeForSelection(selection, documentRef.current.nodes, blockRefs.current)) {
                return
            }

            const notebookElement = notebookElementRef.current
            const markdown = notebookElement
                ? getSelectedNotebookMarkdown(
                      selection,
                      notebookElement,
                      documentRef.current.nodes,
                      blockRefs.current,
                      listItemRefs.current
                  )
                : null
            if (markdown) {
                event.preventDefault()
                notebookClipboardMarkdownRef.current = markdown
                setClipboardMarkdown(event.clipboardData, markdown)
                if (!deleteSelectedNotebookBlocks() && !deleteListItemRangeAtCurrentSelection('', true)) {
                    deleteTextAtCurrentSelection('forward')
                }
                return
            }

            const focusedComponentNode = getFocusedComponentNode(
                window.document.activeElement,
                documentRef.current.nodes,
                blockRefs.current
            )
            if (focusedComponentNode) {
                const nextMarkdown = serializeNotebookNodes([focusedComponentNode])
                notebookClipboardMarkdownRef.current = nextMarkdown
                event.preventDefault()
                setClipboardMarkdown(event.clipboardData, nextMarkdown)
                requestFocusAfterRemovingNode(focusedComponentNode.id)
                updateNode(focusedComponentNode.id, () => null)
            }
        },
        [
            blockRefs,
            deleteListItemRangeAtCurrentSelection,
            deleteSelectedNotebookBlocks,
            deleteTextAtCurrentSelection,
            documentRef,
            listItemRefs,
            mode,
            notebookElementRef,
            requestFocusAfterRemovingNode,
            updateNode,
        ]
    )

    const getPasteInsertBoundaryIndex = useCallback(
        (target: HTMLElement): number => {
            const nodes = documentRef.current.nodes.length ? documentRef.current.nodes : [emptyNodeRef.current]
            const focusedComponentNode = getFocusedComponentNode(target, nodes, blockRefs.current)
            const nodeId = focusedComponentNode
                ? focusedComponentNode.id
                : target.closest<HTMLElement>('[data-markdown-notebook-node-id]')?.dataset.markdownNotebookNodeId
            const nodeIndex = nodeId ? nodes.findIndex((node) => node.id === nodeId) : -1
            return nodeIndex === -1 ? nodes.length : nodeIndex + 1
        },
        [blockRefs, documentRef, emptyNodeRef]
    )

    const handleNotebookPaste = useCallback(
        (event: ReactClipboardEvent<HTMLDivElement>): void => {
            if (mode !== 'edit' || !(event.target instanceof HTMLElement) || isNativeEditableElement(event.target)) {
                return
            }

            // Pasted files (e.g. a screenshot) have no text representation the editor could insert —
            // hand them to the external converter, mirroring the file drop path.
            const clipboardFiles = event.clipboardData?.files
            if (
                convertExternalDataTransferToNodes &&
                clipboardFiles?.length &&
                !event.clipboardData.getData('text/plain')
            ) {
                const result = convertExternalDataTransferToNodes(event.clipboardData)
                if (result) {
                    event.preventDefault()
                    event.stopPropagation()
                    const boundaryIndex = getPasteInsertBoundaryIndex(event.target)
                    if (result instanceof Promise) {
                        void result.then((insertedNodes) => {
                            if (insertedNodes?.length) {
                                insertExternalNodesAtBoundary(insertedNodes, boundaryIndex)
                            }
                        })
                        return
                    }
                    insertExternalNodesAtBoundary(result, boundaryIndex)
                    return
                }
            }

            const targetComponentNode = getFocusedComponentNode(event.target, documentRef.current.nodes, blockRefs.current)
            if (!targetComponentNode) {
                return
            }

            const pastedMarkdown = getClipboardMarkdown(event.clipboardData)
            if (!pastedMarkdown) {
                return
            }

            const didPaste = insertMarkdownAfterNode(
                targetComponentNode.id,
                pastedMarkdown,
                `component-paste-${targetComponentNode.id}-${pastedMarkdown.length}`
            )
            if (!didPaste) {
                return
            }

            event.preventDefault()
            event.stopPropagation()
        },
        [
            blockRefs,
            convertExternalDataTransferToNodes,
            documentRef,
            getPasteInsertBoundaryIndex,
            insertExternalNodesAtBoundary,
            insertMarkdownAfterNode,
            mode,
        ]
    )

    return {
        copyMarkdownToNotebookClipboard,
        pasteNotebookClipboardAfterNode,
        handleCopy,
        handleCut,
        handleNotebookPaste,
    }
}
