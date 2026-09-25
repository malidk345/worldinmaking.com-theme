import React, { useRef, useState } from 'react'

import {
    IconCollapse,
    IconDocument,
    IconExpand,
    IconInfo,
    IconPencil,
    IconTrash,
    IconUpload,
} from '@posthog/icons'
import OSButton from 'components/OSButton'

import { useAppActions, useAppSettings } from '../../../../context/App'
import { openNotebookWindow } from '../../../../lib/open-notebook-window'
import { uploadNotebookImage } from '../../../../lib/notebook-upload'
import { wasNotebookNodeJustInserted } from './freshlyInserted'
import {
    CALLOUT_TONES,
    parseBooleanProp,
    parseCalloutTone,
    parseStringProp,
    type CalloutTone,
} from './writingBlockModel'
import type { NotebookComponentRenderProps } from './types'

export { DatabaseTableBlock, getDefaultDatabaseProps } from './DatabaseTableBlock'

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
                    <select
                        value={tone}
                        onChange={(event) => updateProps({ tone: event.target.value || 'note' })}
                        className="notebook-native-field rounded-sm border border-primary px-1.5 py-1 text-sm text-primary"
                    >
                        {CALLOUT_TONES.map((option) => (
                            <option key={option} value={option}>
                                {CALLOUT_LABELS[option]}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className="font-semibold text-sm">{CALLOUT_LABELS[tone]}</span>
                )}
            </div>
            <div className="MarkdownNotebook__callout-content">
                {editable ? (
                    <textarea
                        value={text}
                        onChange={(event) => updateProps({ text: event.target.value })}
                        placeholder="Write callout text…"
                        rows={2}
                        className="notebook-native-field MarkdownNotebook__callout-textarea w-full rounded-sm border border-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted"
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
            <button type="button" className="MarkdownNotebook__toggle-header" aria-expanded={open} onClick={() => updateProps({ open: !open })}>
                {open ? <IconCollapse /> : <IconExpand />}
                {editable ? (
                    <input
                        value={title}
                        onChange={(event) => updateProps({ title: event.target.value })}
                        placeholder="Toggle title"
                        onClick={(event) => event.stopPropagation()}
                        className="notebook-native-field min-w-0 flex-1 rounded-sm border border-primary px-2 py-1 text-sm text-primary"
                    />
                ) : (
                    <span className="MarkdownNotebook__toggle-title">{title}</span>
                )}
            </button>
            {open ? (
                editable ? (
                    <textarea
                        value={body}
                        onChange={(event) => updateProps({ body: event.target.value })}
                        placeholder="Hidden until someone opens this toggle…"
                        rows={2}
                        autoFocus={wasNotebookNodeJustInserted(node.id)}
                        className="notebook-native-field w-full rounded-sm border border-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted"
                    />
                ) : (
                    <p className="MarkdownNotebook__toggle-body">{body}</p>
                )
            ) : null}
        </div>
    )
}

export function ColumnsBlock({ node, updateProps, mode }: NotebookComponentRenderProps): JSX.Element {
    const left = parseStringProp(node.props.left)
    const right = parseStringProp(node.props.right)
    const editable = mode === 'edit'
    return (
        <div className="MarkdownNotebook__columns" data-attr="notebook-columns">
            {(['left', 'right'] as const).map((side) => {
                const value = side === 'left' ? left : right
                return editable ? (
                    <textarea
                        key={side}
                        value={value}
                        rows={4}
                        placeholder={side === 'left' ? 'Left' : 'Right'}
                        onChange={(event) => updateProps({ [side]: event.target.value })}
                        className="MarkdownNotebook__column notebook-native-field"
                    />
                ) : (
                    <p key={side} className="MarkdownNotebook__column">
                        {value}
                    </p>
                )
            })}
        </div>
    )
}

type SketchPoint = [number, number]
type SketchStroke = SketchPoint[]

function readStrokes(raw: string): SketchStroke[] {
    try {
        const parsed = JSON.parse(raw) as unknown
        if (!Array.isArray(parsed)) return []
        return parsed
            .filter((stroke): stroke is SketchPoint[] => Array.isArray(stroke))
            .map((stroke) =>
                stroke.filter(
                    (point): point is SketchPoint =>
                        Array.isArray(point) && point.length === 2 && point.every((n) => typeof n === 'number')
                )
            )
            .filter((stroke) => stroke.length > 1)
            .slice(-80)
    } catch {
        return []
    }
}

export function SketchBlock({ node, updateProps, mode }: NotebookComponentRenderProps): JSX.Element {
    const strokes = readStrokes(parseStringProp(node.props.strokes))
    const editable = mode === 'edit'
    const boardRef = useRef<HTMLDivElement | null>(null)
    const drawing = useRef<SketchStroke | null>(null)

    const pointFromEvent = (event: React.PointerEvent): SketchPoint | null => {
        const board = boardRef.current
        if (!board) return null
        const rect = board.getBoundingClientRect()
        if (!rect.width || !rect.height) return null
        const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
        const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
        return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]
    }

    const commit = (next: SketchStroke[]): void => {
        updateProps({ strokes: JSON.stringify(next.slice(-80)) })
    }

    const toPath = (stroke: SketchStroke): string =>
        stroke.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0] * 100} ${point[1] * 100}`).join(' ')

    return (
        <div className="MarkdownNotebook__sketch" data-attr="notebook-sketch">
            <div
                ref={boardRef}
                className="MarkdownNotebook__sketch-board"
                onPointerDown={(event) => {
                    if (!editable) return
                    const point = pointFromEvent(event)
                    if (!point) return
                    drawing.current = [point]
                    event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                    if (!drawing.current) return
                    const point = pointFromEvent(event)
                    if (!point) return
                    drawing.current.push(point)
                    commit([...strokes, drawing.current])
                }}
                onPointerUp={() => {
                    drawing.current = null
                }}
            >
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                    {strokes.map((stroke, index) => (
                        <path key={index} d={toPath(stroke)} />
                    ))}
                </svg>
            </div>
            {editable ? (
                <button type="button" className="MarkdownNotebook__sketch-clear" onClick={() => commit([])}>
                    Clear
                </button>
            ) : null}
        </div>
    )
}

export function SubpageBlock({ node }: NotebookComponentRenderProps): JSX.Element {
    const { addWindow, updateWindow, windowsRef } = useAppActions()
    const { isMobile } = useAppSettings()
    const title = parseStringProp(node.props.title) || 'Untitled page'
    const description = parseStringProp(node.props.description) || 'Linked sub-document'
    const notebookId = parseStringProp(node.props.notebookId)
    return (
        <button
            type="button"
            className="MarkdownNotebook__subpage"
            data-attr="notebook-subpage"
            disabled={!notebookId}
            onClick={() => {
                if (!notebookId) return
                openNotebookWindow({ notebookId, notebookTitle: title, windows: windowsRef.current, isMobile, addWindow, updateWindow })
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
    if (src) {
        return (
            <figure className="MarkdownNotebook__image-container">
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => { void handleFiles(event.target.files); event.target.value = '' }} />
                <div className="MarkdownNotebook__image-wrapper">
                    <img className="MarkdownNotebook__image" src={src} alt={alt || caption} />
                    {editable ? (
                        <div className="MarkdownNotebook__image-overlay-actions">
                            <button type="button" className="MarkdownNotebook__image-overlay-btn" onClick={() => inputRef.current?.click()} disabled={busy} title="Change image">
                                <IconPencil className="size-3.5" />
                                <span>{busy ? 'Uploading…' : 'Edit'}</span>
                            </button>
                            <button type="button" className="MarkdownNotebook__image-overlay-btn MarkdownNotebook__image-overlay-btn--danger" onClick={() => updateProps({ src: '', caption: '', alt: '' })} title="Remove image">
                                <IconTrash className="size-3.5" />
                            </button>
                        </div>
                    ) : null}
                </div>
                {editable ? (
                    <figcaption className="MarkdownNotebook__image-caption-box">
                        <input type="text" value={caption} onChange={(e) => updateProps({ caption: e.target.value, alt: e.target.value })} placeholder="Add a caption…" className="MarkdownNotebook__image-caption-input" />
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
    return (
        <div className="MarkdownNotebook__image-empty-card">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => { void handleFiles(event.target.files); event.target.value = '' }} />
            <div className="MarkdownNotebook__image-empty-content">
                <div className="MarkdownNotebook__image-empty-icon">
                    <IconUpload className="size-6 text-[var(--color-text-secondary)]" />
                </div>
                <p className="text-sm font-medium m-0">Add an image</p>
                <p className="text-xs text-[var(--color-text-secondary)] m-0">PNG, JPEG, WebP, or GIF (up to 6 MB)</p>
                {editable ? (
                    <div className="flex flex-col items-center gap-2 mt-1 w-full max-w-xs">
                        <OSButton size="sm" variant="primary" icon={<IconUpload />} disabled={busy} onClick={() => inputRef.current?.click()}>
                            {busy ? 'Uploading…' : 'Upload image'}
                        </OSButton>
                        <input
                            value={urlDraft}
                            onChange={(event) => setUrlDraft(event.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && urlDraft.trim()) {
                                    e.preventDefault()
                                    updateProps({ src: urlDraft.trim() })
                                }
                            }}
                            onBlur={() => {
                                if (urlDraft.trim()) updateProps({ src: urlDraft.trim() })
                            }}
                            placeholder="or paste image URL & Enter"
                            autoFocus={wasNotebookNodeJustInserted(node.id)}
                            className="notebook-native-field w-full rounded-sm border border-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted"
                        />
                    </div>
                ) : null}
                {error ? <p className="MarkdownNotebook__image-error m-0 text-center">{error}</p> : null}
            </div>
        </div>
    )
}
