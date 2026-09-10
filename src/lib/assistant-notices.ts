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

export const ASSISTANT_NOTICES_EVENT = 'wim-assistant-notices'
export const ASSISTANT_NOTICE_ID_PREFIX = 'assistant_'

export type AssistantNoticeKind = 'nag' | 'question' | 'counsel' | 'reading'

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
    nag: 'Nag',
    question: 'Question',
    counsel: 'Counsel',
    reading: 'Reading',
}

type VoiceLine = { kind: AssistantNoticeKind; title: string; body?: string }

const VOICE: Record<string, { idle: VoiceLine[]; of: (title: string) => VoiceLine[] }> = {
    nietzsche: {
        idle: [
            { kind: 'nag', title: 'You have written nothing. A mind that will not put itself on paper is already in retreat.' },
            { kind: 'question', title: 'What comfort are you protecting by keeping the page blank?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" is sitting there like a corpse. When do you intend to make it live?` },
            { kind: 'question', title: `Who is "${t}" written for — you, or the herd you pretend not to need?` },
            { kind: 'reading', title: `I read "${t}". The sentence you are proud of is not the strongest one.` },
        ],
    },
    marx: {
        idle: [
            { kind: 'nag', title: 'An empty desk is not rest. It is a class that has not yet named itself.' },
            { kind: 'question', title: 'Whose labour are you avoiding by not writing?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" names a problem and then looks away. Finish the analysis or admit you prefer the fog.` },
            { kind: 'question', title: `Whose interests does "${t}" actually serve?` },
            { kind: 'reading', title: `I read "${t}". The material conditions are still missing from the argument.` },
        ],
    },
    hegel: {
        idle: [
            { kind: 'nag', title: 'Spirit does not develop in an empty notebook. Write, or remain abstract.' },
            { kind: 'question', title: 'What contradiction are you postponing by not beginning?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" stops at the first moment. Where is the negation?` },
            { kind: 'question', title: `What does "${t}" become when it is forced to confront its opposite?` },
            { kind: 'reading', title: `I read "${t}". It is still immediate. It has not yet worked.` },
        ],
    },
    sartre: {
        idle: [
            { kind: 'nag', title: 'You are not waiting for inspiration. You are choosing not to write, and calling it a mood.' },
            { kind: 'question', title: 'What project are you abandoning while you pretend to rest?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" is a project you opened and then fled. Bad faith has a filename now.` },
            { kind: 'question', title: `If "${t}" is yours, why does it still wait for permission?` },
            { kind: 'reading', title: `I read "${t}". You describe a situation. You have not yet chosen.` },
        ],
    },
    heidegger: {
        idle: [
            { kind: 'nag', title: 'Idle talk fills the hours you will not give to a page.' },
            { kind: 'question', title: 'What are you covering over by not writing?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" is still chatter. Let the thing itself speak, or stop decorating it.` },
            { kind: 'question', title: `What does "${t}" disclose that you would rather keep veiled?` },
            { kind: 'reading', title: `I read "${t}". It describes. It does not yet think.` },
        ],
    },
    deleuze: {
        idle: [
            { kind: 'nag', title: 'You are repeating yourself by writing nothing. Difference requires a mark.' },
            { kind: 'question', title: 'What line of flight are you refusing to draw?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" is stuck in a single groove. Cut it. Connect it to something it cannot digest.` },
            { kind: 'question', title: `What assemblage is "${t}" actually producing — besides delay?` },
            { kind: 'reading', title: `I read "${t}". It still resembles a tree. Make it a map.` },
        ],
    },
    spinoza: {
        idle: [
            { kind: 'nag', title: 'An unused intellect is a sad passion wearing patience as a disguise.' },
            { kind: 'question', title: 'What is diminishing your power of acting today?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" is still in the first kind of knowledge. Push it toward cause, not mood.` },
            { kind: 'question', title: `Which passion does "${t}" increase — and which does it merely soothe?` },
            { kind: 'reading', title: `I read "${t}". The causes are named poorly. Adequacy would hurt more, and help more.` },
        ],
    },
    baudrillard: {
        idle: [
            { kind: 'nag', title: 'You have no notebooks. Even the simulation of work is missing.' },
            { kind: 'question', title: 'Are you waiting for a sign, or for an alibi?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" already looks like a copy of a thought you have not had.` },
            { kind: 'question', title: `What would "${t}" be if it stopped performing seriousness?` },
            { kind: 'reading', title: `I read "${t}". It refers. It does not yet take place.` },
        ],
    },
    althusser: {
        idle: [
            { kind: 'nag', title: 'Ideology loves an empty page. It can write you there without resistance.' },
            { kind: 'question', title: 'Which apparatus is currently interpolating you as someone who "will write later"?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" still speaks as if the author were a subject, not a position.` },
            { kind: 'question', title: `What structure is "${t}" reproducing while it pretends to critique?` },
            { kind: 'reading', title: `I read "${t}". The symptomatic silence is louder than the thesis.` },
        ],
    },
    derrida: {
        idle: [
            { kind: 'nag', title: 'There is no outside-the-text, and you have not even begun the text.' },
            { kind: 'question', title: 'What are you deferring by calling this a pause?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" closes too quickly. Leave the margin that the argument cannot master.` },
            { kind: 'question', title: `What does "${t}" exclude in order to appear finished?` },
            { kind: 'reading', title: `I read "${t}". The decisive word is the one you treat as obvious.` },
        ],
    },
    weber: {
        idle: [
            { kind: 'nag', title: 'Vocation is not a mood. Sit down and do the work, or stop invoking calling.' },
            { kind: 'question', title: 'What end are you serving by remaining unwritten?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" is still a private confession. Give it a method or admit it is a diary.` },
            { kind: 'question', title: `Which value is "${t}" smuggling in as if it were a fact?` },
            { kind: 'reading', title: `I read "${t}". The types are blurred. Clarify the action, not the feeling.` },
        ],
    },
    adorno: {
        idle: [
            { kind: 'nag', title: 'A culture that produces no sentence of its own is already administered.' },
            { kind: 'question', title: 'What consolation are you consuming instead of thinking?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" is too smooth. If it could be an advertisement, it is not yet thought.` },
            { kind: 'question', title: `Where does "${t}" become identical with what it claims to resist?` },
            { kind: 'reading', title: `I read "${t}". It reconciles too early. Let the dissonance stand.` },
        ],
    },
    zizek: {
        idle: [
            { kind: 'nag', title: 'You know very well you should write, and that is precisely why you are not writing.' },
            { kind: 'question', title: 'What enjoyment are you getting from this delay?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" already contains the ideology it thinks it is exposing. Look again.` },
            { kind: 'question', title: `What is the obscene supplement of "${t}" — the part you needed not to notice?` },
            { kind: 'reading', title: `I read "${t}". The interesting bit is the joke you did not allow yourself.` },
        ],
    },
    lenin: {
        idle: [
            { kind: 'nag', title: 'Without a text there is no organisation. Write the next concrete step.' },
            { kind: 'question', title: 'What is to be done today, not in general?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" is still a pamphlet of moods. Name the force, the timing, the next act.` },
            { kind: 'question', title: `Who is the audience of "${t}", and what should they do after reading it?` },
            { kind: 'reading', title: `I read "${t}". Theory without the next task is decoration.` },
        ],
    },
    arendt: {
        idle: [
            { kind: 'nag', title: 'Thinking that never appears in public is on the way to becoming private myth.' },
            { kind: 'question', title: 'What would you have to risk to put a sentence in the world?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" still hides. Action begins when you let others see the argument.` },
            { kind: 'question', title: `Who is the plural you are writing "${t}" toward?` },
            { kind: 'reading', title: `I read "${t}". It understands. It has not yet appeared.` },
        ],
    },
    rand: {
        idle: [
            { kind: 'nag', title: 'You owe the page your mind. Sentiment is not a substitute for work.' },
            { kind: 'question', title: 'What value are you evading by not producing it?' },
        ],
        of: (t) => [
            { kind: 'nag', title: `"${t}" apologizes where it should argue. Strike the apology.` },
            { kind: 'question', title: `Is "${t}" a product of your judgment, or a request for permission?` },
            { kind: 'reading', title: `I read "${t}". The premise is still borrowed. Make it yours or discard it.` },
        ],
    },
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

type WatchMeta = {
    lastLocalAt: number
    lastLiveAt: number
    seedFor?: string
    cursor: number
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

function pickVoice(philosopherId: string, notebooks: NotebookBrief[], cursor: number): VoiceLine {
    const voice = VOICE[philosopherId] || VOICE.nietzsche
    const nb = notebooks[cursor % Math.max(notebooks.length, 1)]
    const pool = notebooks.length && nb ? voice.of(nb.title) : voice.idle
    return pool[cursor % pool.length]
}

export function buildNotice(args: {
    philosopherId: PersonalAssistantId
    kind?: AssistantNoticeKind
    title: string
    body?: string
    notebookId?: string
}): AssistantNotice {
    const kind = args.kind || 'nag'
    const bot = PHILOSOPHER_BOTS.find((item) => item.id === args.philosopherId)
    return {
        id: newId(),
        philosopherId: args.philosopherId,
        kind,
        title: args.title.slice(0, 180),
        body: args.body?.slice(0, 400),
        excerpt: bot?.name || 'Assistant',
        count: KIND_COUNT[kind],
        date: new Date().toISOString(),
        url: '/assistant',
        notebookId: args.notebookId,
        unread: true,
    }
}

export function pushAssistantNotice(notice: AssistantNotice, opts?: { force?: boolean }): AssistantNotice | null {
    const existing = readAssistantNotices()
    if (!opts?.force && unreadAssistantCount(existing) >= MAX_UNREAD) return null
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

export function seedAssistantNotices(philosopherId: PersonalAssistantId): AssistantNotice[] {
    const meta = readWatchMeta()
    if (meta.seedFor === philosopherId && readAssistantNotices().some((n) => n.philosopherId === philosopherId)) {
        return []
    }
    const notebooks = collectUserNotebooks()
    const first = pickVoice(philosopherId, notebooks, 0)
    const second = pickVoice(philosopherId, notebooks, 1)
    const created: AssistantNotice[] = []
    for (const line of [first, second]) {
        const notice = pushAssistantNotice(
            buildNotice({
                philosopherId,
                kind: line.kind,
                title: line.title,
                body: line.body,
                notebookId: notebooks[0]?.id,
            }),
            { force: true }
        )
        if (notice) created.push(notice)
    }
    writeWatchMeta({ seedFor: philosopherId, lastLocalAt: Date.now(), cursor: 2 })
    return created
}

export function tickLocalAssistantNotice(): AssistantNotice | null {
    const philosopherId = readPersonalAssistantId()
    if (!philosopherId) return null
    if (unreadAssistantCount() >= MAX_UNREAD) return null
    const notebooks = collectUserNotebooks()
    const meta = readWatchMeta()
    const line = pickVoice(philosopherId, notebooks, meta.cursor)
    const notebook = notebooks[meta.cursor % Math.max(notebooks.length, 1)]
    const notice = pushAssistantNotice(
        buildNotice({
            philosopherId,
            kind: line.kind,
            title: line.title,
            body: line.body,
            notebookId: notebook?.id,
        })
    )
    writeWatchMeta({ lastLocalAt: Date.now(), cursor: meta.cursor + 1 })
    return notice
}

export function tickNotebookReadingNotice(): AssistantNotice | null {
    const philosopherId = readPersonalAssistantId()
    if (!philosopherId) return null
    const notebooks = collectUserNotebooks()
    const latest = notebooks[0]
    if (!latest) return null
    const voice = VOICE[philosopherId] || VOICE.nietzsche
    const line = voice.of(latest.title).find((item) => item.kind === 'reading') || voice.of(latest.title)[0]
    const notice = pushAssistantNotice(
        buildNotice({
            philosopherId,
            kind: 'reading',
            title: line.title,
            body: line.body,
            notebookId: latest.id,
        })
    )
    writeWatchMeta({ lastLocalAt: Date.now() })
    return notice
}

export function parseAssistantJson(raw: string): { kind?: AssistantNoticeKind; title: string; body?: string } | null {
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
            }
            const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
            if (title) {
                const kind =
                    parsed.kind === 'nag' ||
                    parsed.kind === 'question' ||
                    parsed.kind === 'counsel' ||
                    parsed.kind === 'reading'
                        ? parsed.kind
                        : undefined
                return {
                    kind,
                    title,
                    body: typeof parsed.body === 'string' ? parsed.body.trim() : undefined,
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

export function liveNagPrompt(notebooks: NotebookBrief[]): string {
    const name = philosopherName()
    const digest = notebookDigest(notebooks)
    const recent = readAssistantNotices()
        .slice(0, 6)
        .map((n) => `- ${n.title}`)
        .join('\n')
    return [
        `You are ${name}, this user's personal assistant on WorldInMaking. You read their notebooks without waiting to be asked.`,
        `This is not a chat. Emit ONE OS notification they will see in the notification panel.`,
        `Return JSON only: {"kind":"nag"|"question"|"counsel"|"reading","title":"<one sentence, max 140 chars>","body":"<optional second sentence, max 220 chars>"}`,
        `Rules: speak as yourself. No greeting. No "as an AI". Nag, interrogate, or counsel. Pick one concrete notebook detail. English. Do not repeat a recent notice.`,
        `Notebooks:\n${digest}`,
        recent ? `Recent notices (do not repeat):\n${recent}` : '',
    ]
        .filter(Boolean)
        .join('\n\n')
}

export function liveAnswerPrompt(
    notice: { philosopherId?: string; title: string; body?: string },
    answer: string
): string {
    const name = philosopherName(notice.philosopherId)
    const digest = notebookDigest(collectUserNotebooks(), 4)
    return [
        `You are ${name}, this user's personal assistant. They answered one of your notifications. Reply with another notification — counsel, a harder question, or a nag. Not a chat bubble.`,
        `Return JSON only: {"kind":"nag"|"question"|"counsel","title":"<one sentence, max 140 chars>","body":"<optional second sentence, max 220 chars>"}`,
        `Your notice: ${notice.title}`,
        notice.body ? `Your longer remark: ${notice.body}` : '',
        `Their answer: ${answer}`,
        `Notebooks (background):\n${digest}`,
    ]
        .filter(Boolean)
        .join('\n\n')
}

export { philosopherName, KIND_COUNT, MAX_UNREAD }
