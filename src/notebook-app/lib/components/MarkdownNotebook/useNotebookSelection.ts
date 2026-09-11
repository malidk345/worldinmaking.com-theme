import { useLayoutEffect, useRef, type MutableRefObject, type RefObject } from 'react'
import type { NotebookDocument } from './types'
import type { RestoreSelectionRequest } from './editorTypes'
import {
    restoreSelection,
    restoreTextSelectionRanges,
    scrollNotebookElementIntoView,
} from './domSelection'
import {
    getListItemRefKey,
    getNotebookBlockElement,
    getTableCellRefKey,
} from './utils'

export interface UseNotebookSelectionOptions {
    document: NotebookDocument
    notebookRef: RefObject<HTMLDivElement>
    blockRefs: MutableRefObject<Record<string, HTMLElement | null>>
    listItemRefs: MutableRefObject<Record<string, HTMLElement | null>>
    tableCellRefs: MutableRefObject<Record<string, HTMLElement | null>>
}

export interface UseNotebookSelectionResult {
    restoreSelectionRef: MutableRefObject<RestoreSelectionRequest | null>
    focusNodeRef: MutableRefObject<string | null>
    requestRestoreSelection: (request: RestoreSelectionRequest | null) => void
    requestFocusNode: (nodeId: string | null) => void
}

/**
 * Encapsulates selection preservation and DOM focus restoration across
 * document mutations and render cycles in MarkdownNotebook.
 */
export function useNotebookSelection({
    document,
    notebookRef,
    blockRefs,
    listItemRefs,
    tableCellRefs,
}: UseNotebookSelectionOptions): UseNotebookSelectionResult {
    const restoreSelectionRef = useRef<RestoreSelectionRequest | null>(null)
    const focusNodeRef = useRef<string | null>(null)

    const requestRestoreSelection = (request: RestoreSelectionRequest | null): void => {
        restoreSelectionRef.current = request
    }

    const requestFocusNode = (nodeId: string | null): void => {
        focusNodeRef.current = nodeId
    }

    useLayoutEffect(() => {
        const request = restoreSelectionRef.current
        if (request) {
            restoreSelectionRef.current = null
            if ('textRanges' in request) {
                restoreTextSelectionRanges(request.textRanges, blockRefs.current, listItemRefs.current)
                return
            }

            const listItemRefKey =
                request.listItemId ?? (request.listItemIndex === undefined ? undefined : String(request.listItemIndex))
            const element =
                request.tableCell !== undefined
                    ? tableCellRefs.current[getTableCellRefKey(request.nodeId, request.tableCell)]
                    : listItemRefKey === undefined
                      ? (blockRefs.current[request.nodeId] ??
                        getNotebookBlockElement(notebookRef.current, request.nodeId))
                      : (listItemRefs.current[getListItemRefKey(request.nodeId, listItemRefKey)] ??
                        (request.listItemIndex === undefined
                            ? undefined
                            : listItemRefs.current[getListItemRefKey(request.nodeId, request.listItemIndex)]))
            if (element) {
                element.focus()
                restoreSelection(element, request.start, request.end)
                scrollNotebookElementIntoView(element)
            }
            return
        }

        const focusNodeId = focusNodeRef.current
        if (focusNodeId) {
            focusNodeRef.current = null
            const element = blockRefs.current[focusNodeId]
            element?.focus()
            if (element) {
                scrollNotebookElementIntoView(element)
            }
        }
    }, [document, blockRefs, listItemRefs, tableCellRefs, notebookRef])

    return {
        restoreSelectionRef,
        focusNodeRef,
        requestRestoreSelection,
        requestFocusNode,
    }
}
