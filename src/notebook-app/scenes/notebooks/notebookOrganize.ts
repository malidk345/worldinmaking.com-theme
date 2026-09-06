export type NotebookKind = 'note' | 'daily'

export type NotebookOrganize = {
    folder?: string
    tags?: string[]
    kind?: NotebookKind
    dailyDate?: string
}

export type NotebookTask = {
    notebookId: string
    notebookTitle: string
    line: number
    text: string
    done: boolean
    due?: string
}

export type NotebookTaskGroup = {
    notebookId: string
    notebookTitle: string
    tasks: NotebookTask[]
}

const TASK_LINE = /^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/

export function todayKey(date = new Date()): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function formatDailyTitle(date = new Date()): string {
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
}

export function dateFromKey(key: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
    const date = new Date(`${key}T12:00:00`)
    return Number.isNaN(date.getTime()) ? null : date
}

/** Sunday-first labels, same order as PostHog LemonCalendar. */
export const CALENDAR_DAY_LABELS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'] as const

export function addCalendarMonths(anchor: Date, delta: number): Date {
    const year = anchor.getFullYear()
    const month = anchor.getMonth() + delta
    return new Date(year, month, 1, 12, 0, 0)
}

/** Month grid used by LemonCalendar: pad to full weeks, Sunday start unless `weekStartDay` is set. */
export function buildMonthWeeks(anchor: Date, weekStartDay = 0): Date[][] {
    const year = anchor.getFullYear()
    const month = anchor.getMonth()
    const startOfMonth = new Date(year, month, 1, 12, 0, 0)
    const endOfMonth = new Date(year, month + 1, 0, 12, 0, 0)
    const leading = (startOfMonth.getDay() - weekStartDay + 7) % 7
    const trailing = (weekStartDay + 6 - endOfMonth.getDay() + 7) % 7
    const cursor = new Date(year, month, 1 - leading, 12, 0, 0)
    const last = new Date(year, month + 1, 0 + trailing, 12, 0, 0)
    const weeks: Date[][] = []
    while (cursor.getTime() <= last.getTime()) {
        const week: Date[] = []
        for (let day = 0; day < 7; day++) {
            week.push(new Date(cursor))
            cursor.setDate(cursor.getDate() + 1)
        }
        weeks.push(week)
    }
    return weeks
}

export function parseTaskDue(text: string): string | undefined {
    const match = String(text || '').match(/\b(?:due|by)[:\s]+(\d{4}-\d{2}-\d{2})\b/i)
    return match?.[1]
}

export function folderDepth(folder: string): number {
    const parts = normalizeFolder(folder).split('/').filter(Boolean)
    return Math.max(0, parts.length - 1)
}

export function folderLeaf(folder: string): string {
    const parts = normalizeFolder(folder).split('/').filter(Boolean)
    return parts[parts.length - 1] || normalizeFolder(folder)
}

export function normalizeFolder(value?: string | null): string {
    return String(value || '')
        .replace(/[\\/]+/g, '/')
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean)
        .join('/')
}

export function normalizeTag(value: string): string {
    return value
        .trim()
        .replace(/^#/, '')
        .replace(/\s+/g, '-')
        .slice(0, 32)
}

export function uniqueTags(tags?: string[] | null): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of tags || []) {
        const tag = normalizeTag(raw)
        if (!tag) continue
        const key = tag.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push(tag)
    }
    return out
}

export function extractNotebookTasks(notebook: {
    id: string
    title?: string
    content?: string
}): NotebookTask[] {
    const lines = String(notebook.content || '').split('\n')
    const tasks: NotebookTask[] = []
    lines.forEach((line, index) => {
        const match = line.match(TASK_LINE)
        if (!match) return
        const text = match[3].trim() || 'Task'
        tasks.push({
            notebookId: notebook.id,
            notebookTitle: notebook.title || 'Untitled',
            line: index,
            text,
            done: match[2].toLowerCase() === 'x',
            due: parseTaskDue(text),
        })
    })
    return tasks
}

export function collectNotebookTasks(
    notebooks: Array<{ id: string; title?: string; content?: string; isTemplate?: boolean }>
): NotebookTask[] {
    return notebooks.filter((notebook) => !notebook.isTemplate).flatMap(extractNotebookTasks)
}

export function sortNotebookTasks(tasks: NotebookTask[]): NotebookTask[] {
    return [...tasks].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        const dueA = a.due || '9999-99-99'
        const dueB = b.due || '9999-99-99'
        if (dueA !== dueB) return dueA.localeCompare(dueB)
        const title = a.notebookTitle.localeCompare(b.notebookTitle)
        if (title) return title
        return a.line - b.line
    })
}

export function groupNotebookTasks(tasks: NotebookTask[]): NotebookTaskGroup[] {
    const groups: NotebookTaskGroup[] = []
    const indexById = new Map<string, number>()
    for (const task of tasks) {
        const existing = indexById.get(task.notebookId)
        if (existing !== undefined) {
            groups[existing].tasks.push(task)
            continue
        }
        indexById.set(task.notebookId, groups.length)
        groups.push({
            notebookId: task.notebookId,
            notebookTitle: task.notebookTitle,
            tasks: [task],
        })
    }
    return groups.map((group) => ({ ...group, tasks: sortNotebookTasks(group.tasks) }))
}

export function toggleTaskLine(content: string, lineIndex: number): string {
    const lines = String(content || '').split('\n')
    const line = lines[lineIndex]
    if (!line) return content
    if (/\[[xX]\]/.test(line)) {
        lines[lineIndex] = line.replace(/\[[xX]\]/, '[ ]')
        return lines.join('\n')
    }
    if (/\[ \]/.test(line)) {
        lines[lineIndex] = line.replace('[ ]', '[x]')
        return lines.join('\n')
    }
    return content
}

export function listNotebookFolders(
    notebooks: Array<{ folder?: string; isTemplate?: boolean }>
): string[] {
    const seen = new Set<string>()
    for (const notebook of notebooks) {
        if (notebook.isTemplate) continue
        const folder = normalizeFolder(notebook.folder)
        if (folder) seen.add(folder)
    }
    return [...seen].sort((a, b) => a.localeCompare(b))
}

export function listNotebookTags(notebooks: Array<{ tags?: string[]; isTemplate?: boolean }>): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const notebook of notebooks) {
        if (notebook.isTemplate) continue
        for (const tag of uniqueTags(notebook.tags)) {
            const key = tag.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            out.push(tag)
        }
    }
    return out.sort((a, b) => a.localeCompare(b))
}
