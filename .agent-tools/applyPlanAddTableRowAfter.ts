import type { MutableRefObject } from 'react'

import type { RestoreSelectionRequest } from './editorTypes'
import { planAddTableRowAfter } from './tableModel'
import type { NotebookBlockNode, NotebookTableBlockNode } from './types'

/** UI path: apply planAddTableRowAfter and return focus for restoreSelectionRef. */
export function applyPlanAddTableRowAfter(
    node: NotebookTableBlockNode,
    rowIndex: number,
    columnIndex: number,
    updateNode: (nodeId: string, updater: (node: NotebookBlockNode) => NotebookBlockNode | null) => void
): RestoreSelectionRequest {
    const plan = planAddTableRowAfter(node, rowIndex, columnIndex)
    updateNode(node.id, (currentNode) => {
        if (currentNode.type !== 'table') {
            return currentNode
        }
        return { ...currentNode, rows: plan.rows }
    })
    return plan.focus
}
