import type { ColumnType, TableColumn, TableContent, TableRow } from '../../../types/blocks'
import type { NotebookComponentProps, NotebookPropValue } from './types'

export const CALLOUT_TONES = ['note', 'info', 'warning', 'tip'] as const
export type CalloutTone = (typeof CALLOUT_TONES)[number]

export function parseCalloutTone(value: unknown): CalloutTone {
    return CALLOUT_TONES.includes(value as CalloutTone) ? (value as CalloutTone) : 'note'
}

export function parseStringProp(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback
}

export function parseBooleanProp(value: unknown, fallback = false): boolean {
    return typeof value === 'boolean' ? value : fallback
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

export function parseDatabaseColumns(value: unknown): TableColumn[] {
    if (!Array.isArray(value)) return []
    const columns: TableColumn[] = []
    for (const entry of value) {
        const record = asRecord(entry)
        const id = typeof record?.id === 'string' ? record.id.trim() : ''
        if (!id) continue
        const type = (typeof record.type === 'string' ? record.type : 'text') as ColumnType
        const options = Array.isArray(record.options)
            ? record.options
                  .map((option) => {
                      const optionRecord = asRecord(option)
                      const optionId = typeof optionRecord?.id === 'string' ? optionRecord.id : ''
                      const name = typeof optionRecord?.name === 'string' ? optionRecord.name : ''
                      if (!optionId || !name) return null
                      return {
                          id: optionId,
                          name,
                          color: typeof optionRecord.color === 'string' ? optionRecord.color : 'slate',
                      }
                  })
                  .filter((option): option is NonNullable<typeof option> => Boolean(option))
            : undefined
        columns.push({
            id,
            name: typeof record.name === 'string' && record.name.trim() ? record.name : 'Column',
            type,
            options,
        })
    }
    return columns
}

export function parseDatabaseRows(value: unknown): TableRow[] {
    if (!Array.isArray(value)) return []
    const rows: TableRow[] = []
    for (const entry of value) {
        const record = asRecord(entry)
        const id = typeof record?.id === 'string' ? record.id.trim() : ''
        if (!id) continue
        const cells = asRecord(record.cells) || {}
        rows.push({ id, cells: cells as TableRow['cells'] })
    }
    return rows
}

export function parseDatabaseViews(value: unknown): TableContent['views'] {
    if (!Array.isArray(value)) return []
    return value
        .map((entry) => {
            const record = asRecord(entry)
            const id = typeof record?.id === 'string' ? record.id.trim() : ''
            if (!id) return null
            const type = record?.type === 'kanban' || record?.type === 'gallery' ? record.type : 'table'
            return {
                id,
                name: typeof record?.name === 'string' && record.name.trim() ? record.name : id,
                type,
                config: asRecord(record?.config) || {},
            }
        })
        .filter((view): view is TableContent['views'][number] => Boolean(view))
}

export function makeDefaultDatabaseContent(idFactory: () => string): TableContent {
    const rowId = idFactory()
    return {
        columns: [
            { id: 'name', name: 'Name', type: 'text' },
            {
                id: 'status',
                name: 'Status',
                type: 'select',
                options: [
                    { id: 'todo', name: 'Todo', color: 'slate' },
                    { id: 'doing', name: 'Doing', color: 'amber' },
                    { id: 'done', name: 'Done', color: 'green' },
                ],
            },
            { id: 'check', name: 'Done', type: 'checkbox' },
        ],
        rows: [{ id: rowId, cells: { name: '', status: 'Todo', check: false } }],
        views: [
            { id: 'table', name: 'Table', type: 'table', config: {} },
            { id: 'kanban', name: 'Board', type: 'kanban', config: {} },
        ],
        activeViewId: 'table',
    }
}

export function parseDatabaseContent(props: NotebookComponentProps): TableContent {
    const fallback = makeDefaultDatabaseContent(() => 'row')
    const columns = parseDatabaseColumns(props.columns)
    const rows = parseDatabaseRows(props.rows)
    const views = parseDatabaseViews(props.views)
    return {
        columns: columns.length ? columns : fallback.columns,
        rows: rows.length ? rows : fallback.rows,
        views: views.length ? views : fallback.views,
        activeViewId: parseStringProp(props.activeViewId, 'table'),
    }
}

export function databaseContentToProps(content: TableContent): NotebookComponentProps {
    return {
        columns: content.columns as unknown as NotebookPropValue,
        rows: content.rows as unknown as NotebookPropValue,
        views: content.views as unknown as NotebookPropValue,
        activeViewId: content.activeViewId,
    }
}

export function emptyCellForColumn(column: TableColumn): string | boolean {
    if (column.type === 'checkbox') return false
    if (column.type === 'select') return column.options?.[0]?.name || ''
    return ''
}

export function openNotebookHash(notebookId: string): string {
    return `#/notebook/${notebookId}`
}
