import type { PhilosopherNoteResult } from '../../../../lib/notebook-invite-client'
import { upsertAnnotation } from './annotations'
import {
    applyBlockIdOnNode,
    applyRefOnNotebookSpan,
    collectExistingRefSpans,
    resolveAutonomousPlacement,
} from './annotationPlacement'
import { createNotebookRefId } from './notebookEditorModel'
import { InlinePhilosopherNote, NotebookDocument } from './types'

export type InviteBotIdentity = {
    id: string
    name: string
    avatarUrl?: string
}

export function applyPhilosopherInviteNotes(
    document: NotebookDocument,
    results: PhilosopherNoteResult[],
    bots: InviteBotIdentity[],
    options?: { now?: string; createId?: () => string }
): { document: NotebookDocument; placed: string[] } {
    const createId = options?.createId || createNotebookRefId
    const stamped = options?.now || new Date().toISOString()
    const used = collectExistingRefSpans(document.nodes)
    let nextNodes = document.nodes
    let nextAnnotations = document.annotations
    const placed: string[] = []

    for (const result of results) {
        const bot = bots.find((entry) => entry.id === result.botId)
        if (!bot || !result.text.trim()) continue
        const placement = resolveAutonomousPlacement(nextNodes, result.phrase, result.scope, used)
        const note: InlinePhilosopherNote = {
            by: bot.id,
            name: bot.name,
            text: result.text.trim(),
            avatar: bot.avatarUrl,
            kind: 'bot',
            createdAt: stamped,
            intent: result.intent,
            suggestion: result.suggestion,
        }
        if (placement.kind === 'span') {
            const refId = createId()
            nextNodes = applyRefOnNotebookSpan(nextNodes, placement.span, refId)
            used.push(placement.span)
            placed.push(refId)
            nextAnnotations = upsertAnnotation(nextAnnotations, refId, [note], { scope: 'span' })
            continue
        }
        if (placement.kind === 'block') {
            const target = nextNodes.find((entry) => entry.id === placement.nodeId)
            const refId = target?.blockId || createId()
            nextNodes = applyBlockIdOnNode(nextNodes, placement.nodeId, refId)
            used.push({ nodeId: placement.nodeId, start: 0, end: 1 })
            placed.push(refId)
            const existing = nextAnnotations?.[refId]?.notes || []
            nextAnnotations = upsertAnnotation(nextAnnotations, refId, [...existing, note], { scope: 'block' })
            continue
        }
        const refId = createId()
        placed.push(refId)
        nextAnnotations = upsertAnnotation(nextAnnotations, refId, [note], { scope: 'piece' })
    }

    return {
        document: {
            ...document,
            nodes: nextNodes,
            annotations: nextAnnotations,
        },
        placed,
    }
}
