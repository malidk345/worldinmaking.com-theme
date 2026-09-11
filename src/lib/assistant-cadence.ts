import { DEVICE_CHAT_OWNER_KEY, getActiveOwnerKey, namespacedStorageKey } from './wim-identity'

export const ASSISTANT_CADENCE_EVENT = 'wim-assistant-cadence'
const STORAGE_BASE = 'wim_assistant_cadence_v1'

export type CadenceMode = 'rare' | 'normal' | 'nag'

export type AssistantCadence = {
    mode: CadenceMode
    quietHours: boolean
    silencedUntil: number
    mutedTopics: string[]
}

const DEFAULT_CADENCE: AssistantCadence = {
    mode: 'normal',
    quietHours: false,
    silencedUntil: 0,
    mutedTopics: [],
}

const INTERVALS: Record<CadenceMode, { localMs: number; liveMs: number; maxUnread: number }> = {
    rare: { localMs: 8 * 60_000, liveMs: 20 * 60_000, maxUnread: 4 },
    normal: { localMs: 90_000, liveMs: 5 * 60_000, maxUnread: 10 },
    nag: { localMs: 45_000, liveMs: 150_000, maxUnread: 16 },
}

function storageKey(): string {
    return namespacedStorageKey(STORAGE_BASE, getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY))
}

export function readAssistantCadence(): AssistantCadence {
    if (typeof window === 'undefined') return { ...DEFAULT_CADENCE }
    try {
        const raw = window.localStorage.getItem(storageKey())
        const parsed = raw ? JSON.parse(raw) : {}
        const mode: CadenceMode =
            parsed.mode === 'rare' || parsed.mode === 'nag' || parsed.mode === 'normal' ? parsed.mode : 'normal'
        return {
            mode,
            quietHours: Boolean(parsed.quietHours),
            silencedUntil: Number(parsed.silencedUntil) || 0,
            mutedTopics: Array.isArray(parsed.mutedTopics)
                ? parsed.mutedTopics.filter((t: unknown) => typeof t === 'string').slice(0, 24)
                : [],
        }
    } catch {
        return { ...DEFAULT_CADENCE }
    }
}

export function writeAssistantCadence(patch: Partial<AssistantCadence>): AssistantCadence {
    const next = { ...readAssistantCadence(), ...patch }
    if (typeof window === 'undefined') return next
    try {
        window.localStorage.setItem(storageKey(), JSON.stringify(next))
        window.dispatchEvent(new CustomEvent(ASSISTANT_CADENCE_EVENT, { detail: next }))
    } catch {
        /* quota */
    }
    return next
}

export function replaceAssistantCadence(next: AssistantCadence): void {
    writeAssistantCadence(next)
}

export function cadenceIntervals(mode = readAssistantCadence().mode) {
    return INTERVALS[mode] || INTERVALS.normal
}

export function assistantMaxUnread(): number {
    return cadenceIntervals().maxUnread
}

export function isAssistantQuiet(): boolean {
    const cadence = readAssistantCadence()
    if (cadence.silencedUntil && Date.now() < cadence.silencedUntil) return true
    if (!cadence.quietHours) return false
    const hour = new Date().getHours()
    return hour >= 23 || hour < 8
}

export function silenceAssistantFor(ms: number): void {
    writeAssistantCadence({ silencedUntil: Date.now() + Math.max(0, ms) })
}

export function muteAssistantTopic(raw: string): void {
    const topic = String(raw || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80)
    if (!topic) return
    const cadence = readAssistantCadence()
    if (cadence.mutedTopics.includes(topic)) return
    writeAssistantCadence({ mutedTopics: [topic, ...cadence.mutedTopics].slice(0, 24) })
}

export function isAssistantTopicMuted(title: string): boolean {
    const hay = String(title || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
    if (!hay) return false
    return readAssistantCadence().mutedTopics.some((topic) => topic && hay.includes(topic))
}
