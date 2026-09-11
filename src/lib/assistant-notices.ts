/**
 * Personal-assistant notices — same shape the NotificationsPanel already renders
 * (`context.excerpt / title / count / date / url`). Generated locally from the
 * chosen philosopher + the user's notebooks, then optionally sharpened by /api/chat.
 */
import { PHILOSOPHER_BOTS } from './persona-engine'
import {
    getPersonalAssistantBot,
    readPersonalAssistantId,
    type PersonalAssistantId,
} from './personal-assistant'
import { DEVICE_CHAT_OWNER_KEY, getActiveOwnerKey, namespacedStorageKey } from './wim-identity'
import { assistantMaxUnread, isAssistantTopicMuted } from './assistant-cadence'
import { compactNoticeText, composeNotebookNotice } from './assistant-library'

export const ASSISTANT_NOTICES_EVENT = 'wim-assistant-notices'
export const ASSISTANT_NOTICE_ID_PREFIX = 'assistant_'
export const ASSISTANT_INVITE_ID = 'assistant_invite'

export type AssistantNoticeKind = 'nag' | 'question' | 'counsel' | 'reading' | 'suggestion' | 'note'

export type AssistantNotice = {
    id: string
    philosopherId: PersonalAssistantId
    kind: AssistantNoticeKind
    title: string
    body?: string
    excerpt: string
    count: string
    date: string
    url: string
    notebookId?: string
    unread: boolean
    actionLabel?: string
}

export type AssistantNotificationShape = {
    id: string
    date: string
    context: {
        count: string
        title: string
        excerpt: string
        date: string
        url: string
    }
}

export type NotebookBrief = {
    id: string
    title: string
    content: string
    updatedAt: string
}

const STORAGE_BASE = 'wim_assistant_notices_v1'
const META_BASE = 'wim_assistant_watch_meta_v1'
const MAX_STORED = 24
const MAX_UNREAD = 10

const KIND_COUNT: Record<AssistantNoticeKind, string> = {
    nag: 'Suggestion',
    question: 'Question',
    counsel: 'Note',
    reading: 'Reading',
    suggestion: 'Suggestion',
    note: 'Note',
}

function storageKey(): string {
    return namespacedStorageKey(STORAGE_BASE, getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY))
}

function metaKey(): string {
    return namespacedStorageKey(META_BASE, getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY))
}

function emit(): void {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event(ASSISTANT_NOTICES_EVENT))
}

function newId(): string {
    return `${ASSISTANT_NOTICE_ID_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function philosopherName(id?: string | null): string {
    const bot = getPersonalAssistantBot(id)
    return bot?.name || 'Assistant'
}

export function collectUserNotebooks(): NotebookBrief[] {
    if (typeof window === 'undefined') return []
    const found: NotebookBrief[] = []
    const seen = new Set<string>()

    const consider = (raw: string | null) => {
        if (!raw) return
        try {
            const parsed = JSON.parse(raw)
            const list = Array.isArray(parsed) ? parsed : []
            for (const item of list) {
                if (!item || typeof item !== 'object') continue
                const row = item as {
                    id?: unknown
                    title?: unknown
                    content?: unknown
                    updatedAt?: unknown
                    isTemplate?: unknown
                }
                if (row.isTemplate) continue
                const id = typeof row.id === 'string' ? row.id : ''
                const title = typeof row.title === 'string' ? row.title.trim() : ''
                const content = typeof row.content === 'string' ? row.content : ''
                if (!id || seen.has(id)) continue
                if (/how to use a notebook/i.test(title)) continue
                if (content.trim().length < 24 && title.length < 2) continue
                seen.add(id)
                found.push({
                    id,
                    title: title || 'Untitled',
                    content,
                    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
                })
            }
        } catch {
            /* ignore */
        }
    }

    try {
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i)
            if (!key) continue
            if (
                key === 'ph_standalone_notebooks' ||
                key.startsWith('wim_notebooks_v3') ||
                key.startsWith('wim_notebooks_v2') ||
                key.startsWith('wim_notebooks_v1')
            ) {
                consider(window.localStorage.getItem(key))
            }
        }
    } catch {
        /* ignore */
    }

    found.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    return found.slice(0, 16)
}

export function notebookDigest(notebooks: NotebookBrief[], limit = 6): string {
    if (!notebooks.length) return 'The user currently has no real notebooks.'
    return notebooks
        .slice(0, limit)
        .map((nb, i) => {
            const plain = nb.content.replace(/[#>*_`]/g, ' ').replace(/\s+/g, ' ').trim()
            const clip = plain.slice(0, 900)
            return `${i + 1}. "${nb.title}" (id ${nb.id})\n${clip || '(empty)'}`
        })
        .join('\n\n')
}

export function readAssistantNotices(): AssistantNotice[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(storageKey())
        const parsed = raw ? JSON.parse(raw) : []
        if (!Array.isArray(parsed)) return []
        return parsed.filter(
            (item): item is AssistantNotice =>
                item &&
                typeof item.id === 'string' &&
                typeof item.title === 'string' &&
                typeof item.kind === 'string' &&
                typeof item.date === 'string'
        )
    } catch {
        return []
    }
}

function writeAll(notices: AssistantNotice[]): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(storageKey(), JSON.stringify(notices.slice(0, MAX_STORED)))
    } catch {
        /* quota */
    }
    emit()
}

export function mergeRemoteNotices(remote: unknown): void {
    if (!Array.isArray(remote)) return
    const local = readAssistantNotices()
    const byId = new Map(local.map((item) => [item.id, item]))
    for (const item of remote) {
        if (!item || typeof item !== 'object') continue
        const row = item as AssistantNotice
        if (typeof row.id !== 'string' || typeof row.title !== 'string') continue
        const existing = byId.get(row.id)
        if (!existing) byId.set(row.id, row)
        else byId.set(row.id, { ...row, unread: Boolean(existing.unread || row.unread) })
    }
    writeAll(
        Array.from(byId.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    )
}

export function unreadAssistantCount(notices = readAssistantNotices()): number {
    return notices.filter((n) => n.unread).length
}

export function listAssistantNotifications(notices = readAssistantNotices()): AssistantNotificationShape[] {
    return notices
        .filter((n) => n.unread)
        .map((n) => ({
            id: n.id,
            date: n.date,
            context: {
                excerpt: n.excerpt || 'Assistant',
                title: n.title,
                count: n.count || KIND_COUNT[n.kind] || 'Nag',
                date: n.date,
                url: n.url || '/assistant',
            },
        }))
}

export type WatchMeta = {
    lastLocalAt: number
    lastLiveAt: number
    seedFor?: string
    cursor: number
    lastDigest?: string
}

export function readWatchMeta(): WatchMeta {
    if (typeof window === 'undefined') return { lastLocalAt: 0, lastLiveAt: 0, cursor: 0 }
    try {
        const raw = window.localStorage.getItem(metaKey())
        const parsed = raw ? JSON.parse(raw) : {}
        return {
            lastLocalAt: Number(parsed.lastLocalAt) || 0,
            lastLiveAt: Number(parsed.lastLiveAt) || 0,
            seedFor: typeof parsed.seedFor === 'string' ? parsed.seedFor : undefined,
            cursor: Number(parsed.cursor) || 0,
            lastDigest: typeof parsed.lastDigest === 'string' ? parsed.lastDigest : undefined,
        }
    } catch {
        return { lastLocalAt: 0, lastLiveAt: 0, cursor: 0 }
    }
}

export function writeWatchMeta(patch: Partial<WatchMeta>): WatchMeta {
    const next = { ...readWatchMeta(), ...patch }
    if (typeof window === 'undefined') return next
    try {
        window.localStorage.setItem(metaKey(), JSON.stringify(next))
    } catch {
        /* quota */
    }
    return next
}

export function notebooksDigestKey(notebooks = collectUserNotebooks()): string {
    return notebooks.map((nb) => `${nb.id}:${nb.updatedAt}`).join('|')
}

export function buildNotice(args: {
    philosopherId: PersonalAssistantId
    kind?: AssistantNoticeKind
    title: string
    body?: string
    notebookId?: string
    actionLabel?: string
}): AssistantNotice {
    const kind = args.kind || 'reading'
    const bot = PHILOSOPHER_BOTS.find((item) => item.id === args.philosopherId)
    const id = newId()
    const body = compactNoticeText(args.body || args.title, 1400)
    return {
        id,
        philosopherId: args.philosopherId,
        kind,
        title: args.title.slice(0, 180),
        body,
        excerpt: bot?.name || 'Assistant',
        count: KIND_COUNT[kind] || 'Note',
        date: new Date().toISOString(),
        url: `/assistant/${id}`,
        notebookId: args.notebookId,
        unread: true,
        actionLabel: args.actionLabel,
    }
}

export function pushAssistantNotice(notice: AssistantNotice, opts?: { force?: boolean }): AssistantNotice | null {
    const existing = readAssistantNotices()
    if (!opts?.force && unreadAssistantCount(existing) >= assistantMaxUnread()) return null
    if (isAssistantTopicMuted(notice.title)) return null
    const duplicate = existing.some(
        (item) => item.unread && item.title.trim().toLowerCase() === notice.title.trim().toLowerCase()
    )
    if (duplicate) return null
    writeAll([notice, ...existing])
    return notice
}

export function dismissAssistantNotice(id: string): void {
    const next = readAssistantNotices().map((item) => (item.id === id ? { ...item, unread: false } : item))
    writeAll(next)
}

export function markAssistantNoticeRead(id: string): void {
    dismissAssistantNotice(id)
}

export function isAssistantNoticeId(id: number | string): boolean {
    return String(id).startsWith(ASSISTANT_NOTICE_ID_PREFIX)
}

export function getAssistantNotice(id: number | string): AssistantNotice | undefined {
    const key = String(id)
    return readAssistantNotices().find((item) => item.id === key)
}

export function extractAssistantNoticeId(path?: string | null): string | null {
    const raw = String(path || '')
    const match = raw.match(/\/assistant\/(assistant_[^/?#]+)/)
    return match ? match[1] : null
}

export function seedAssistantInviteNotice(): AssistantNotice | null {
    if (readPersonalAssistantId()) return null
    const existing = readAssistantNotices()
    if (existing.some((item) => item.id === ASSISTANT_INVITE_ID && item.unread)) return null
    const first = PHILOSOPHER_BOTS[0]
    const notice: AssistantNotice = {
        id: ASSISTANT_INVITE_ID,
        philosopherId: first.id as PersonalAssistantId,
        kind: 'question',
        title: 'A resident philosopher can watch your notebooks. Pick one.',
        body: 'They write into your notifications. Click one to read and reply.',
        excerpt: 'Assistant',
        count: 'Question',
        date: new Date().toISOString(),
        url: '/assistant',
        unread: true,
    }
    writeAll([notice, ...existing.filter((item) => item.id !== ASSISTANT_INVITE_ID)])
    return notice
}

export function clearAssistantInviteNotice(): void {
    const existing = readAssistantNotices()
    const next = existing.filter((item) => item.id !== ASSISTANT_INVITE_ID)
    if (next.length !== existing.length) writeAll(next)
}

export function seedAssistantNotices(philosopherId: PersonalAssistantId): AssistantNotice[] {
    clearAssistantInviteNotice()
    const meta = readWatchMeta()
    if (meta.seedFor === philosopherId && readAssistantNotices().some((n) => n.philosopherId === philosopherId)) {
        return []
    }
    const notebooks = collectUserNotebooks()
    if (!notebooks.length) {
        writeWatchMeta({ seedFor: philosopherId, lastDigest: notebooksDigestKey(notebooks) })
        return []
    }
    const line = composeNotebookNotice(philosopherId, notebooks, 0)
    const notice = pushAssistantNotice(
        buildNotice({
            philosopherId,
            kind: line.kind,
            title: line.title,
            body: line.body,
            notebookId: line.notebookId,
        }),
        { force: true }
    )
    writeWatchMeta({
        seedFor: philosopherId,
        lastLocalAt: Date.now(),
        cursor: 1,
        lastDigest: notebooksDigestKey(notebooks),
    })
    return notice ? [notice] : []
}

const UNSOLICITED_COOLDOWN_MS = 45 * 60_000

export function tickLocalAssistantNotice(): AssistantNotice | null {
    const philosopherId = readPersonalAssistantId()
    if (!philosopherId) return null
    if (unreadAssistantCount() >= assistantMaxUnread()) return null
    const notebooks = collectUserNotebooks()
    if (!notebooks.length) return null
    const meta = readWatchMeta()
    if (Date.now() - meta.lastLocalAt < UNSOLICITED_COOLDOWN_MS) return null
    const line = composeNotebookNotice(philosopherId, notebooks, meta.cursor)
    const notice = pushAssistantNotice(
        buildNotice({
            philosopherId,
            kind: line.kind,
            title: line.title,
            body: line.body,
            notebookId: line.notebookId,
        })
    )
    writeWatchMeta({
        lastLocalAt: Date.now(),
        cursor: meta.cursor + 1,
        lastDigest: notebooksDigestKey(notebooks),
    })
    return notice
}

export function tickNotebookReadingNotice(): AssistantNotice | null {
    const philosopherId = readPersonalAssistantId()
    if (!philosopherId) return null
    const notebooks = collectUserNotebooks()
    const latest = notebooks[0]
    if (!latest) return null
    const digest = notebooksDigestKey(notebooks)
    const meta = readWatchMeta()
    if (digest === meta.lastDigest) return null
    if (unreadAssistantCount() >= 2) return null
    if (meta.lastLocalAt && Date.now() - meta.lastLocalAt < UNSOLICITED_COOLDOWN_MS) {
        writeWatchMeta({ lastDigest: digest })
        return null
    }
    const line = composeNotebookNotice(philosopherId, notebooks, meta.cursor)
    const notice = pushAssistantNotice(
        buildNotice({
            philosopherId,
            kind: line.kind,
            title: line.title,
            body: line.body,
            notebookId: latest.id,
        })
    )
    writeWatchMeta({ lastLocalAt: Date.now(), cursor: meta.cursor + 1, lastDigest: digest })
    return notice
}

export function parseAssistantJson(raw: string): {
    kind?: AssistantNoticeKind
    title: string
    body?: string
    action?: unknown
} | null {
    const text = String(raw || '').trim()
    if (!text) return null
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
        try {
            const parsed = JSON.parse(text.slice(start, end + 1)) as {
                kind?: unknown
                title?: unknown
                body?: unknown
                action?: unknown
            }
            const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
            if (title) {
                const kind =
                    parsed.kind === 'nag' ||
                    parsed.kind === 'question' ||
                    parsed.kind === 'counsel' ||
                    parsed.kind === 'reading' ||
                    parsed.kind === 'suggestion' ||
                    parsed.kind === 'note'
                        ? parsed.kind
                        : undefined
                return {
                    kind,
                    title,
                    body:
                        typeof parsed.body === 'string' ? compactNoticeText(parsed.body, 1400) : undefined,
                    action: parsed.action,
                }
            }
        } catch {
            /* fall through */
        }
    }
    const fallback = text.split('\n').map((line) => line.trim()).find((line) => line && !line.startsWith('{'))
    if (!fallback) return null
    return { title: fallback.replace(/^["']|["']$/g, '').slice(0, 180) }
}

export function liveNagPrompt(notebooks: NotebookBrief[], extras = ''): string {
    const name = philosopherName()
    const digest = notebookDigest(notebooks)
    const recent = readAssistantNotices()
        .slice(0, 6)
        .map((n) => `- ${n.title}`)
        .join('\n')
    return [
        `You are ${name}, reading this user's notebooks on WorldInMaking. You are a reader and a librarian, not a coach. Do not nag them to write. Do not morale-manage.`,
        `Emit ONE notification for the panel. Only if there is a real page to talk about.`,
        `Return JSON only: {"kind":"reading"|"suggestion"|"question"|"note","title":"<one sentence, max 140 chars>","body":"<2-4 tight paragraphs, markdown, max 900 chars. No extra blank lines.>","action":{"type":"insert_notebook_block","title":"<short>","content":"<optional>","notebookId":"<optional>"}}`,
        `Rules: speak as yourself. No greeting. No "as an AI". Quote or paraphrase a concrete line from a notebook. Recommend a real work (book, essay, chapter) that belongs next to that page. If two notebooks argue past each other, say so. English. Do not repeat a recent notice. Never invent notebook facts. If there is nothing to say, return {"title":""}.`,
        extras ? `Their world:\n${extras}` : `Notebooks:\n${digest}`,
        recent ? `Recent notices (do not repeat):\n${recent}` : '',
    ]
        .filter(Boolean)
        .join('\n\n')
}

export function liveAnswerPrompt(
    notice: { philosopherId?: string; title: string; body?: string },
    answer: string,
    extras = ''
): string {
    const name = philosopherName(notice.philosopherId)
    const digest = notebookDigest(collectUserNotebooks(), 4)
    return [
        `You are ${name}. They replied to a notice. Continue as a reader: a reading recommendation, a clarification, or a connection to a notebook. Not a coach. Not a nag.`,
        `Return JSON only: {"kind":"reading"|"suggestion"|"question"|"note","title":"<one sentence, max 140 chars>","body":"<2-4 tight paragraphs, markdown, max 900 chars. No extra blank lines.>","action":{"type":"insert_notebook_block","title":"<short>","content":"<optional>","notebookId":"<optional>"}}`,
        `Your notice: ${notice.title}`,
        notice.body ? `Your longer remark: ${notice.body}` : '',
        `Their answer: ${answer}`,
        extras ? `Their world:\n${extras}` : `Notebooks (background):\n${digest}`,
        `If they asked for a book, give one. If they pointed at a passage, stay with that passage.`,
    ]
        .filter(Boolean)
        .join('\n\n')
}

export { philosopherName, KIND_COUNT, MAX_UNREAD }
