import { useRef, useState } from 'react'

import { IconCollapse, IconDocument, IconExpand, IconInfo, IconPlus, IconTrash, IconUpload } from '@posthog/icons'
import { LemonButton, LemonCheckbox, LemonInput, LemonSelect, LemonTextArea } from '@posthog/lemon-ui'

import { uploadNotebookImage } from '../../../../lib/notebook-upload'
import { uuid } from '../../utils/dom'
import { wasNotebookNodeJustInserted } from './freshlyInserted'
import type { TableColumn } from '../../../types/blocks'
import {
    CALLOUT_TONES,
    databaseContentToProps,
    emptyCellForColumn,
    makeDefaultDatabaseContent,
    openNotebookHash,
    parseBooleanProp,
    parseCalloutTone,
    parseDatabaseContent,
    parseStringProp,
    type CalloutTone,
} from './writingBlockModel'
import type { NotebookComponentRenderProps } from './types'

const CALLOUT_LABELS: Record<CalloutTone, string> = {
    note: 'Note',
    info: 'Info',
    warning: 'Warning',
    tip: 'Tip',
}

export function CalloutBlock({ node, updateProps, mode }: NotebookComponentRenderProps): JSX.Element {
    const tone = parseCalloutTone(node.props.tone)
    const text = parseStringProp(node.props.text)
    const editable = mode === 'edit'

    return (
        <div className={`MarkdownNotebook__callout MarkdownNotebook__callout--${tone}`} data-attr="notebook-callout">
            <div className="MarkdownNotebook__callout-label">
                <IconInfo />
                {editable ? (
                    <LemonSelect
                        size="small"
                        value={tone}
                        onChange={(value) => updateProps({ tone: value || 'note' })}
                        options={CALLOUT_TONES.map((option) => ({
                            value: option,
                            label: CALLOUT_LABELS[option],
                        }))}
                    />
                ) : (
                    <span>{CALLOUT_LABELS[tone]}</span>
                )}
            </div>
            {editable ? (
                <LemonTextArea
                    value={text}
                    onChange={(value) => updateProps({ text: value })}
                    placeholder="Write a callout…"
                    minRows={2}
                    autoFocus={wasNotebookNodeJustInserted(node.id)}
                />
            ) : (
                <p className="MarkdownNotebook__callout-text">{text || 'Callout'}</p>
            )}
        </div>
    )
}

export function ToggleBlock({ node, updateProps, mode }: NotebookComponentRenderProps): JSX.Element {
    const title = parseStringProp(node.props.title, 'Toggle')
    const body = parseStringProp(node.props.body)
    const open = parseBooleanProp(node.props.open, true)
    const editable = mode === 'edit'

    return (
        <div className="MarkdownNotebook__toggle" data-attr="notebook-toggle">
            <button
                type="button"
                className="MarkdownNotebook__toggle-header"
                aria-expanded={open}
                onClick={() => updateProps({ open: !open })}
            >
                {open ? <IconCollapse /> : <IconExpand />}
                {editable ? (
                    <LemonInput
                        value={title}
                        onChange={(value) => updateProps({ title: value })}
                        placeholder="Toggle title"
                        onClick={(event) => event.stopPropagation()}
                    />
                ) : (
                    <span className="MarkdownNotebook__toggle-title">{title}</span>
                )}
            </button>
            {open ? (
                editable ? (
                    <LemonTextArea
                        value={body}
                        onChange={(value) => updateProps({ body: value })}
                        placeholder="Hidden until someone opens this toggle…"
                        minRows={2}
                        autoFocus={wasNotebookNodeJustInserted(node.id)}
                    />
                ) : (
                    <p className="MarkdownNotebook__toggle-body">{body}</p>
                )
            ) : null}
        </div>
    )
}

export function SubPageBlock({ node }: NotebookComponentRenderProps): JSX.Element {
    const notebookId = parseStringProp(node.props.notebookId)
    const title = parseStringProp(node.props.title, 'Untitled page')
    const description = parseStringProp(node.props.description, 'Open this page in the notebook app.')

    return (
        <button
            type="button"
            className="MarkdownNotebook__subpage"
            data-attr="notebook-subpage"
            disabled={!notebookId}
            onClick={() => {
                if (notebookId) window.location.hash = openNotebookHash(notebookId)
            }}
        >
            <span className="MarkdownNotebook__subpage-icon">
                <IconDocument />
            </span>
            <span className="MarkdownNotebook__subpage-copy">
                <span className="MarkdownNotebook__subpage-title">{title}</span>
                <span className="MarkdownNotebook__subpage-description">{description}</span>
            </span>
        </button>
    )
}

export function ImageUploadBlock({ node, updateProps, mode }: NotebookComponentRenderProps): JSX.Element {
    const src = parseStringProp(node.props.src)
    const alt = parseStringProp(node.props.alt)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const editable = mode === 'edit'

    const handleFiles = async (files: FileList | File[] | null): Promise<void> => {
        const file = files?.[0]
        if (!file) return
        setBusy(true)
        setError(null)
        try {
            const uploaded = await uploadNotebookImage(file)
            updateProps({ src: uploaded.url, alt: alt || file.name.replace(/\.[^.]+$/, '') })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="MarkdownNotebook__image-block">
            {src ? <img className="MarkdownNotebook__image" src={src} alt={alt} /> : null}
            {editable ? (
                <div className="MarkdownNotebook__component-form">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        hidden
                        onChange={(event) => {
                            void handleFiles(event.target.files)
                            event.target.value = ''
                        }}
                    />
                    <LemonButton
                        size="small"
                        type="secondary"
                        icon={<IconUpload />}
                        loading={busy}
                        onClick={() => inputRef.current?.click()}
                    >
                        {src ? 'Replace image' : 'Upload image'}
                    </LemonButton>
                    <LemonInput
                        value={src}
                        onChange={(value) => updateProps({ src: value })}
                        placeholder="or paste an image URL"
                        autoFocus={wasNotebookNodeJustInserted(node.id) && !src}
                    />
                    <LemonInput value={alt} onChange={(value) => updateProps({ alt: value })} placeholder="Alt text" />
                    {error ? <p className="MarkdownNotebook__image-error m-0">{error}</p> : null}
                </div>
            ) : null}
        </div>
    )
}

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
                    <LemonButton
                        key={entry.id}
                        size="xsmall"
                        type={entry.id === content.activeViewId ? 'primary' : 'secondary'}
                        onClick={() => persist({ ...content, activeViewId: entry.id })}
                    >
                        {entry.name}
                    </LemonButton>
                ))}
            </div>

            {view?.type === 'kanban' && selectColumn ? (
                <div className="MarkdownNotebook__database-board">
                    {(selectColumn.options || []).map((group) => {
                        const items = content.rows.filter((row) => row.cells[selectColumn.id] === group.name)
                        return (
                            <div key={group.id} className="MarkdownNotebook__database-lane">
                                <h4>
                                    {group.name} <span>{items.length}</span>
                                </h4>
                                {items.map((row) => (
                                    <div key={row.id} className="MarkdownNotebook__database-card">
                                        {String(row.cells[titleColumn?.id || ''] || 'Untitled')}
                                    </div>
                                ))}
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
                                            <LemonInput
                                                value={column.name}
                                                onChange={(value) => renameColumn(column.id, value)}
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
                                            <LemonButton
                                                size="xsmall"
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
                    <LemonButton size="xsmall" icon={<IconPlus />} onClick={addRow}>
                        Add row
                    </LemonButton>
                    <LemonButton size="xsmall" icon={<IconPlus />} onClick={addColumn}>
                        Add column
                    </LemonButton>
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
            <LemonCheckbox
                checked={Boolean(value)}
                disabled={!editable}
                onChange={(checked) => onChange(Boolean(checked))}
            />
        )
    }
    if (column.type === 'select') {
        const options = (column.options || []).map((option) => ({ value: option.name, label: option.name }))
        if (!editable) return <span>{String(value || '')}</span>
        return (
            <LemonSelect
                size="small"
                value={typeof value === 'string' ? value : ''}
                options={options}
                onChange={(next) => onChange(next || '')}
            />
        )
    }
    if (!editable) return <span>{String(value || '')}</span>
    return (
        <LemonInput
            value={value == null ? '' : String(value)}
            onChange={(next) => onChange(next)}
            placeholder={column.name}
        />
    )
}

export function getDefaultDatabaseProps(): ReturnType<typeof databaseContentToProps> {
    return databaseContentToProps(makeDefaultDatabaseContent(() => uuid()))
}
