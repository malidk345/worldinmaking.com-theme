import OSButton from 'components/OSButton'
import { Checkbox } from 'components/RadixUI/Checkbox'
import { IconPlus, IconTrash } from '@posthog/icons'
import { uuid } from '../../utils/dom'
import type { TableColumn, TableContent } from '../../../types/blocks'
import {
    databaseContentToProps,
    emptyCellForColumn,
    makeDefaultDatabaseContent,
    parseDatabaseContent,
} from './writingBlockModel'
import type { NotebookComponentRenderProps } from './types'

export function DatabaseTableBlock({ node, updateProps, mode }: NotebookComponentRenderProps): JSX.Element {
    const content = parseDatabaseContent(node.props)
    const editable = mode === 'edit'
    const persist = (next: TableContent): void => updateProps(databaseContentToProps(next))
    const selectColumn = content.columns.find((column) => column.type === 'select')
    const titleColumn = content.columns.find((column) => column.type === 'text') || content.columns[0]
    const view = content.views.find((entry) => entry.id === content.activeViewId) || content.views[0]

    const updateCell = (rowId: string, columnId: string, value: string | boolean): void => {
        persist({
            ...content,
            rows: content.rows.map((row) =>
                row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row
            ),
        })
    }

    const addRow = (): void => {
        const cells: TableRowCells = {}
        for (const column of content.columns) cells[column.id] = emptyCellForColumn(column)
        persist({ ...content, rows: [...content.rows, { id: uuid(), cells }] })
    }

    const addColumn = (): void => {
        const column: TableColumn = { id: `col_${uuid().slice(0, 8)}`, name: 'Column', type: 'text' }
        persist({
            ...content,
            columns: [...content.columns, column],
            rows: content.rows.map((row) => ({
                ...row,
                cells: { ...row.cells, [column.id]: emptyCellForColumn(column) },
            })),
        })
    }

    const renameColumn = (columnId: string, name: string): void => {
        persist({
            ...content,
            columns: content.columns.map((column) => (column.id === columnId ? { ...column, name } : column)),
        })
    }

    const removeRow = (rowId: string): void => {
        persist({ ...content, rows: content.rows.filter((row) => row.id !== rowId) })
    }

    return (
        <div className="MarkdownNotebook__database" data-attr="notebook-database">
            <div className="MarkdownNotebook__database-toolbar">
                {content.views.map((entry) => (
                    <OSButton
                        key={entry.id}
                        size="xs"
                        variant={entry.id === content.activeViewId ? 'primary' : 'default'}
                        active={entry.id === content.activeViewId}
                        onClick={() => persist({ ...content, activeViewId: entry.id })}
                    >
                        {entry.name}
                    </OSButton>
                ))}
            </div>

            {view?.type === 'kanban' && selectColumn ? (
                <div className="MarkdownNotebook__database-board">
                    {(selectColumn.options || []).map((group) => {
                        const items = content.rows.filter((row) => row.cells[selectColumn.id] === group.name)
                        return (
                            <div
                                key={group.id}
                                className="MarkdownNotebook__database-lane"
                                onDragOver={(event) => {
                                    if (!editable) return
                                    event.preventDefault()
                                }}
                                onDrop={(event) => {
                                    if (!editable) return
                                    event.preventDefault()
                                    const rowId = event.dataTransfer.getData('text/wim-row')
                                    if (!rowId) return
                                    persist({
                                        ...content,
                                        rows: content.rows.map((row) =>
                                            row.id === rowId
                                                ? { ...row, cells: { ...row.cells, [selectColumn.id]: group.name } }
                                                : row
                                        ),
                                    })
                                }}
                            >
                                <h4>
                                    {group.name} <span>{items.length}</span>
                                </h4>
                                {items.map((row) => (
                                    <div
                                        key={row.id}
                                        className="MarkdownNotebook__database-card"
                                        draggable={editable}
                                        onDragStart={(event) => {
                                            event.dataTransfer.setData('text/wim-row', row.id)
                                            event.dataTransfer.effectAllowed = 'move'
                                        }}
                                    >
                                        {editable && titleColumn ? (
                                            <input
                                                value={String(row.cells[titleColumn.id] || '')}
                                                onChange={(event) =>
                                                    updateCell(row.id, titleColumn.id, event.target.value)
                                                }
                                                placeholder="Untitled"
                                                className="notebook-native-field w-full rounded-sm border border-primary px-1.5 py-1 text-sm text-primary"
                                            />
                                        ) : (
                                            String(row.cells[titleColumn?.id || ''] || 'Untitled')
                                        )}
                                        {editable ? (
                                            <div className="flex justify-end mt-1">
                                                <OSButton
                                                    size="xs"
                                                    icon={<IconTrash />}
                                                    aria-label="Delete card"
                                                    onClick={() => removeRow(row.id)}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                                {editable ? (
                                    <OSButton
                                        size="xs"
                                        icon={<IconPlus />}
                                        onClick={() => {
                                            const cells: TableRowCells = {}
                                            for (const column of content.columns) {
                                                cells[column.id] = emptyCellForColumn(column)
                                            }
                                            cells[selectColumn.id] = group.name
                                            persist({
                                                ...content,
                                                rows: [...content.rows, { id: uuid(), cells }],
                                            })
                                        }}
                                    >
                                        Add card
                                    </OSButton>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="MarkdownNotebook__database-scroll">
                    <table className="MarkdownNotebook__database-table">
                        <thead>
                            <tr>
                                {content.columns.map((column) => (
                                    <th key={column.id}>
                                        {editable ? (
                                            <input
                                                value={column.name}
                                                onChange={(event) => renameColumn(column.id, event.target.value)}
                                                className="notebook-native-field w-full rounded-sm border border-primary px-1.5 py-1 text-sm text-primary"
                                            />
                                        ) : (
                                            column.name
                                        )}
                                    </th>
                                ))}
                                {editable ? <th /> : null}
                            </tr>
                        </thead>
                        <tbody>
                            {content.rows.map((row) => (
                                <tr key={row.id}>
                                    {content.columns.map((column) => (
                                        <td key={column.id}>
                                            <DatabaseCell
                                                column={column}
                                                value={row.cells[column.id]}
                                                editable={editable}
                                                onChange={(value) => updateCell(row.id, column.id, value)}
                                            />
                                        </td>
                                    ))}
                                    {editable ? (
                                        <td>
                                            <OSButton
                                                size="xs"
                                                icon={<IconTrash />}
                                                aria-label="Delete row"
                                                onClick={() => removeRow(row.id)}
                                            />
                                        </td>
                                    ) : null}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editable ? (
                <div className="MarkdownNotebook__database-actions">
                    <OSButton size="xs" icon={<IconPlus />} onClick={addRow}>
                        Add row
                    </OSButton>
                    <OSButton size="xs" icon={<IconPlus />} onClick={addColumn}>
                        Add column
                    </OSButton>
                </div>
            ) : null}
        </div>
    )
}

type TableRowCells = Record<string, string | boolean | number>

function DatabaseCell({
    column,
    value,
    editable,
    onChange,
}: {
    column: TableColumn
    value: unknown
    editable: boolean
    onChange: (value: string | boolean) => void
}): JSX.Element {
    if (column.type === 'checkbox') {
        return (
            <Checkbox
                checked={Boolean(value)}
                disabled={!editable}
                onCheckedChange={(checked) => onChange(Boolean(checked))}
            />
        )
    }
    if (column.type === 'select') {
        const options = (column.options || []).map((option) => ({ value: option.name, label: option.name }))
        if (!editable) return <span>{String(value || '')}</span>
        return (
            <select
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => onChange(event.target.value || '')}
                className="notebook-native-field w-full rounded-sm border border-primary px-1.5 py-1 text-sm text-primary"
            >
                <option value="" />
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        )
    }
    if (!editable) return <span>{String(value || '')}</span>
    return (
        <input
            value={value == null ? '' : String(value)}
            onChange={(event) => onChange(event.target.value)}
            placeholder={column.name}
            className="notebook-native-field w-full rounded-sm border border-primary px-1.5 py-1 text-sm text-primary placeholder:text-muted"
        />
    )
}

export function getDefaultDatabaseProps(): ReturnType<typeof databaseContentToProps> {
    return databaseContentToProps(makeDefaultDatabaseContent(() => uuid()))
}
