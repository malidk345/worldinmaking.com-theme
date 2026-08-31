import { useRef, useState } from 'react'

import {
    IconCollapse,
    IconDocument,
    IconExpand,
    IconInfo,
    IconPencil,
    IconPlus,
    IconTrash,
    IconUpload,
} from '@posthog/icons'
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
                    <span className="font-semibold text-sm">{CALLOUT_LABELS[tone]}</span>
                )}
            </div>
            <div className="MarkdownNotebook__callout-content">
                {editable ? (
                    <LemonTextArea
                        value={text}
                        onChange={(value) => updateProps({ text: value })}
                        placeholder="Write callout text…"
                        minRows={2}
                        className="MarkdownNotebook__callout-textarea"
                        autoFocus={wasNotebookNodeJustInserted(node.id)}
                    />
                ) : (
                    <p className="m-0 leading-relaxed">{text}</p>
                )}
            </div>
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

export function SubpageBlock({ node }: NotebookComponentRenderProps): JSX.Element {
    const title = parseStringProp(node.props.title) || 'Untitled Subpage'
    const description = parseStringProp(node.props.description) || 'Embedded subpage reference'
    const notebookId = parseStringProp(node.props.notebookId)

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
    const caption = parseStringProp(node.props.caption) ?? alt
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [urlDraft, setUrlDraft] = useState(src)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const editable = mode === 'edit'

    const handleFiles = async (files: FileList | File[] | null): Promise<void> => {
        const file = files?.[0]
        if (!file) return
        setBusy(true)
        setError(null)
        try {
            const uploaded = await uploadNotebookImage(file)
            const defaultAlt = file.name.replace(/\.[^.]+$/, '')
            updateProps({ src: uploaded.url, alt: alt || defaultAlt, caption: caption || alt || '' })
            setUrlDraft(uploaded.url)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed.')
        } finally {
            setBusy(false)
        }
    }

    // When image is uploaded: render pure image and seamless inline italic caption (zero screen darkening)
    if (src) {
        return (
            <figure className="MarkdownNotebook__image-container">
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
                <div className="MarkdownNotebook__image-wrapper">
                    <img className="MarkdownNotebook__image" src={src} alt={alt || caption} />
                    {editable ? (
                        <div className="MarkdownNotebook__image-overlay-actions">
                            <button
                                type="button"
                                className="MarkdownNotebook__image-overlay-btn"
                                onClick={() => inputRef.current?.click()}
                                disabled={busy}
                                title="Change image"
                            >
                                <IconPencil className="size-3.5" />
                                <span>{busy ? 'Uploading…' : 'Edit'}</span>
                            </button>
                            <button
                                type="button"
                                className="MarkdownNotebook__image-overlay-btn MarkdownNotebook__image-overlay-btn--danger"
                                onClick={() => updateProps({ src: '', caption: '', alt: '' })}
                                title="Remove image"
                            >
                                <IconTrash className="size-3.5" />
                            </button>
                        </div>
                    ) : null}
                </div>

                {/* Inline italic caption — direct typing, zero modals, zero screen darkening */}
                {editable ? (
                    <figcaption className="MarkdownNotebook__image-caption-box">
                        <input
                            type="text"
                            value={caption}
                            onChange={(e) => {
                                const val = e.target.value
                                updateProps({ caption: val, alt: val })
                            }}
                            placeholder="Add a caption…"
                            className="MarkdownNotebook__image-caption-input"
                        />
                    </figcaption>
                ) : caption ? (
                    <figcaption className="MarkdownNotebook__image-caption-box">
                        <em className="MarkdownNotebook__image-caption-text">{caption}</em>
                    </figcaption>
                ) : null}

                {error ? <p className="MarkdownNotebook__image-error m-0 text-center">{error}</p> : null}
            </figure>
        )
    }

    // When NO image is uploaded: show clean upload placeholder
    return (
        <div className="MarkdownNotebook__image-empty-card">
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
            <div className="MarkdownNotebook__image-empty-content">
                <div className="MarkdownNotebook__image-empty-icon">
                    <IconUpload className="size-6 text-[var(--color-text-secondary)]" />
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                    <p className="text-sm font-medium m-0 text-[var(--color-text-primary)]">
                        Add an image
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] m-0">
                        PNG, JPEG, WebP, or GIF (up to 6 MB)
                    </p>
                </div>
                {editable ? (
                    <div className="flex flex-col items-center gap-2 mt-1 w-full max-w-xs">
                        <LemonButton
                            size="small"
                            type="primary"
                            icon={<IconUpload />}
                            loading={busy}
                            onClick={() => inputRef.current?.click()}
                        >
                            Upload image
                        </LemonButton>
                        <div className="w-full">
                            <LemonInput
                                size="small"
                                value={urlDraft}
                                onChange={(value) => setUrlDraft(value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && urlDraft.trim()) {
                                        e.preventDefault()
                                        updateProps({ src: urlDraft.trim() })
                                    }
                                }}
                                onBlur={() => {
                                    if (urlDraft.trim()) {
                                        updateProps({ src: urlDraft.trim() })
                                    }
                                }}
                                placeholder="or paste image URL & Enter"
                                autoFocus={wasNotebookNodeJustInserted(node.id)}
                            />
                        </div>
                    </div>
                ) : null}
                {error ? <p className="MarkdownNotebook__image-error m-0 text-center">{error}</p> : null}
            </div>
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

export function SubPageBlock({
    props,
    updateProps,
    editable = true,
}: NotebookComponentRenderProps<{
    notebookId?: string
    title?: string
    description?: string
    coverGradient?: string
}>): JSX.Element {
    const title = parseStringProp(props.title, 'Untitled page')
    const notebookId = parseStringProp(props.notebookId, '')
    const description = parseStringProp(props.description, 'Linked sub-document')
    const coverGradient = parseStringProp(props.coverGradient, 'from-purple-900/40 via-indigo-900/20 to-slate-900/40')

    const handleClick = () => {
        if (notebookId) {
            openNotebookHash(notebookId)
        }
    }

    return (
        <div className="MarkdownNotebook__subpage-card my-3">
            <div
                onClick={handleClick}
                className="group/card relative w-full rounded-2xl border border-primary bg-primary hover:border-yellow/50 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer select-none"
            >
                <div
                    className={`h-20 w-full bg-gradient-to-r ${coverGradient} relative p-3 flex items-end justify-between border-b border-primary/50`}
                >
                    <div className="w-8 h-8 rounded-lg bg-primary/90 border border-primary/80 flex items-center justify-center text-yellow shadow-md">
                        <IconDocument className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-primary/80 text-secondary border border-primary/60">
                        Sub-page
                    </span>
                </div>
                <div className="p-3">
                    <h4 className="text-sm font-bold text-primary m-0 group-hover/card:text-yellow transition-colors">
                        {title}
                    </h4>
                    <p className="text-xs text-secondary m-0 mt-1 line-clamp-1">{description}</p>
                </div>
            </div>
            {editable ? (
                <div className="mt-2 flex gap-2">
                    <LemonInput
                        size="small"
                        value={title}
                        placeholder="Page title"
                        onChange={(next) => updateProps({ title: next })}
                    />
                    <LemonInput
                        size="small"
                        value={notebookId}
                        placeholder="Notebook ID or slug"
                        onChange={(next) => updateProps({ notebookId: next })}
                    />
                </div>
            ) : null}
        </div>
    )
}

