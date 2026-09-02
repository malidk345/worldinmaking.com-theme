/**
 * Edge-safe graph checkpoint (LangGraph interrupt, without LangGraph).
 *
 * On ask_user the host snapshots the loop and stops. finalize_plan starts execution in the same turn.
 * The next request loads this snapshot and continues ROOT → TOOLS from the
 * same messages, todos, and mode. It does not start a new user turn.
 */

import type { AgentMode } from './modes'
import type { HumanTurn } from './human'

export type ResumeAction = 'run' | 'revise' | 'answer'

export type CheckpointMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
        thoughtSignature?: string
    }>
    tool_call_id?: string
}

export type AgentCheckpoint = {
    v: 1
    messages: CheckpointMessage[]
    todos: Array<{ id: string; title: string; status: 'pending' | 'in_progress' | 'completed' }>
    scratchpad: Array<{ note: string; source?: string }>
    agentMode: AgentMode
    stepCount: number
    usedTools: boolean
    usedWebSearch: boolean
    interrupt: HumanTurn
}

function clip(value: unknown, max: number): string {
    return typeof value === 'string' ? value.slice(0, max) : ''
}

function clipMessage(message: CheckpointMessage): CheckpointMessage {
    return {
        role: message.role,
        content: message.content == null ? null : clip(message.content, 4_000),
        tool_call_id: message.tool_call_id ? clip(message.tool_call_id, 80) : undefined,
        tool_calls: message.tool_calls?.slice(0, 8).map((call) => ({
            id: clip(call.id, 80),
            type: 'function' as const,
            function: {
                name: clip(call.function?.name, 80),
                arguments: clip(call.function?.arguments, 2_000),
            },
            thoughtSignature: call.thoughtSignature ? clip(call.thoughtSignature, 8_000) : undefined,
        })),
    }
}

export function snapshotCheckpoint(input: {
    messages: CheckpointMessage[]
    todos: AgentCheckpoint['todos']
    scratchpad: AgentCheckpoint['scratchpad']
    agentMode: AgentMode
    stepCount: number
    usedTools: boolean
    usedWebSearch: boolean
    interrupt: HumanTurn
}): AgentCheckpoint {
    return {
        v: 1,
        messages: input.messages.filter((message) => message.role !== 'system').slice(-16).map(clipMessage),
        todos: input.todos.slice(0, 24),
        scratchpad: input.scratchpad.slice(-12).map((item) => ({
            note: clip(item.note, 800),
            source: item.source ? clip(item.source, 120) : undefined,
        })),
        agentMode: input.agentMode,
        stepCount: input.stepCount,
        usedTools: input.usedTools,
        usedWebSearch: input.usedWebSearch,
        interrupt: input.interrupt,
    }
}

export function parseAgentCheckpoint(raw: unknown): AgentCheckpoint | undefined {
    if (!raw || typeof raw !== 'object') return undefined
    const row = raw as Record<string, unknown>
    if (row.v !== 1 || !Array.isArray(row.messages)) return undefined
    const messages: CheckpointMessage[] = []
    for (const item of row.messages.slice(0, 16)) {
        if (!item || typeof item !== 'object') continue
        const message = item as CheckpointMessage
        if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'tool' && message.role !== 'system') {
            continue
        }
        messages.push(clipMessage({
            role: message.role,
            content: typeof message.content === 'string' ? message.content : message.content === null ? null : '',
            tool_call_id: typeof message.tool_call_id === 'string' ? message.tool_call_id : undefined,
            tool_calls: Array.isArray(message.tool_calls) ? message.tool_calls : undefined,
        }))
    }
    const interrupt = row.interrupt
    if (!interrupt || typeof interrupt !== 'object') return undefined
    const human = interrupt as HumanTurn
    if (human.kind !== 'ask' && human.kind !== 'plan_approval') return undefined
    const todos = Array.isArray(row.todos)
        ? row.todos
              .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
              .slice(0, 24)
              .map((item, index) => ({
                  id: clip(item.id || `task_${index + 1}`, 40),
                  title: clip(item.title, 120),
                  status: (['pending', 'in_progress', 'completed'].includes(String(item.status))
                      ? String(item.status)
                      : 'pending') as 'pending' | 'in_progress' | 'completed',
              }))
              .filter((item) => item.title)
        : []
    const scratchpad = Array.isArray(row.scratchpad)
        ? row.scratchpad
              .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
              .slice(-12)
              .map((item) => ({
                  note: clip(item.note, 800),
                  source: typeof item.source === 'string' ? clip(item.source, 120) : undefined,
              }))
              .filter((item) => item.note)
        : []
    const agentMode = row.agentMode === 'plan' || row.agentMode === 'execute' || row.agentMode === 'ask' ? row.agentMode : 'ask'
    return {
        v: 1,
        messages,
        todos,
        scratchpad,
        agentMode,
        stepCount: Math.max(0, Math.min(12, Number(row.stepCount) || 0)),
        usedTools: Boolean(row.usedTools),
        usedWebSearch: Boolean(row.usedWebSearch),
        interrupt: {
            kind: human.kind,
            title: clip(human.title || 'Waiting', 80),
            status: human.status === 'pending' || human.status === 'answered' || human.status === 'approved' || human.status === 'revised'
                ? human.status
                : 'pending',
            questions: human.questions,
            plan: human.plan,
            summary: human.summary ? clip(human.summary, 400) : undefined,
        },
    }
}

export function parseResumeAction(value: unknown): ResumeAction | undefined {
    if (value === 'run' || value === 'revise' || value === 'answer') return value
    return undefined
}

export function resumeUserMessage(action: ResumeAction, payload?: string): string {
    if (action === 'run') {
        return 'The user approved the plan. Continue in execution mode. Follow the todo list. Mark the current step in_progress, do the work, then mark it completed. Do not wait for another approval.'
    }
    if (action === 'revise') {
        const note = clip(payload, 800)
        return note
            ? `The user asked to revise the plan: ${note}. Update todo_write, research if needed, then call finalize_plan again.`
            : 'The user asked to revise the plan. Update todo_write, then call finalize_plan again.'
    }
    const answer = clip(payload, 800) || '(no answer)'
    return `The user answered: ${answer}`
}

export function modeAfterResume(action: ResumeAction, previous: AgentMode): AgentMode {
    if (action === 'run') return 'execute'
    if (action === 'revise') return 'plan'
    return previous
}
