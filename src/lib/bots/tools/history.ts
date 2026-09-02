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

const MAX_TURNS = 12
const MAX_VISIBLE = 2_000
const MAX_ARTIFACT_BODY = 4_000
const MAX_MESSAGE = 10_000
const MAX_ARTIFACTS_PER_TURN = 2
const MAX_TOOL_ARGS = 2_000
const MAX_TOOL_RESULT = 1_200
const MAX_OLD_TOOL_RESULT = 400

function clip(value: string, max: number): string {
    const text = String(value || '')
    return text.length <= max ? text : text.slice(0, max)
}

/** Prior artifacts stay in the thread so follow-ups can revise them. */
export function formatHistoryContent(item: HistoryTurn): string {
    const body = clip(item.content || '', MAX_VISIBLE)
    if (item.role !== 'assistant' || !item.artifacts?.length) return body
    const blocks = item.artifacts.slice(0, MAX_ARTIFACTS_PER_TURN).map((artifact) => {
        const title = clip(artifact.title || 'Untitled', 80)
        return `### ${artifact.type} "${title}"\n${clip(artifact.content || '', MAX_ARTIFACT_BODY)}`
    })
    return clip(
        `${body}\n\n[On-screen artifacts — revise with create_artifact using the same title]\n${blocks.join('\n\n')}`,
        MAX_MESSAGE
    )
}

/** Rebuild OpenAI tool_calls + role:tool turns from the client thread. */
export function compactToolHistory(history?: HistoryTurn[]): CompactedMessage[] {
    const out: CompactedMessage[] = []
    const window = (history || []).slice(-MAX_TURNS)
    const toolPositions = window
        .map((item, index) => (item.role === 'tool' ? index : -1))
        .filter((index) => index >= 0)
    const recentTools = new Set(toolPositions.slice(-4))
    for (let index = 0; index < window.length; index += 1) {
        const item = window[index]
        if (item.role === 'tool' && item.tool_call_id) {
            out.push({
                role: 'tool',
                tool_call_id: item.tool_call_id.slice(0, 80),
                content: clip(item.content || '', recentTools.has(index) ? MAX_TOOL_RESULT : MAX_OLD_TOOL_RESULT),
            })
            continue
        }
        if (item.role === 'user') {
            const content = clip(item.content || '', MAX_VISIBLE)
            if (content.trim()) out.push({ role: 'user', content })
            continue
        }
        if (item.role !== 'assistant') continue
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
        const content = formatHistoryContent(item)
        if (!content.trim() && toolCalls.length === 0) continue
        out.push({
            role: 'assistant',
            content,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        })
    }
    return out
}
