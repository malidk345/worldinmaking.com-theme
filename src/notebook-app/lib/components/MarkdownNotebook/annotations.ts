import { createContext, useContext } from 'react'

import { parseInlineNotes } from './inlineNotes'
import {
    InlinePhilosopherNote,
    NotebookAnnotation,
    NotebookAnnotationMap,
    NotebookBlockNode,
    NotebookDocument,
    NotebookInlineNode,
} from './types'

export const ANNOTATIONS_SIDECAR_PREFIX = '<!--wim-annotations:'

const ANNOTATIONS_SIDECAR_SUFFIX = '-->'

export const EMPTY_ANNOTATIONS: NotebookAnnotationMap = {}

export const NotebookAnnotationsContext = createContext<NotebookAnnotationMap>(EMPTY_ANNOTATIONS)

export function useNotebookAnnotations(): NotebookAnnotationMap {
    return useContext(NotebookAnnotationsContext)
}

export function getAnnotationNotes(
    annotations: NotebookAnnotationMap | undefined,
    refId: string
): InlinePhilosopherNote[] {
    return annotations?.[refId]?.notes || []
}

export function upsertAnnotation(
    annotations: NotebookAnnotationMap | undefined,
    refId: string,
    notes: InlinePhilosopherNote[],
    extra?: { scope?: NotebookAnnotation['scope'] }
): NotebookAnnotationMap {
    const next: NotebookAnnotationMap = { ...(annotations || {}) }
    if (!notes.length) {
        delete next[refId]
        return next
    }
    next[refId] = {
        id: refId,
        notes,
        scope: extra?.scope || next[refId]?.scope,
    }
    return next
}

export function updateNoteInAnnotations(
    annotations: NotebookAnnotationMap | undefined,
    refId: string,
    by: string,
    patch: Partial<InlinePhilosopherNote>
): NotebookAnnotationMap {
    const current = getAnnotationNotes(annotations, refId)
    const nextNotes = current.some((note) => note.by === by)
        ? current.map((note) => (note.by === by ? { ...note, ...patch } : note))
        : [...current, { by, name: by, text: '', ...patch }]
    return upsertAnnotation(annotations, refId, nextNotes)
}

export function collectRefIdsFromNodes(nodes: NotebookBlockNode[]): Set<string> {
    const ids = new Set<string>()
    const visitInline = (children: NotebookInlineNode[]): void => {
        for (const child of children) {
            if (child.type === 'hardBreak') continue
            for (const mark of child.marks || []) {
                if (mark.type === 'ref' && mark.id) ids.add(mark.id)
            }
        }
    }
    for (const node of nodes) {
        if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
            visitInline(node.children)
        } else if (node.type === 'list') {
            for (const item of node.items) visitInline(item.children)
        } else if (node.type === 'table') {
            for (const cell of node.headers) visitInline(cell.children)
            for (const row of node.rows) {
                for (const cell of row) visitInline(cell.children)
            }
        } else if (node.type === 'code') {
            for (const ref of node.refs || []) {
                if (ref.id) ids.add(ref.id)
            }
        }
    }
    return ids
}

export function pruneAnnotations(
    annotations: NotebookAnnotationMap | undefined,
    refIds: Set<string>
): NotebookAnnotationMap | undefined {
    if (!annotations) return undefined
    const next: NotebookAnnotationMap = {}
    for (const [id, annotation] of Object.entries(annotations)) {
        if (annotation.notes.length && (refIds.has(id) || annotation.scope === 'piece')) {
            next[id] = annotation
        }
    }
    return Object.keys(next).length ? next : undefined
}

export function liftNotesFromMarks(document: NotebookDocument): NotebookDocument {
    let annotations: NotebookAnnotationMap = { ...(document.annotations || {}) }
    let didLift = false

    const stripInline = (children: NotebookInlineNode[]): NotebookInlineNode[] =>
        children.map((child) => {
            if (child.type === 'hardBreak' || !child.marks?.length) return child
            const marks = child.marks.map((mark) => {
                if (mark.type !== 'ref' || !mark.notes?.length) return mark
                annotations = upsertAnnotation(annotations, mark.id, mergeNoteLists(annotations[mark.id]?.notes, mark.notes))
                didLift = true
                const { notes: _notes, ...rest } = mark
                return rest
            })
            return marks.some((mark, index) => mark !== child.marks![index]) ? { ...child, marks } : child
        })

    const nodes = document.nodes.map((node) => {
        if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
            const children = stripInline(node.children)
            return children === node.children ? node : { ...node, children }
        }
        if (node.type === 'list') {
            let listChanged = false
            const items = node.items.map((item) => {
                const children = stripInline(item.children)
                if (children === item.children) return item
                listChanged = true
                return { ...item, children }
            })
            return listChanged ? { ...node, items } : node
        }
        if (node.type === 'table') {
            let tableChanged = false
            const mapCell = (cell: { children: NotebookInlineNode[] }): { children: NotebookInlineNode[] } => {
                const children = stripInline(cell.children)
                if (children === cell.children) return cell
                tableChanged = true
                return { ...cell, children }
            }
            const headers = node.headers.map(mapCell)
            const rows = node.rows.map((row) => row.map(mapCell))
            return tableChanged ? { ...node, headers, rows } : node
        }
        return node
    })

    if (!didLift && document.annotations === annotations) {
        return document.annotations && Object.keys(document.annotations).length
            ? document
            : { ...document, annotations: Object.keys(annotations).length ? annotations : undefined }
    }

    return {
        ...document,
        nodes,
        annotations: Object.keys(annotations).length ? annotations : undefined,
    }
}

export function splitAnnotationsSidecar(markdown: string): {
    body: string
    annotations?: NotebookAnnotationMap
} {
    const index = markdown.lastIndexOf(ANNOTATIONS_SIDECAR_PREFIX)
    if (index === -1) {
        return { body: markdown }
    }

    const jsonStart = markdown.indexOf('{', index + ANNOTATIONS_SIDECAR_PREFIX.length)
    if (jsonStart === -1) {
        return { body: markdown }
    }

    const extracted = extractJsonObject(markdown, jsonStart)
    if (!extracted) {
        return { body: markdown }
    }

    const afterJson = markdown.slice(extracted.end).replace(/^\s*/, '')
    if (!afterJson.startsWith(ANNOTATIONS_SIDECAR_SUFFIX)) {
        return { body: markdown }
    }

    const end = extracted.end + (markdown.slice(extracted.end).length - afterJson.length) + ANNOTATIONS_SIDECAR_SUFFIX.length
    const body = `${markdown.slice(0, index)}${markdown.slice(end)}`.replace(/\n{3,}$/g, '\n\n').trimEnd()
    return {
        body,
        annotations: parseAnnotationPayload(extracted.value),
    }
}

export function serializeAnnotationsSidecar(
    annotations: NotebookAnnotationMap | undefined,
    refIds?: Set<string>
): string | null {
    const pruned = refIds ? pruneAnnotations(annotations, refIds) : annotations
    if (!pruned || !Object.keys(pruned).length) return null
    const byId: Record<string, unknown> = {}
    for (const [id, annotation] of Object.entries(pruned)) {
        byId[id] =
            annotation.scope === 'piece'
                ? { notes: annotation.notes, scope: 'piece' }
                : annotation.notes
    }
    return `${ANNOTATIONS_SIDECAR_PREFIX}${JSON.stringify({ v: 1, byId })}${ANNOTATIONS_SIDECAR_SUFFIX}`
}

export function mergeAnnotationMaps(
    base: NotebookAnnotationMap | undefined,
    local: NotebookAnnotationMap | undefined,
    remote: NotebookAnnotationMap | undefined
): NotebookAnnotationMap | undefined {
    const ids = new Set([
        ...Object.keys(base || {}),
        ...Object.keys(local || {}),
        ...Object.keys(remote || {}),
    ])
    const next: NotebookAnnotationMap = {}
    for (const id of ids) {
        const merged = mergeOneAnnotation(id, base?.[id], local?.[id], remote?.[id])
        if (merged) next[id] = merged
    }
    return Object.keys(next).length ? next : undefined
}

function mergeOneAnnotation(
    id: string,
    base: NotebookAnnotation | undefined,
    local: NotebookAnnotation | undefined,
    remote: NotebookAnnotation | undefined
): NotebookAnnotation | undefined {
    const baseKey = notesKey(base?.notes)
    const localKey = notesKey(local?.notes)
    const remoteKey = notesKey(remote?.notes)

    if (localKey === baseKey) return remote
    if (remoteKey === baseKey) return local
    if (localKey === remoteKey) return local || remote
    if (!local) return remote
    if (!remote) return local

    const notes = mergeNoteLists(local.notes, remote.notes, base?.notes)
    return notes.length ? { id, notes, scope: local?.scope || remote?.scope } : undefined
}

function mergeNoteLists(
    left?: InlinePhilosopherNote[],
    right?: InlinePhilosopherNote[],
    base?: InlinePhilosopherNote[]
): InlinePhilosopherNote[] {
    const byAuthor = new Map<string, InlinePhilosopherNote>()
    const baseByAuthor = new Map((base || []).map((note) => [note.by, note]))
    const leftByAuthor = new Map((left || []).map((note) => [note.by, note]))
    const rightByAuthor = new Map((right || []).map((note) => [note.by, note]))
    const authors = new Set([...leftByAuthor.keys(), ...rightByAuthor.keys(), ...baseByAuthor.keys()])

    for (const author of authors) {
        const baseNote = baseByAuthor.get(author)
        const leftNote = leftByAuthor.get(author)
        const rightNote = rightByAuthor.get(author)
        const baseNoteKey = notesKey(baseNote ? [baseNote] : undefined)
        const leftNoteKey = notesKey(leftNote ? [leftNote] : undefined)
        const rightNoteKey = notesKey(rightNote ? [rightNote] : undefined)

        if (leftNoteKey === baseNoteKey) {
            if (rightNote) byAuthor.set(author, rightNote)
            continue
        }
        if (rightNoteKey === baseNoteKey) {
            if (leftNote) byAuthor.set(author, leftNote)
            continue
        }
        const chosen = preferNote(leftNote, rightNote)
        if (chosen) byAuthor.set(author, chosen)
    }

    return [...byAuthor.values()]
}

function preferNote(
    left?: InlinePhilosopherNote,
    right?: InlinePhilosopherNote
): InlinePhilosopherNote | undefined {
    if (!left) return right
    if (!right) return left
    if (left.pending && !right.pending) return right
    if (right.pending && !left.pending) return left
    return left
}

function notesKey(notes: InlinePhilosopherNote[] | undefined): string {
    if (!notes?.length) return ''
    return JSON.stringify(
        notes.map((note) => ({
            by: note.by,
            name: note.name,
            text: note.text,
            avatar: note.avatar || '',
            kind: note.kind || '',
            pending: note.pending === true,
        }))
    )
}

function parseAnnotationPayload(value: unknown): NotebookAnnotationMap | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
    const record = value as { v?: unknown; byId?: unknown }
    const byId = record.byId
    if (!byId || typeof byId !== 'object' || Array.isArray(byId)) return undefined
    const annotations: NotebookAnnotationMap = {}
    for (const [id, raw] of Object.entries(byId as Record<string, unknown>)) {
        const packed =
            raw && typeof raw === 'object' && !Array.isArray(raw)
                ? (raw as { notes?: unknown; scope?: unknown })
                : null
        const notes = parseInlineNotes(packed ? packed.notes : raw)
        if (id && notes.length) {
            annotations[id] = {
                id,
                notes,
                scope: packed?.scope === 'piece' ? 'piece' : undefined,
            }
        }
    }
    return Object.keys(annotations).length ? annotations : undefined
}

function extractJsonObject(source: string, start: number): { value: unknown; end: number } | null {
    if (source[start] !== '{') return null
    let depth = 0
    let inString = false
    let escaped = false
    for (let index = start; index < source.length; index++) {
        const character = source[index]
        if (inString) {
            if (escaped) {
                escaped = false
                continue
            }
            if (character === '\\') {
                escaped = true
                continue
            }
            if (character === '"') inString = false
            continue
        }
        if (character === '"') {
            inString = true
            continue
        }
        if (character === '{') depth += 1
        if (character === '}') {
            depth -= 1
            if (depth === 0) {
                try {
                    return { value: JSON.parse(source.slice(start, index + 1)), end: index + 1 }
                } catch {
                    return null
                }
            }
        }
    }
    return null
}

/** Live contenteditable HTML plus chips; compare only the text/mark HTML. */
export function editableHtmlMatches(element: HTMLElement, renderedHtml: string): boolean {
    if (element.innerHTML === renderedHtml) return true
    if (!element.querySelector('[data-inline-note-chip]')) return false
    const clone = element.cloneNode(true)
    if (!(clone instanceof HTMLElement)) return false
    clone.querySelectorAll('[data-inline-note-chip]').forEach((node) => node.remove())
    return clone.innerHTML === renderedHtml
}

export function noteChipsAreCurrent(
    element: HTMLElement,
    annotations: NotebookAnnotationMap | undefined
): boolean {
    const hosts = element.querySelectorAll('[data-notebook-ref]')
    for (const host of hosts) {
        if (!(host instanceof HTMLElement)) continue
        const id = host.getAttribute('data-notebook-ref') || ''
        const notes = id ? annotations?.[id]?.notes || [] : []
        const buttons = host.querySelectorAll('[data-note-by]')
        if (notes.length !== buttons.length) return false
        if (notes.length > 0 && !host.classList.contains('MarkdownNotebook__ref--note')) return false
        for (let index = 0; index < notes.length; index++) {
            const button = buttons[index]
            if (!(button instanceof HTMLElement)) return false
            if (button.getAttribute('data-note-by') !== notes[index].by) return false
            const pending = button.classList.contains('MarkdownNotebook__inline-note--pending')
            if (pending !== Boolean(notes[index].pending)) return false
        }
    }
    return true
}

/** Chips are not part of the contenteditable source string — they are painted onto `<ref>` hosts. */
export function syncInlineNoteChips(
    element: HTMLElement,
    annotations: NotebookAnnotationMap | undefined
): void {
    if (noteChipsAreCurrent(element, annotations)) return
    element.querySelectorAll('[data-inline-note-chip]').forEach((node) => node.remove())
    element.querySelectorAll('[data-notebook-ref]').forEach((host) => {
        if (!(host instanceof HTMLElement)) return
        host.classList.remove('MarkdownNotebook__ref--note')
        const id = host.getAttribute('data-notebook-ref') || ''
        const notes = id ? annotations?.[id]?.notes : undefined
        if (!id || !notes?.length) return
        host.classList.add('MarkdownNotebook__ref--note')
        host.appendChild(buildNoteChipElement(notes))
    })
}

function buildNoteChipElement(notes: InlinePhilosopherNote[]): HTMLElement {
    const wrap = document.createElement('span')
    wrap.className = 'MarkdownNotebook__inline-notes'
    wrap.contentEditable = 'false'
    wrap.setAttribute('data-inline-note-chip', '')
    for (const note of notes) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = [
            'MarkdownNotebook__inline-note',
            note.pending ? 'MarkdownNotebook__inline-note--pending' : '',
            note.kind === 'human' ? 'MarkdownNotebook__inline-note--human' : '',
        ]
            .filter(Boolean)
            .join(' ')
        button.setAttribute('data-note-by', note.by)
        button.setAttribute('data-note-name', note.name)
        button.setAttribute('data-note-kind', note.kind || '')
        if (note.avatar) button.setAttribute('data-note-avatar', note.avatar)
        button.setAttribute('aria-label', note.name)
        if (note.avatar) {
            const img = document.createElement('img')
            img.src = note.avatar
            img.alt = ''
            img.className = 'MarkdownNotebook__inline-note-face'
            button.appendChild(img)
        } else {
            button.textContent = (note.name || note.by).charAt(0).toUpperCase() || '?'
        }
        wrap.appendChild(button)
    }
    return wrap
}
