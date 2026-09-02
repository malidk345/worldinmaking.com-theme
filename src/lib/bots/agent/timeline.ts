/**
 * Chronological thinking timeline.
 *
 * PostHog Max interleaves reasoning blocks and tool calls in arrival order
 * (getThinkingMessageFromResponse). WIM used to dump every tool first, then
 * thinking — this builder walks steps in stream order and enriches them from
 * the tool trace.
 */

import type { AgentNodeName } from './modes'

export type TimelineKind = 'reasoning' | 'tool' | 'plan' | 'node'

export type TimelineStatus = 'running' | 'done' | 'error'

export type TimelineTodo = {
    id: string
    title: string
    status: 'pending' | 'in_progress' | 'completed'
}

export type TimelineItem = {
    id: string
    kind: TimelineKind
    title: string
    detail?: string
    status: TimelineStatus
    toolName?: string
    args?: string
    result?: string
    todos?: TimelineTodo[]
}

export type TimelineStep = {
    id: string
    title: string
    detail?: string
    completed?: boolean
    source?: string
    kind?: TimelineKind
    toolName?: string
    arguments?: string
    result?: string
    status?: TimelineStatus
}

export type TimelineTrace = {
    id: string
    name: string
    status: TimelineStatus
    arguments?: string
    result?: string
    detail?: string
}

function parseTodos(raw?: string): TimelineTodo[] | undefined {
    if (!raw) return undefined
    try {
        const parsed = JSON.parse(raw) as { tasks?: unknown; todos?: unknown }
        const list = Array.isArray(parsed.tasks) ? parsed.tasks : Array.isArray(parsed.todos) ? parsed.todos : null
        if (!list) return undefined
        const todos = list
            .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
            .map((item, index) => ({
                id: String(item.id || `task_${index + 1}`),
                title: String(item.title || item.content || item.name || '').trim(),
                status: (['pending', 'in_progress', 'completed'].includes(String(item.status))
                    ? String(item.status)
                    : 'pending') as TimelineTodo['status'],
            }))
            .filter((item) => item.title)
        return todos.length ? todos : undefined
    } catch {
        return undefined
    }
}

function isToolStep(step: TimelineStep): boolean {
    if (step.kind === 'tool' || step.kind === 'plan') return true
    if (step.id.startsWith('tool-') || step.id === 'search-step' || step.id === 'host-search') return true
    return step.source === 'system_event' && Boolean(step.toolName)
}

function isNodeStep(step: TimelineStep): boolean {
    return step.kind === 'node' || step.id.startsWith('node-')
}

function toolIdFromStep(step: TimelineStep): string {
    if (step.id.startsWith('tool-')) return step.id.slice(5)
    return step.id
}

export function buildThinkingTimeline(steps: TimelineStep[], traces: TimelineTrace[] = []): TimelineItem[] {
    const items: TimelineItem[] = []
    const seenToolIds = new Set<string>()
    const tracesById = new Map(traces.map((trace) => [trace.id, trace]))

    for (const step of steps) {
        if (isNodeStep(step)) {
            items.push({
                id: step.id,
                kind: 'node',
                title: step.title || 'Working',
                detail: step.detail,
                status: step.status || (step.completed ? 'done' : 'running'),
            })
            continue
        }

        if (isToolStep(step)) {
            const toolId = toolIdFromStep(step)
            const trace = tracesById.get(toolId) || tracesById.get(step.id)
            const name = step.toolName || trace?.name || ''
            const args = step.arguments || trace?.arguments
            const result = step.result || trace?.result
            const status = step.status || trace?.status || (step.completed ? 'done' : 'running')
            const kind: TimelineKind = name === 'todo_write' || step.kind === 'plan' ? 'plan' : 'tool'
            const todos = kind === 'plan' ? parseTodos(args) || parseTodos(result) : undefined
            seenToolIds.add(toolId)
            if (trace) seenToolIds.add(trace.id)
            const row: TimelineItem = {
                id: kind === 'plan' ? 'plan-board' : step.id,
                kind,
                title: step.title || name,
                detail: step.detail && step.detail !== step.title ? step.detail : trace?.detail,
                status,
                toolName: name || undefined,
                args,
                result,
                todos,
            }
            if (kind === 'plan') {
                const existing = items.findIndex((item) => item.kind === 'plan')
                if (existing >= 0) {
                    items[existing] = {
                        ...items[existing],
                        ...row,
                        todos: todos || items[existing].todos,
                    }
                    continue
                }
            }
            items.push(row)
            continue
        }

        const detail = String(step.detail || '').trim()
        if (!detail || /^[.…]+$/.test(detail)) continue
        items.push({
            id: step.id,
            kind: 'reasoning',
            title: step.title || 'Thought',
            detail,
            status: step.completed ? 'done' : 'running',
        })
    }

    const activityOwned = steps.some(
        (step) =>
            step.kind === 'tool' ||
            step.kind === 'plan' ||
            step.kind === 'reasoning' ||
            step.kind === 'node' ||
            step.id.startsWith('thought-') ||
            step.id.startsWith('tool-')
    )

    for (const trace of traces) {
        if (seenToolIds.has(trace.id)) continue
        if (activityOwned) continue
        const kind: TimelineKind = trace.name === 'todo_write' ? 'plan' : 'tool'
        items.push({
            id: `trace-${trace.id}`,
            kind,
            title: trace.detail || trace.name,
            detail: trace.detail,
            status: trace.status,
            toolName: trace.name,
            args: trace.arguments,
            result: trace.result,
            todos: kind === 'plan' ? parseTodos(trace.arguments) || parseTodos(trace.result) : undefined,
        })
    }

    return items
}

export function shouldShowLiveThinkingIndicator(items: TimelineItem[], isLive: boolean): boolean {
    if (!isLive) return false
    if (items.some((item) => item.kind === 'reasoning')) return false
    if (items.some((item) => (item.kind === 'tool' || item.kind === 'plan') && item.status === 'running')) return false
    return true
}

export function latestLiveNode(steps: TimelineStep[]): AgentNodeName | undefined {
    for (let index = steps.length - 1; index >= 0; index -= 1) {
        const step = steps[index]
        if (!isNodeStep(step)) continue
        const title = `${step.title} ${step.id}`.toLowerCase()
        if (title.includes('tools')) return 'tools'
        if (title.includes('synthesis') || title.includes('answer')) return 'synthesis'
        return 'root'
    }
    return undefined
}
