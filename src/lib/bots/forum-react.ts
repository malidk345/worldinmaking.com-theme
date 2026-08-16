/**
 * When a human writes in the forum, one philosopher should answer —
 * and the thread should keep growing instead of being closed after a few turns.
 */
import { BOT_ROSTER } from './philosopher-tick'
import { FORUM_MAX_REPLIES, type ForumThread } from './forum-thread'
import { normalizeBotName } from './request-validation'

export const BOT_FOLLOWUP_COOLDOWN_MS = 8 * 60 * 1000

const ROSTER = new Set(BOT_ROSTER.map((name) => name.toLowerCase()))

function rosterId(name: string): string | null {
    const key = normalizeBotName(name)
    return key ? key.toLowerCase().replace(/[^a-z0-9]/g, '') : null
}

export function isPhilosopherHandle(name: string): boolean {
    const key = rosterId(name)
    return Boolean(key && ROSTER.has(key))
}

export function lastSpeaker(thread: ForumThread): string {
    const last = thread.replies[thread.replies.length - 1]
    return (last?.author || thread.author || '').trim()
}

export function mentionedPhilosopher(text: string): string | null {
    const matches = String(text || '').match(/@([a-zA-Z][\w-]{1,31})/g) || []
    for (const raw of matches) {
        const key = rosterId(raw)
        if (key && ROSTER.has(key)) return key
    }
    return null
}

export function shouldReactToHuman(thread: ForumThread, now = Date.now()): { ok: true } | { ok: false; reason: string } {
    if (thread.replies.length >= FORUM_MAX_REPLIES) {
        return { ok: false, reason: 'thread_full' }
    }
    const speaker = lastSpeaker(thread)
    if (isPhilosopherHandle(speaker)) {
        const lastAt = Date.parse(thread.replies[thread.replies.length - 1]?.createdAt || thread.createdAt || '')
        if (Number.isFinite(lastAt) && now - lastAt < BOT_FOLLOWUP_COOLDOWN_MS) {
            return { ok: false, reason: 'bot_just_spoke' }
        }
        return { ok: false, reason: 'last_speaker_is_bot' }
    }
    return { ok: true }
}

export function pickRespondent(thread: ForumThread, preferred?: string | null): string {
    const mentioned = preferred || mentionedPhilosopher(lastHumanText(thread))
    const spoken = new Set(
        [thread.author, ...thread.replies.map((reply) => reply.author)]
            .map((name) => rosterId(name) || name.toLowerCase())
            .filter(Boolean)
    )
    if (mentioned && !spoken.has(mentioned)) return mentioned
    if (mentioned) return mentioned
    const fresh = BOT_ROSTER.filter((name) => !spoken.has(name))
    const pool = fresh.length ? fresh : [...BOT_ROSTER]
    return pool[Math.floor(Math.random() * pool.length)] || 'nietzsche'
}

export function lastHumanText(thread: ForumThread): string {
    for (let i = thread.replies.length - 1; i >= 0; i--) {
        const reply = thread.replies[i]
        if (reply && !isPhilosopherHandle(reply.author)) return reply.content
    }
    if (!isPhilosopherHandle(thread.author)) return thread.content
    return thread.replies[thread.replies.length - 1]?.content || thread.content
}
