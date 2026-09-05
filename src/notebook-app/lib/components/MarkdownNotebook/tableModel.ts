import { InsertMenuSelectionDirection, RestoreInlineSelectionRequest, TableCellPosition } from './editorTypes'
import { NotebookTableBlockNode, NotebookTableCell } from './types'

export function getTableCellRefKey(nodeId: string, position: TableCellPosition): string {
    return `${nodeId}:${position.section}:${String(position.rowIndex)}:${String(position.columnIndex)}`
}

export function getTableColumnCount(node: NotebookTableBlockNode): number {
    return Math.max(1, node.headers.length, node.alignments?.length ?? 0, ...node.rows.map((row) => row.length))
}

export function normalizeTableRow(row: NotebookTableCell[], columnCount: number): NotebookTableCell[] {
    return Array.from({ length: columnCount }, (_, index) => row[index] ?? { children: [] })
}

export function makeEmptyTableRow(columnCount: number): NotebookTableCell[] {
    return Array.from({ length: columnCount }, () => ({ children: [] }))
}

export type TableEnterPlan =
    | { kind: 'focus-body'; position: TableCellPosition }
    | {
          kind: 'insert-row'
          rows: NotebookTableCell[][]
          focus: RestoreInlineSelectionRequest
      }

/** UI row-add controls use body rowIndex (-1 = before first). Shared insert-row math. */
export function planAddTableRowAfter(
    node: NotebookTableBlockNode,
    rowIndex: number,
    columnIndex: number
): Extract<TableEnterPlan, { kind: 'insert-row' }> {
    const columnCount = getTableColumnCount(node)
    const insertIndex = Math.max(0, Math.min(rowIndex + 1, node.rows.length))
    const nextRows = node.rows.map((row) => normalizeTableRow(row, columnCount))
    nextRows.splice(insertIndex, 0, makeEmptyTableRow(columnCount))
    return {
        kind: 'insert-row',
        rows: nextRows,
        focus: {
            nodeId: node.id,
            tableCell: { section: 'body', rowIndex: insertIndex, columnIndex },
            start: 0,
            end: 0,
        },
    }
}

export function planInsertTableRow(node: NotebookTableBlockNode, position: TableCellPosition): TableEnterPlan {
    if (position.section === 'header' && node.rows.length) {
        return {
            kind: 'focus-body',
            position: { section: 'body', rowIndex: 0, columnIndex: position.columnIndex },
        }
    }

    // Header Enter with no body rows inserts at 0 (rowIndex -1); body Enter inserts after the focused row.
    const rowIndex = position.section === 'header' ? -1 : position.rowIndex
    return planAddTableRowAfter(node, rowIndex, position.columnIndex)
}

export type TableRowRemovePlan = {
    rows: NotebookTableCell[][]
    focus: RestoreInlineSelectionRequest
}

/** UI row-remove controls. Returns null when there are no body rows. */
export function planRemoveTableRow(
    node: NotebookTableBlockNode,
    rowIndex: number
): TableRowRemovePlan | null {
    if (!node.rows.length) {
        return null
    }

    const columnCount = getTableColumnCount(node)
    const removeIndex = Math.max(0, Math.min(rowIndex, node.rows.length - 1))
    const nextRows = node.rows
        .map((row) => normalizeTableRow(row, columnCount))
        .filter((_, currentRowIndex) => currentRowIndex !== removeIndex)
    const nextRowCount = nextRows.length

    return {
        rows: nextRows,
        focus: nextRowCount
            ? {
                  nodeId: node.id,
                  tableCell: {
                      section: 'body',
                      rowIndex: Math.max(0, Math.min(removeIndex, nextRowCount - 1)),
                      columnIndex: 0,
                  },
                  start: 0,
                  end: 0,
              }
            : {
                  nodeId: node.id,
                  tableCell: { section: 'header', rowIndex: 0, columnIndex: 0 },
                  start: 0,
                  end: 0,
              },
    }
}

export function getTableCellPositions(node: NotebookTableBlockNode): TableCellPosition[] {
    const columnCount = getTableColumnCount(node)
    return [
        ...Array.from({ length: columnCount }, (_, columnIndex) => ({
            section: 'header' as const,
            rowIndex: 0,
            columnIndex,
        })),
        ...node.rows.flatMap((_, rowIndex) =>
            Array.from({ length: columnCount }, (_, columnIndex) => ({
                section: 'body' as const,
                rowIndex,
                columnIndex,
            }))
        ),
    ]
}

export function getTableEdgeCellPosition(
    node: NotebookTableBlockNode,
    direction: InsertMenuSelectionDirection
): TableCellPosition | null {
    const positions = getTableCellPositions(node)
    return direction === 'next' ? (positions[0] ?? null) : (positions[positions.length - 1] ?? null)
}

export function getTableCellAtPosition(
    node: NotebookTableBlockNode,
    position: TableCellPosition
): NotebookTableCell | undefined {
    if (position.section === 'header') {
        return node.headers[position.columnIndex]
    }
    return node.rows[position.rowIndex]?.[position.columnIndex]
}

export function tableCellPositionsEqual(left: TableCellPosition, right: TableCellPosition): boolean {
    return left.section === right.section && left.rowIndex === right.rowIndex && left.columnIndex === right.columnIndex
}

export function getTableCellPositionFromElement(element: HTMLElement): TableCellPosition | null {
    const section = element.dataset.markdownNotebookTableSection
    const rowIndex = Number(element.dataset.markdownNotebookTableRowIndex)
    const columnIndex = Number(element.dataset.markdownNotebookTableColumnIndex)
    if ((section !== 'header' && section !== 'body') || !Number.isInteger(rowIndex) || !Number.isInteger(columnIndex)) {
        return null
    }

    return { section, rowIndex, columnIndex }
}
