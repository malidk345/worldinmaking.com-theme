import { useCallback, useRef, type MutableRefObject } from 'react'

import { getHistoryRestoreSelection } from './documentModel'
import { getCollapsedSelectionRestoreRequest } from './domSelection'
import { MAX_UNDO_HISTORY_ENTRIES, type RestoreSelectionRequest } from './editorTypes'
import {
    UNDO_TYPING_GROUP_MS,
    type CommitDocumentOptions,
    type NotebookHistoryEntry,
    type NotebookHistoryState,
} from './notebookEditorModel'
import {
    applyNotebookOperations,
    diffNotebookDocuments,
    rebaseNotebookOperationStack,
    type NotebookOperation,
} from './operations'
import type { NotebookDocument } from './types'

export function useNotebookUndo({
    documentRef,
    notebookElementRef,
    restoreSelectionRef,
}: {
    documentRef: MutableRefObject<NotebookDocument>
    notebookElementRef: MutableRefObject<HTMLElement | null>
    restoreSelectionRef: MutableRefObject<RestoreSelectionRequest | null>
}): {
    historyRef: MutableRefObject<NotebookHistoryState>
    rebaseHistoryThroughDocumentChange: (previousDocument: NotebookDocument, nextDocument: NotebookDocument) => void
    pushHistoryEntry: (
        previousDocument: NotebookDocument,
        nextDocument: NotebookDocument,
        historyOperations?: NotebookOperation[],
        coalesce?: boolean
    ) => void
    undoHistory: () => boolean
    redoHistory: () => boolean
    bindCommitDocument: (commit: (next: NotebookDocument, options?: CommitDocumentOptions) => void) => void
} {
    const historyRef = useRef<NotebookHistoryState>({ undo: [], redo: [] })
    const commitDocumentRef = useRef<(next: NotebookDocument, options?: CommitDocumentOptions) => void>(() => {})

    const bindCommitDocument = (
        commit: (next: NotebookDocument, options?: CommitDocumentOptions) => void
    ): void => {
        commitDocumentRef.current = commit
    }

    const captureHistorySelection = useCallback((): RestoreSelectionRequest | null => {
        return notebookElementRef.current
            ? getCollapsedSelectionRestoreRequest(window.getSelection(), notebookElementRef.current)
            : null
    }, [notebookElementRef])

    const rebaseHistoryThroughDocumentChange = useCallback(
        (previousDocument: NotebookDocument, nextDocument: NotebookDocument): void => {
            const incomingOps = diffNotebookDocuments(previousDocument, nextDocument)
            if (!incomingOps.length) {
                return
            }
            historyRef.current = {
                undo: rebaseNotebookOperationStack(historyRef.current.undo, incomingOps),
                redo: rebaseNotebookOperationStack(historyRef.current.redo, incomingOps),
            }
        },
        []
    )

    const pushHistoryEntry = useCallback(
        (
            previousDocument: NotebookDocument,
            nextDocument: NotebookDocument,
            historyOperations?: NotebookOperation[],
            coalesce: boolean = true
        ): void => {
            const inverseOps = historyOperations ?? diffNotebookDocuments(nextDocument, previousDocument)
            if (!inverseOps.length) {
                return
            }

            const now = Date.now()
            const onlyOp = inverseOps.length === 1 ? inverseOps[0] : null
            // A non-coalescing entry stays its own undo step: it never folds into the previous
            // entry, and a null coalesceNodeId keeps the next typing run from folding into it.
            const coalesceNodeId =
                coalesce && onlyOp && (onlyOp.type === 'text' || onlyOp.type === 'replace_block') ? onlyOp.nodeId : null
            const lastEntry = historyRef.current.undo[historyRef.current.undo.length - 1]
            if (
                coalesceNodeId &&
                lastEntry &&
                lastEntry.coalesceNodeId === coalesceNodeId &&
                now - lastEntry.editedAt < UNDO_TYPING_GROUP_MS &&
                !historyRef.current.redo.length
            ) {
                // Fold the typing run into the open entry. For wholesale block replaces the
                // older inverse already restores the pre-run content, so the new one is moot.
                if (!(onlyOp?.type === 'replace_block' && lastEntry.ops.every((op) => op.type === 'replace_block'))) {
                    lastEntry.ops = [...inverseOps, ...lastEntry.ops]
                }
                lastEntry.editedAt = now
                return
            }

            historyRef.current = {
                undo: [
                    ...historyRef.current.undo.slice(-(MAX_UNDO_HISTORY_ENTRIES - 1)),
                    { ops: inverseOps, selection: captureHistorySelection(), editedAt: now, coalesceNodeId },
                ],
                redo: [],
            }
        },
        [captureHistorySelection]
    )

    const applyHistoryEntrySelection = useCallback(
        (entry: NotebookHistoryEntry, nextDocument: NotebookDocument): void => {
            const selection = entry.selection
            const entrySelection =
                selection && 'nodeId' in selection && nextDocument.nodes.some((node) => node.id === selection.nodeId)
                    ? selection
                    : null
            restoreSelectionRef.current = entrySelection ?? getHistoryRestoreSelection(nextDocument)
        },
        [restoreSelectionRef]
    )

    const undoHistory = useCallback((): boolean => {
        const entry = historyRef.current.undo[historyRef.current.undo.length - 1]
        if (!entry) {
            return false
        }

        const result = applyNotebookOperations(documentRef.current, entry.ops)
        if (!result) {
            // The entry no longer fits the document (a conflicting remote edit slipped past
            // the rebase): drop the stale stack rather than apply garbage.
            historyRef.current = { ...historyRef.current, undo: [] }
            return false
        }

        historyRef.current = {
            undo: historyRef.current.undo.slice(0, -1),
            redo: [
                ...historyRef.current.redo.slice(-(MAX_UNDO_HISTORY_ENTRIES - 1)),
                { ops: result.inverted, selection: captureHistorySelection(), editedAt: 0, coalesceNodeId: null },
            ],
        }
        applyHistoryEntrySelection(entry, result.document)
        commitDocumentRef.current(result.document, { addToHistory: false })
        return true
    }, [applyHistoryEntrySelection, captureHistorySelection, documentRef])

    const redoHistory = useCallback((): boolean => {
        const entry = historyRef.current.redo[historyRef.current.redo.length - 1]
        if (!entry) {
            return false
        }

        const result = applyNotebookOperations(documentRef.current, entry.ops)
        if (!result) {
            historyRef.current = { ...historyRef.current, redo: [] }
            return false
        }

        historyRef.current = {
            undo: [
                ...historyRef.current.undo.slice(-(MAX_UNDO_HISTORY_ENTRIES - 1)),
                { ops: result.inverted, selection: captureHistorySelection(), editedAt: 0, coalesceNodeId: null },
            ],
            redo: historyRef.current.redo.slice(0, -1),
        }
        applyHistoryEntrySelection(entry, result.document)
        commitDocumentRef.current(result.document, { addToHistory: false })
        return true
    }, [applyHistoryEntrySelection, captureHistorySelection, documentRef])

    return {
        historyRef,
        rebaseHistoryThroughDocumentChange,
        pushHistoryEntry,
        undoHistory,
        redoHistory,
        bindCommitDocument,
    }
}
