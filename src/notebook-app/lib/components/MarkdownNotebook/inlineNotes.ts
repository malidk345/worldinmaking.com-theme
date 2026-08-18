import type {
    InlinePhilosopherNote,
    NotebookInlineMark,
    NotebookInlineNode,
    NotebookNoteIntent,
} from './types'

const NOTE_INTENTS: NotebookNoteIntent[] = ['remark', 'critique', 'edit', 'question', 'aside']

export function parseNoteIntent(value: unknown): NotebookNoteIntent | undefined {
    return typeof value === 'string' && NOTE_INTENTS.includes(value as NotebookNoteIntent)
        ? (value as NotebookNoteIntent)
        : undefined
}

export function noteIntentLabel(intent?: NotebookNoteIntent): string {
    if (intent === 'critique') return 'Critique'
    if (intent === 'edit') return 'Edit'
    if (intent === 'question') return 'Question'
    if (intent === 'aside') return 'Aside'
    if (intent === 'remark') return 'Remark'
    return ''
}
import { getNotebookActor } from '../../../../lib/notebook-actor'
import { getInlineText, normalizeInlineNodes } from './utils'
import { setInlineRefMark } from './inlineContent'

export function formatNoteTime(value?: string): string {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const delta = Date.now() - date.getTime()
    if (delta < 60_000) return 'Just now'
    if (delta < 60 * 60_000) return `${Math.floor(delta / 60_000)}m ago`
    if (delta < 24 * 60 * 60_000) return `${Math.floor(delta / (60 * 60_000))}h ago`
    return date.toLocaleDateString()
}

export function noteInitial(name: string): string {
    const trimmed = name.trim()
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

export function displayNameForActor(): string {
    const actor = getNotebookActor()
    return [actor.first_name, actor.last_name].filter(Boolean).join(' ') || actor.username || 'You'
}

export function actorToInlineNote(text = ''): InlinePhilosopherNote {
    const actor = getNotebookActor()
    return {
        by: actor.username || actor.email || 'you',
        name: displayNameForActor(),
        text,
        avatar: actor.avatar_url,
        kind: 'human',
        createdAt: new Date().toISOString(),
    }
}

export function serializeInlineNotes(notes: InlinePhilosopherNote[] | undefined): string {
    if (!notes?.length) return ''
    return JSON.stringify(
        notes.map((note) => ({
            by: note.by,
            name: note.name,
            text: note.text,
            ...(note.avatar ? { avatar: note.avatar } : {}),
            ...(note.kind ? { kind: note.kind } : {}),
            ...(note.pending ? { pending: true } : {}),
            ...(note.createdAt ? { createdAt: note.createdAt } : {}),
            ...(note.intent ? { intent: note.intent } : {}),
            ...(note.suggestion ? { suggestion: note.suggestion } : {}),
        }))
    )
}

export function parseInlineNotes(value: unknown): InlinePhilosopherNote[] {
    let raw = value
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw)
        } catch {
            return []
        }
    }
    if (!Array.isArray(raw)) return []
    const notes: InlinePhilosopherNote[] = []
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
        const record = entry as Record<string, unknown>
        const by = typeof record.by === 'string' ? record.by.trim() : ''
        const name = typeof record.name === 'string' ? record.name.trim() : ''
        if (!by && !name) continue
        notes.push({
            by: by || name.toLowerCase(),
            name: name || by,
            text: typeof record.text === 'string' ? record.text : '',
            avatar: typeof record.avatar === 'string' ? record.avatar : undefined,
            kind: record.kind === 'human' || record.kind === 'bot' ? record.kind : undefined,
            pending: record.pending === true,
            createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
            intent: parseNoteIntent(record.intent),
            suggestion: typeof record.suggestion === 'string' ? record.suggestion : undefined,
        })
    }
    return notes
}

export function updateNoteOnRef(
    nodes: NotebookInlineNode[],
    refId: string,
    by: string,
    patch: Partial<InlinePhilosopherNote>
): NotebookInlineNode[] {
    return attachNotesToRef(
        nodes,
        refId,
        (getNotesOnRef(nodes, refId) || []).map((note) => (note.by === by ? { ...note, ...patch } : note))
    )
}

export function getNotesOnRef(nodes: NotebookInlineNode[], refId: string): InlinePhilosopherNote[] {
    for (const node of nodes) {
        const mark = getRefMark(node)
        if (mark?.id === refId) return mark.notes || []
    }
    return []
}

export function findPhraseOffsets(
    haystack: string,
    phrase: string
): { start: number; end: number } | null {
    const needle = phrase.trim()
    if (!needle) return null
    const lowerHay = haystack.toLowerCase()
    const lowerNeedle = needle.toLowerCase()
    const index = lowerHay.indexOf(lowerNeedle)
    if (index === -1) return null
    return { start: index, end: index + needle.length }
}

export function applyRefToRange(
    nodes: NotebookInlineNode[],
    range: { start: number; end: number },
    refId: string
): NotebookInlineNode[] {
    return setInlineRefMark(nodes, range, refId)
}

/** @deprecated Notes no longer live on the mark. Prefer `applyRefToRange` + document.annotations. */
export function applyInlineNotesToRange(
    nodes: NotebookInlineNode[],
    range: { start: number; end: number },
    refId: string,
    _notes?: InlinePhilosopherNote[]
): NotebookInlineNode[] {
    return applyRefToRange(nodes, range, refId)
}

export function attachNotesToRef(
    nodes: NotebookInlineNode[],
    refId: string,
    notes: InlinePhilosopherNote[]
): NotebookInlineNode[] {
    return normalizeInlineNodes(
        nodes.map((node) => {
            if (node.type === 'hardBreak') return node
            const marks = node.marks?.map((mark) =>
                mark.type === 'ref' && mark.id === refId ? { ...mark, notes } : mark
            )
            return marks ? { ...node, marks } : node
        })
    )
}

export function getRefMark(node: NotebookInlineNode): Extract<NotebookInlineMark, { type: 'ref' }> | null {
    if (node.type === 'hardBreak') return null
    const mark = node.marks?.find((entry) => entry.type === 'ref')
    return mark && mark.type === 'ref' ? mark : null
}

export function applyNoteToBestRange(
    nodes: NotebookInlineNode[],
    selection: { start: number; end: number },
    refId: string,
    note: InlinePhilosopherNote,
    phrase?: string
): NotebookInlineNode[] {
    const selectedText = getInlineText(nodes).slice(selection.start, selection.end)
    const found = phrase ? findPhraseOffsets(selectedText, phrase) : null
    const range = found
        ? { start: selection.start + found.start, end: selection.start + found.end }
        : selection
    const existing = nodes.some((node) => getRefMark(node)?.id === refId)
    if (existing) {
        return attachNotesToRef(nodes, refId, [note])
    }
    return applyInlineNotesToRange(nodes, range, refId, [note])
}
