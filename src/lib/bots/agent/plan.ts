export type PlanStatus = 'pending' | 'in_progress' | 'completed'

export type PlanTodo = {
    id: string
    title: string
    status: PlanStatus
}

const RANK: Record<PlanStatus, number> = { pending: 0, in_progress: 1, completed: 2 }

function keyOf(todo: PlanTodo): string {
    return todo.title.trim().toLowerCase()
}

function findIncoming(prev: PlanTodo, incoming: PlanTodo[]): PlanTodo | undefined {
    return incoming.find((item) => item.id === prev.id) || incoming.find((item) => keyOf(item) === keyOf(prev))
}

/** Exactly one in_progress while anything remains open. Status never goes backwards. */
export function normalizePlan(todos: PlanTodo[]): PlanTodo[] {
    const next = todos
        .filter((todo) => todo.title.trim())
        .map((todo) => ({ id: todo.id, title: todo.title.trim(), status: todo.status }))
    let kept = false
    for (const todo of next) {
        if (todo.status !== 'in_progress') continue
        if (!kept) {
            kept = true
            continue
        }
        todo.status = 'pending'
    }
    if (!next.some((todo) => todo.status === 'in_progress')) {
        const firstOpen = next.find((todo) => todo.status === 'pending')
        if (firstOpen) firstOpen.status = 'in_progress'
    }
    return next
}

/**
 * Once a plan exists, later todo_write calls may only advance statuses.
 * A wholesale new list is treated as a rewrite attempt and discarded.
 */
export function mergePlan(prev: PlanTodo[], incoming: PlanTodo[]): PlanTodo[] {
    const next = incoming
        .filter((todo) => todo && todo.title && todo.title.trim())
        .map((todo, index) => ({
            id: String(todo.id || `task_${index + 1}`),
            title: todo.title.trim(),
            status: (['pending', 'in_progress', 'completed'].includes(todo.status) ? todo.status : 'pending') as PlanStatus,
        }))
    if (!prev.length) return normalizePlan(next)
    if (!next.length) return normalizePlan(prev)

    const matched = prev.filter((todo) => findIncoming(todo, next)).length
    const rewrite = matched < Math.ceil(prev.length / 2)

    if (rewrite) {
        return normalizePlan(
            prev.map((todo, index) => {
                const incomingItem = next[index]
                if (!incomingItem) return todo
                const status = RANK[incomingItem.status] >= RANK[todo.status] ? incomingItem.status : todo.status
                return { ...todo, status }
            })
        )
    }

    const merged = prev.map((todo) => {
        const incomingItem = findIncoming(todo, next)
        if (!incomingItem) return todo
        const status = RANK[incomingItem.status] >= RANK[todo.status] ? incomingItem.status : todo.status
        return { ...todo, status }
    })
    for (const incomingItem of next) {
        const exists = merged.some(
            (todo) => todo.id === incomingItem.id || keyOf(todo) === keyOf(incomingItem)
        )
        if (!exists) merged.push(incomingItem)
    }
    return normalizePlan(merged)
}

export function formatPlanBoard(todos: PlanTodo[]): string {
    if (!todos.length) return ''
    const current = todos.find((todo) => todo.status === 'in_progress')
    const lines = todos.map((todo, index) => {
        const mark = todo.status === 'completed' ? 'x' : todo.status === 'in_progress' ? '>' : ' '
        const pointer = todo.status === 'in_progress' ? '  ← do this now' : ''
        return `${index + 1}. [${mark}] ${todo.id}: ${todo.title}${pointer}`
    })
    const instruction = current
        ? `Work ONLY on "${current.title}". Do not rewrite this list. When that step is done, call todo_write with the SAME ids: mark it completed and the next pending item in_progress.`
        : 'All steps are completed. Write the user-visible answer. Do not create a new plan.'
    return `<plan_board>\nLocked plan — same ids on every todo_write.\n${lines.join('\n')}\n${instruction}\n</plan_board>`
}

export function withPlanBoard<T extends { role: string; content: string | null }>(messages: T[], todos: PlanTodo[]): T[] {
    const board = formatPlanBoard(todos)
    if (!board) return messages
    return messages.map((message, index) => {
        if (index !== 0 || message.role !== 'system') return message
        return { ...message, content: `${message.content || ''}\n\n${board}` }
    })
}

/** Fold plan, private thought, and host reminders into the system turn — never as a fake user message. */
export function withHostContext<T extends { role: string; content: string | null }>(
    messages: T[],
    input: {
        todos: PlanTodo[]
        thought?: string
        reminder?: string
        memories?: Array<{ fact: string; category?: string }>
    }
): T[] {
    const next = withPlanBoard(messages, input.todos)
    const blocks: string[] = []
    const thought = input.thought?.trim()
    if (thought) {
        blocks.push(
            `<private_thought>\n${thought.slice(0, 2_500)}\n</private_thought>\nUse this private thought when choosing tools. Do not repeat it in the user-visible answer.`
        )
    }
    const memories = (input.memories || []).filter((item) => item.fact?.trim()).slice(0, 12)
    if (memories.length) {
        blocks.push(
            `<memory>\n${memories
                .map((item) => `- ${item.category ? `[${item.category}] ` : ''}${item.fact.trim()}`)
                .join('\n')}\n</memory>`
        )
    }
    const reminder = input.reminder?.trim()
    if (reminder) {
        blocks.push(`<system_reminder>\n${reminder}\n</system_reminder>`)
    }
    if (!blocks.length) return next
    return next.map((message, index) => {
        if (index !== 0 || message.role !== 'system') return message
        return { ...message, content: `${message.content || ''}\n\n${blocks.join('\n\n')}` }
    })
}

export const PLAN_ACTIVITY_ID = 'plan-board'
