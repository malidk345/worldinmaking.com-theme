/**
 * Host-owned process log (PostHog thread items, not a UI reconstruction).
 *
 * The agent graph emits one ordered stream: node → thought tokens → tools → node → …
 * The client appends. It does not merge thinkingProcess.steps with toolTrace.
 */

export type AgentActivityKind = 'node' | 'thought' | 'tool' | 'plan'

export type AgentActivityStatus = 'running' | 'done' | 'error'

export type AgentActivity = {
    seq: number
    kind: AgentActivityKind
    id: string
    status: AgentActivityStatus
    title?: string
    delta?: string
    detail?: string
    toolName?: string
    arguments?: string
    result?: string
    node?: 'root' | 'tools' | 'synthesis'
}

export function createActivityClock() {
    let seq = 0
    return {
        next(partial: Omit<AgentActivity, 'seq'>): AgentActivity {
            seq += 1
            return { seq, ...partial }
        },
    }
}

export type ProcessItem = {
    id: string
    kind: AgentActivityKind
    title: string
    detail?: string
    status: AgentActivityStatus
    toolName?: string
    args?: string
    result?: string
    seq: number
}

export function applyAgentActivity(items: ProcessItem[], activity: AgentActivity): ProcessItem[] {
    const index = items.findIndex((item) => item.id === activity.id)
    if (activity.kind === 'thought') {
        const delta = activity.delta || ''
        if (index >= 0) {
            const current = items[index]
            const next = [...items]
            next[index] = {
                ...current,
                detail: `${current.detail || ''}${delta}`,
                status: activity.status,
                title: activity.title || current.title,
            }
            return next
        }
        if (!delta) return items
        return [
            ...items,
            {
                id: activity.id,
                kind: 'thought',
                title: activity.title || 'Thought',
                detail: delta,
                status: activity.status,
                seq: activity.seq,
            },
        ]
    }

    const row: ProcessItem = {
        id: activity.id,
        kind: activity.kind,
        title: activity.title || activity.toolName || activity.kind,
        detail: activity.detail,
        status: activity.status,
        toolName: activity.toolName,
        args: activity.arguments,
        result: activity.result,
        seq: activity.seq,
    }
    if (index < 0) return [...items, row]
    const next = [...items]
    next[index] = {
        ...next[index],
        ...row,
        detail: activity.detail ?? next[index].detail,
        args: activity.arguments ?? next[index].args,
        result: activity.result ?? next[index].result,
        seq: next[index].seq,
    }
    return next
}

export function activityFromToolEvent(
    event: {
        id: string
        name: string
        status: AgentActivityStatus
        detail?: string
        arguments?: string
        result?: string
    },
    seq: number
): AgentActivity {
    const plan = event.name === 'todo_write'
    return {
        seq,
        kind: plan ? 'plan' : 'tool',
        id: plan ? 'plan-board' : event.id.startsWith('tool-') ? event.id : `tool-${event.id}`,
        status: event.status,
        title: event.detail || event.name,
        detail: event.detail,
        toolName: event.name,
        arguments: event.arguments,
        result: event.result,
    }
}

export function processItemToThinkingStep(item: ProcessItem) {
    return {
        id: item.id,
        stepNumber: item.seq,
        title: item.title,
        detail: item.detail || '',
        completed: item.status === 'done',
        source: 'system_event' as const,
        kind: (item.kind === 'thought' ? 'reasoning' : item.kind) as 'reasoning' | 'tool' | 'plan' | 'node',
        toolName: item.toolName,
        arguments: item.args,
        result: item.result,
        status: item.status,
    }
}
