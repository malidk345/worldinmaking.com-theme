import { historyToolResult, omitPastedPdfBodies } from '../../pdf-pages'
import { stripLeakedToolMarkup } from './leak'

export type HistoryArtifact = {
    id?: string
    type: string
    title: string
    content: string
}

export type HistoryToolCall = {
    id: string
    name: string
    arguments: string
    thoughtSignature?: string
}

export type HistoryTurn = {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string
    artifacts?: HistoryArtifact[]
    tool_calls?: HistoryToolCall[]
    tool_call_id?: string
}

export type CompactedMessage = {
    role: 'user' | 'assistant' | 'tool'
    content: string
    tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
        thoughtSignature?: string
    }>
    tool_call_id?: string
}

// Wide enough that recentTools(6) can leave older tools in-window (pairs need ~2 slots each).
const MAX_TURNS = 20
const MAX_VISIBLE = 2_000
const MAX_ARTIFACT_BODY = 4_000
const MAX_MESSAGE = 10_000
const MAX_ARTIFACTS_PER_TURN = 2
const MAX_TOOL_ARGS = 2_000
const MAX_TOOL_RESULT = 2_400
const MAX_OLD_TOOL_RESULT = 400

function clip(value: string, max: number): string {
    const text = String(value || '')
    return text.length <= max ? text : text.slice(0, max)
}

function formatArtifactBlocks(
    artifacts: HistoryArtifact[],
    options?: { includeArtifactBodies?: boolean }
): string[] {
    const includeBodies = options?.includeArtifactBodies !== false
    return artifacts.slice(0, MAX_ARTIFACTS_PER_TURN).map((artifact) => {
        const title = clip(artifact.title || 'Untitled', 80)
        const id = artifact.id ? ` id=${clip(artifact.id, 64)}` : ''
        if (!includeBodies) {
            return `### ${artifact.type} "${title}"${id}\n[On screen — revise with create_artifact using the same title; prior body omitted]`
        }
        return `### ${artifact.type} "${title}"${id}\n${clip(artifact.content || '', MAX_ARTIFACT_BODY)}`
    })
}

/**
 * Host note for the model about on-screen artifacts.
 * Sent as a separate synthetic user turn — never inlined into assistant content
 * (models echo inlined blocks into the public bubble).
 */
export function formatOnScreenArtifactsNote(
    artifacts: HistoryArtifact[],
    options?: { includeArtifactBodies?: boolean }
): string {
    const blocks = formatArtifactBlocks(artifacts, options)
    if (!blocks.length) return ''
    return clip(
        `[Host note — on-screen artifacts. Revise with create_artifact using the same title. Do NOT paste this note or raw artifact JSON into the public answer.]\n${blocks.join('\n\n')}`,
        MAX_MESSAGE
    )
}

/**
 * Public assistant body only. Artifacts are NOT appended here — use
 * formatOnScreenArtifactsNote as a separate synthetic turn instead.
 */
export function formatHistoryContent(
    item: HistoryTurn,
    _options?: { includeArtifactBodies?: boolean }
): string {
    // Defense: old polluted assistant bubbles still in client storage must not re-seed the model.
    return clip(stripLeakedToolMarkup(item.content || ''), MAX_VISIBLE)
}

/** Rebuild OpenAI tool_calls + role:tool turns from the client thread. */
export function compactToolHistory(history?: HistoryTurn[]): CompactedMessage[] {
    const out: CompactedMessage[] = []
    const window = (history || []).slice(-MAX_TURNS)
    const toolPositions = window
        .map((item, index) => (item.role === 'tool' ? index : -1))
        .filter((index) => index >= 0)
    // Keep more recent tool results fuller so multi-tool threads don't forget mid-job.
    const recentTools = new Set(toolPositions.slice(-6))
    const lastArtifactIndex = (() => {
        for (let i = window.length - 1; i >= 0; i -= 1) {
            const row = window[i]
            if (row.role === 'assistant' && row.artifacts && row.artifacts.length > 0) return i
        }
        return -1
    })()

    let pendingArtifactNote: string | null = null
    const toolCallsById = new Map<string, { name: string; arguments: string }>()
    /** Push/merge user text — never emit consecutive user turns (Anthropic rejects them). */
    const pushUserContent = (content: string) => {
        const trimmed = String(content || '').trim()
        if (!trimmed) return
        const last = out[out.length - 1]
        if (last && last.role === 'user') {
            last.content = clip(`${last.content}\n\n${trimmed}`, MAX_MESSAGE)
            return
        }
        out.push({ role: 'user', content: clip(trimmed, MAX_MESSAGE) })
    }
    const flushPendingArtifactNote = () => {
        if (!pendingArtifactNote) return
        const note = pendingArtifactNote
        pendingArtifactNote = null
        pushUserContent(note)
    }

    for (let index = 0; index < window.length; index += 1) {
        const item = window[index]
        if (item.role === 'tool' && item.tool_call_id) {
            const known = toolCallsById.get(item.tool_call_id)
            const raw = known
                ? historyToolResult(known.name, known.arguments, item.content || '')
                : item.content || ''
            out.push({
                role: 'tool',
                tool_call_id: item.tool_call_id.slice(0, 80),
                content: clip(raw, recentTools.has(index) ? MAX_TOOL_RESULT : MAX_OLD_TOOL_RESULT),
            })
            const next = window[index + 1]
            // Keep note pending when the next turn is a real user so we can merge (no consecutive users).
            if (!next || (next.role !== 'tool' && next.role !== 'user')) flushPendingArtifactNote()
            continue
        }
        if (item.role === 'user') {
            const content = clip(omitPastedPdfBodies(item.content || ''), MAX_VISIBLE)
            if (pendingArtifactNote) {
                const note = pendingArtifactNote
                pendingArtifactNote = null
                pushUserContent(content.trim() ? `${note}\n\n${content}` : note)
            } else {
                pushUserContent(content)
            }
            continue
        }
        if (item.role !== 'assistant') continue
        for (const call of item.tool_calls || []) {
            if (call?.id && call.name) toolCallsById.set(call.id, { name: call.name, arguments: call.arguments || '' })
        }
        flushPendingArtifactNote()
        const toolCalls = (item.tool_calls || [])
            .filter((call) => call && call.id && call.name)
            .slice(0, 4)
            .map((call) => ({
                id: call.id.slice(0, 80),
                type: 'function' as const,
                function: { name: call.name.slice(0, 80), arguments: clip(call.arguments || '{}', MAX_TOOL_ARGS) },
                thoughtSignature:
                    call.thoughtSignature && call.thoughtSignature.length <= 24_000
                        ? call.thoughtSignature
                        : undefined,
            }))
        // Public prose only — never inline on-screen artifact dumps into assistant content.
        const content = formatHistoryContent(item)
        if (!content.trim() && toolCalls.length === 0 && !item.artifacts?.length) continue
        out.push({
            role: 'assistant',
            content,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        })
        if (item.artifacts?.length) {
            const note = formatOnScreenArtifactsNote(item.artifacts, {
                includeArtifactBodies: index === lastArtifactIndex,
            })
            // Always defer — flush before next assistant, merge into next user, or at end.
            if (note) pendingArtifactNote = note
        }
    }
    flushPendingArtifactNote()
    return out
}
