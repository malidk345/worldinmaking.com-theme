import { useState, useCallback, useRef } from 'react'
import {
    NotebookBlockNode,
    NotebookDocument,
    NotebookTextBlockNode,
} from './types'
import {
    isTextBlockNode,
    makeEmptyParagraph,
    normalizeInlineNodes,
} from './utils'
import { splitInlineNodesAt, getInlineText } from './inlineContent'
import { InsertCommand, InsertMenuState } from './editorTypes'
import {
    getClampedInsertMenuSelectedIndex,
    getFilteredInsertCommands,
    getNextInsertMenuSelectedIndex,
    getNodeInsertContext,
} from './insertMenuModel'

export { getNodeInsertContext }

export interface UseNotebookSlashMenuProps {

export function useNotebookSlashMenu({
    documentRef,
    insertCommands,
    updateNode,
    replaceNodeWithNodes,
    restoreSelectionRef,
    onInteractionStateChange,
}: UseNotebookSlashMenuProps) {
    const [insertMenu, setInsertMenu] = useState<InsertMenuState | null>(null)
    const insertMenuRef = useRef(insertMenu)
    insertMenuRef.current = insertMenu

    const clearInsertMenu = useCallback((): void => {
        setInsertMenu(null)
        onInteractionStateChange?.(false)
    }, [onInteractionStateChange])

    const openInsertMenu = useCallback(
        (nodeId: string, query: string = ''): void => {
            onInteractionStateChange?.(true)
            setInsertMenu({
                nodeId,
                query,
                selectedIndex: 0,
                mode: 'tools',
            })
        },
        [onInteractionStateChange]
    )

    const beginSlashInsertMenu = useCallback(
        (nodeId: string, query: string): void => {
            onInteractionStateChange?.(true)
            setInsertMenu({
                nodeId,
                query,
                selectedIndex: 0,
                mode: 'tools',
                source: 'slash',
            })
        },
        [onInteractionStateChange]
    )

    const getTargetNodeInsertContext = useCallback((nodeId?: string): 'inline' | 'block' => {
        if (!nodeId) return 'block'
        const targetNode = documentRef.current.nodes.find((n) => n.id === nodeId)
        return getNodeInsertContext(targetNode)
    }, [documentRef])

    const moveInsertMenuSelection = useCallback(
        (nodeId: string, direction: 'next' | 'previous') => {
            setInsertMenu((currentMenu) => {
                if (!currentMenu || currentMenu.nodeId !== nodeId) {
                    return currentMenu
                }
                const context = getTargetNodeInsertContext(currentMenu.nodeId)
                const filtered = getFilteredInsertCommands(
                    insertCommands,
                    currentMenu.query,
                    context
                )
                return {
                    ...currentMenu,
                    selectedIndex: getNextInsertMenuSelectedIndex(
                        currentMenu.selectedIndex,
                        filtered.length,
                        direction
                    ),
                }
            })
        },
        [getTargetNodeInsertContext, insertCommands]
    )

    const submitInsertMenuSelectionForNode = useCallback(
        (nodeId: string, queryOverride?: string): boolean => {
            const currentMenu = insertMenuRef.current
            const isToolInsertMenuOpen =
                currentMenu?.nodeId === nodeId &&
                (currentMenu.mode === undefined || currentMenu.mode === 'tools')
            if (!isToolInsertMenuOpen || !currentMenu) {
                return false
            }

            const query = queryOverride ?? currentMenu.query
            const context = getTargetNodeInsertContext(nodeId)
            const filteredCommands = getFilteredInsertCommands(insertCommands, query, context)
            const selectedIndex =
                query === currentMenu.query
                    ? getClampedInsertMenuSelectedIndex(
                          currentMenu.selectedIndex,
                          filteredCommands.length
                      )
                    : 0
            const selectedCommand = filteredCommands[selectedIndex]

            if (!selectedCommand) {
                if (query.length > 0) {
                    updateNode(nodeId, (currentNode) => {
                        if (!isTextBlockNode(currentNode)) {
                            return currentNode
                        }
                        return { ...currentNode, children: [] }
                    })
                    restoreSelectionRef.current = { nodeId, start: 0, end: 0 }
                    setInsertMenu((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  query: '',
                                  selectedIndex: 0,
                              }
                            : null
                    )
                    return true
                }
                return false
            }

            if (selectedCommand.disabled) {
                return true
            }

            const currentNode = documentRef.current.nodes.find((n) => n.id === nodeId)
            let effectiveTargetNodeId = nodeId

            // Block insertion mid-sentence splits ONLY for heavy block components
            if (
                currentNode &&
                isTextBlockNode(currentNode) &&
                selectedCommand.scope !== 'inline' &&
                selectedCommand.key !== 'insert-footnote' &&
                !selectedCommand.key.startsWith('text-heading') &&
                !selectedCommand.key.startsWith('text-quote') &&
                !selectedCommand.key.startsWith('text-paragraph')
            ) {
                const fullText = getInlineText(currentNode.children)
                const slashIdx = fullText.lastIndexOf('/')
                if (slashIdx > 0) {
                    const [beforeNodes] = splitInlineNodesAt(currentNode.children, slashIdx)
                    const beforeText = getInlineText(beforeNodes).trim()
                    if (beforeText.length > 0) {
                        const beforeBlock: NotebookTextBlockNode = {
                            ...currentNode,
                            children: normalizeInlineNodes(beforeNodes),
                        }
                        const newBlock = makeEmptyParagraph(`cmd-${currentNode.id}`)
                        replaceNodeWithNodes(currentNode.id, [beforeBlock, newBlock])
                        effectiveTargetNodeId = newBlock.id
                    }
                }
            }

            selectedCommand.run(effectiveTargetNodeId)

            if (selectedCommand.closeOnRun === false) {
                return true
            }

            if (selectedCommand.key.startsWith('text-')) {
                updateNode(nodeId, (curr) => {
                    if (!isTextBlockNode(curr)) {
                        return curr
                    }
                    return { ...curr, children: [] }
                })
                restoreSelectionRef.current = { nodeId, start: 0, end: 0 }
            }

            clearInsertMenu()
            return true
        },
        [
            clearInsertMenu,
            documentRef,
            getTargetNodeInsertContext,
            insertCommands,
            replaceNodeWithNodes,
            restoreSelectionRef,
            updateNode,
        ]
    )

    return {
        insertMenu,
        setInsertMenu,
        openInsertMenu,
        clearInsertMenu,
        beginSlashInsertMenu,
        getTargetNodeInsertContext,
        moveInsertMenuSelection,
        submitInsertMenuSelectionForNode,
    }
}
