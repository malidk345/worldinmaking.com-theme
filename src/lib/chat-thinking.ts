import type { AgentCheckpoint, HumanTurn, Message, ThinkingProcess, ToolTrace } from '../components/ClaudeWorkspaceChat/types'

export type PackedThinking = ThinkingProcess & {
    toolTrace?: ToolTrace[]
    humanTurn?: HumanTurn
    checkpoint?: AgentCheckpoint
}

function clip(value: unknown, max: number): string {
    return typeof value === 'string' ? value.slice(0, max) : ''
}

export function packMessageThinking(
    message: Pick<Message, 'thinkingProcess' | 'toolTrace' | 'humanTurn' | 'checkpoint'>
): PackedThinking | null {
    const traces = (message.toolTrace || []).slice(0, 16).map((trace) => ({
        id: clip(trace.id, 80),
        name: clip(trace.name, 80),
        status: trace.status,
        arguments: trace.arguments ? clip(trace.arguments, 2000) : undefined,
        result: trace.result ? clip(trace.result, 4000) : undefined,
        detail: trace.detail ? clip(trace.detail, 800) : undefined,
        thoughtSignature:
            trace.thoughtSignature && trace.thoughtSignature.length <= 24_000
                ? trace.thoughtSignature
                : undefined,
    }))
    const thinking = message.thinkingProcess
    const hasThinking = Boolean(
        thinking &&
            ((thinking.steps && thinking.steps.length > 0) ||
                thinking.durationSeconds > 0 ||
                thinking.tokenCount > 0 ||
                thinking.summary)
    )
    if (!hasThinking && traces.length === 0 && !message.humanTurn && !message.checkpoint) return null
    return {
        durationSeconds: thinking?.durationSeconds || 0,
        tokenCount: thinking?.tokenCount || 0,
        steps: thinking?.steps || [],
        summary: thinking?.summary,
        source: thinking?.source,
        ...(traces.length ? { toolTrace: traces } : {}),
        ...(message.humanTurn ? { humanTurn: message.humanTurn } : {}),
        ...(message.checkpoint ? { checkpoint: message.checkpoint } : {}),
    }
}

export function unpackMessageThinking(raw: PackedThinking | ThinkingProcess | null | undefined): {
    thinkingProcess?: ThinkingProcess
    toolTrace?: ToolTrace[]
    humanTurn?: HumanTurn
    checkpoint?: AgentCheckpoint
} {
    if (!raw) return {}
    const packed = raw as PackedThinking
    const toolTrace = Array.isArray(packed.toolTrace) && packed.toolTrace.length > 0 ? packed.toolTrace : undefined
    const hasThinking = Boolean(
        (packed.steps && packed.steps.length > 0) || packed.durationSeconds > 0 || packed.tokenCount > 0 || packed.summary
    )
    return {
        thinkingProcess: hasThinking
            ? {
                  durationSeconds: packed.durationSeconds || 0,
                  tokenCount: packed.tokenCount || 0,
                  steps: packed.steps || [],
                  summary: packed.summary,
                  source: packed.source,
              }
            : undefined,
        toolTrace,
        humanTurn: packed.humanTurn,
        checkpoint: packed.checkpoint,
    }
}
