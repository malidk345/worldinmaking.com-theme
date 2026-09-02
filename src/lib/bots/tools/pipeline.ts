/**
 * PostHog-inspired Node State Machine for Agent Tool Execution.
 *
 * Replaces fragile monolithic for-loops with a typed, explicit State Graph:
 *   [START] -> DecisionNode <-> ToolsNode -> SynthesisNode -> [COMPLETE]
 *                    |
 *                    v (on empty / fatal)
 *              FallbackNode
 *
 * Edge-runtime safe (Cloudflare Pages / Next.js Edge).
 */

import type { AiCitation } from '../../ai/contracts'
import type { ArtifactDocument } from '../../artifacts/kinds'
import { executeToolCall, resolveToolName, type ToolCall } from './execute'
import type { HostOsAction, HostSnapshot } from './host'
import { toolResultSummary, toolStatusLabel } from './labels'
import type { EnvStore } from '../runtime-env'
import type { GeminiPart } from './gemini'

export type ChatMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
        thoughtSignature?: string
    }>
    tool_call_id?: string
    geminiModelParts?: GeminiPart[]
}

export type ToolEvent = {
    id: string
    name: string
    status: 'running' | 'done' | 'error'
    detail?: string
    arguments?: string
    result?: string
    thoughtSignature?: string
}

export type CompletionRound =
    | { ok: true; content: string; toolCalls: ToolCall[]; modelParts?: GeminiPart[]; reasoning?: string }
    | { ok: false; detail: string; status?: number }

export type AgentPhase = 'decision' | 'tools' | 'synthesis' | 'complete' | 'failed'

export interface AgentState {
    phase: AgentPhase
    messages: ChatMessage[]
    currentToolCalls: ToolCall[]
    currentModelParts?: GeminiPart[]
    artifacts: ArtifactDocument[]
    citations: AiCitation[]
    actions: HostOsAction[]
    scratchpad: Array<{ note: string; source?: string }>
    todos: Array<{ id: string; title: string; status: 'pending' | 'in_progress' | 'completed' }>
    usedTools: boolean
    usedWebSearch: boolean
    publicText: string
    thinkingText: string
    stepCount: number
    maxSteps: number
    provider: string
    error?: string
}

export interface AgentPipelineParams {
    complete: (input: {
        messages: ChatMessage[]
        toolChoice: 'auto' | 'none' | 'web_search'
        onToken?: (text: string) => void
    }) => Promise<CompletionRound>
    baseMessages: ChatMessage[]
    onToken?: (text: string) => void
    onTool?: (event: ToolEvent) => void
    provider: string
    env?: EnvStore
    host?: HostSnapshot
    forceWebSearch?: boolean
    holdPublicUntilCitations?: boolean
    maxSteps?: number
}

export interface AgentPipelineResult {
    ok: boolean
    usedTools: boolean
    usedWebSearch: boolean
    text: string
    artifacts: ArtifactDocument[]
    citations: AiCitation[]
    actions: HostOsAction[]
    provider: string
    error?: string
    status?: 'done' | 'tools-rejected' | 'auth' | 'failed'
}

/**
 * Extracts a viable answer if the model generated everything within thinking tags
 * but forgot to emit a clean public tail after </thinking>.
 */
export function extractFallbackAnswerFromThinking(thinking: string): string {
    if (!thinking) return ''
    const clean = thinking
        .replace(/<\/?(?:thinking|think|critique|synthesis|analysis|reflection)[^>]*>/gi, ' ')
        .trim()
    if (!clean) return ''
    return clean
}

/**
 * Decision Node: Prompts the model to either select tools or produce a public answer.
 */
async function runDecisionNode(state: AgentState, params: AgentPipelineParams): Promise<void> {
    const isLastStep = state.stepCount >= state.maxSteps - 1
    const toolChoice: 'auto' | 'none' | 'web_search' = isLastStep
        ? 'none'
        : state.stepCount === 0 && params.forceWebSearch
          ? 'web_search'
          : 'auto'

    const emitPublic = (text: string) => {
        if (!text) return
        if (params.holdPublicUntilCitations && state.citations.length === 0) return
        params.onToken?.(text)
    }

    let streamedChars = 0
    const round = await params.complete({
        messages: state.messages,
        toolChoice,
        onToken: (text) => {
            streamedChars += text.length
            emitPublic(text)
        },
    })

    state.stepCount += 1

    if (!round.ok) {
        state.error = round.detail
        state.phase = 'failed'
        return
    }

    if (round.reasoning) {
        state.thinkingText += round.reasoning
    }

    state.currentToolCalls = round.toolCalls || []
    state.currentModelParts = round.modelParts

    const roundContent = round.content || ''
    if (state.currentToolCalls.length === 0) {
        // No tools called in this round -> this is the final answer
        if (roundContent && streamedChars === 0) {
            emitPublic(roundContent)
        }
        state.publicText += roundContent
        state.phase = 'synthesis'
        return
    }

    // Tools were requested -> transition to Tools Node
    state.usedTools = true
    state.messages.push({
        role: 'assistant',
        content: roundContent || null,
        tool_calls: state.currentToolCalls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: { name: call.name, arguments: call.argumentsJson },
            thoughtSignature: call.thoughtSignature,
        })),
        geminiModelParts: state.currentModelParts,
    })

    state.phase = 'tools'
}

/**
 * Tools Node: Executes requested tools in parallel / sequence and feeds results back to state.
 */
async function runToolsNode(state: AgentState, params: AgentPipelineParams): Promise<void> {
    const calls = state.currentToolCalls
    state.currentToolCalls = []

    for (const call of calls) {
        const name = resolveToolName(call.name)
        params.onTool?.({
            id: call.id,
            name,
            status: 'running',
            arguments: call.argumentsJson.slice(0, 800),
            detail: toolStatusLabel(name, 'running'),
            thoughtSignature: call.thoughtSignature,
        })

        const executed = await executeToolCall(call, params.env, params.host)

        if (executed.artifact) {
            state.artifacts.push(executed.artifact)
        }
        if (executed.citations?.length) {
            state.citations.push(...executed.citations)
        }
        if (executed.action) {
            state.actions.push(executed.action)
        }
        if (name === 'web_search') {
            state.usedWebSearch = true
        }
        if (name === 'write_scratchpad' && executed.ok) {
            try {
                const parsed = JSON.parse(executed.result)
                if (parsed.note) {
                    state.scratchpad.push({ note: parsed.note, source: parsed.source })
                }
            } catch {
                state.scratchpad.push({ note: executed.result })
            }
        }
        if (name === 'todo_write' && executed.ok) {
            try {
                const parsed = JSON.parse(executed.result)
                if (Array.isArray(parsed.tasks)) {
                    state.todos = parsed.tasks
                }
            } catch {}
        }

        const summary = executed.summary || toolResultSummary(name, executed.ok, executed.result)
        params.onTool?.({
            id: call.id,
            name,
            status: executed.ok ? 'done' : 'error',
            arguments: call.argumentsJson.slice(0, 800),
            result: executed.result.slice(0, 1200),
            detail: summary,
            thoughtSignature: call.thoughtSignature,
        })

        state.messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: executed.result,
        })
    }

    // After tool execution, loop back to Decision Node unless step limit reached
    if (state.stepCount >= state.maxSteps) {
        state.phase = 'synthesis'
    } else {
        state.phase = 'decision'
    }
}

/**
 * Synthesis Node: Finalizes output, ensuring that thinking-only turns do not end empty.
 */
function runSynthesisNode(state: AgentState): void {
    if (!state.publicText.trim()) {
        // If public text is empty but we have tools or artifacts, that's already a product
        if (state.usedTools || state.artifacts.length > 0 || state.citations.length > 0) {
            state.phase = 'complete'
            return
        }

        // If model wrote everything inside thinking tags, recover the answer
        const recovered = extractFallbackAnswerFromThinking(state.thinkingText)
        if (recovered) {
            state.publicText = recovered
            state.phase = 'complete'
            return
        }
    }

    state.phase = 'complete'
}

/**
 * Main State Graph Runner (PostHog-style Agent Loop).
 */
export async function runAgentNodePipeline(params: AgentPipelineParams): Promise<AgentPipelineResult> {
    const maxSteps = params.maxSteps ?? 6
    const state: AgentState = {
        phase: 'decision',
        messages: params.baseMessages.map((item) => ({ ...item })),
        currentToolCalls: [],
        artifacts: [],
        citations: [],
        actions: [],
        scratchpad: [],
        todos: [],
        usedTools: false,
        usedWebSearch: false,
        publicText: '',
        thinkingText: '',
        stepCount: 0,
        maxSteps,
        provider: params.provider,
    }

    while (state.phase !== 'complete' && state.phase !== 'failed') {
        switch (state.phase) {
            case 'decision':
                await runDecisionNode(state, params)
                break
            case 'tools':
                await runToolsNode(state, params)
                break
            case 'synthesis':
                runSynthesisNode(state)
                break
        }
    }

    const hasProduct =
        Boolean(state.publicText.trim()) ||
        state.usedTools ||
        state.artifacts.length > 0 ||
        state.citations.length > 0

    return {
        ok: state.phase === 'complete' && hasProduct,
        usedTools: state.usedTools,
        usedWebSearch: state.usedWebSearch,
        text: state.publicText,
        artifacts: state.artifacts,
        citations: state.citations,
        actions: state.actions,
        provider: state.provider,
        error: state.error,
        status: state.phase === 'complete' ? 'done' : 'failed',
    }
}
