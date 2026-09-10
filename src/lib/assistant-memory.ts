import { DEVICE_CHAT_OWNER_KEY, getActiveOwnerKey, namespacedStorageKey } from './wim-identity'
import type { PersonalAssistantId } from './personal-assistant'

export const ASSISTANT_MEMORY_EVENT = 'wim-assistant-memory'
const ANSWERS_BASE = 'wim_assistant_answers_v1'
const FACTS_BASE = 'wim_assistant_facts_v1'
const MAX_ANSWERS = 40
const MAX_FACTS = 24

export type AssistantAnswer = {
    id: string
    noticeId: string
    title: string
    text: string
    at: string
    philosopherId: PersonalAssistantId
}

export type AssistantFact = {
    id: string
    fact: string
    at: string
}

function answersKey(): string {
    return namespacedStorageKey(ANSWERS_BASE, getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY))
}

function factsKey(): string {
    return namespacedStorageKey(FACTS_BASE, getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY))
}

function emit(): void {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event(ASSISTANT_MEMORY_EVENT))
}

export function readAssistantAnswers(): AssistantAnswer[] {
    if (typeof window === 'undefined') return []
    try {
        const parsed = JSON.parse(window.localStorage.getItem(answersKey()) || '[]')
        if (!Array.isArray(parsed)) return []
        return parsed.filter(
            (item): item is AssistantAnswer =>
                item && typeof item.id === 'string' && typeof item.text === 'string' && typeof item.at === 'string'
        )
    } catch {
        return []
    }
}

export function writeAssistantAnswers(answers: AssistantAnswer[]): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(answersKey(), JSON.stringify(answers.slice(0, MAX_ANSWERS)))
        emit()
    } catch {
        /* quota */
    }
}

export function recordAssistantAnswer(answer: Omit<AssistantAnswer, 'id' | 'at'> & { id?: string; at?: string }): void {
    const row: AssistantAnswer = {
        id: answer.id || `ans_${Date.now().toString(36)}`,
        noticeId: answer.noticeId,
        title: answer.title.slice(0, 180),
        text: answer.text.slice(0, 600),
        at: answer.at || new Date().toISOString(),
        philosopherId: answer.philosopherId,
    }
    writeAssistantAnswers([row, ...readAssistantAnswers()])
}

export function readAssistantFacts(): AssistantFact[] {
    if (typeof window === 'undefined') return []
    try {
        const parsed = JSON.parse(window.localStorage.getItem(factsKey()) || '[]')
        if (!Array.isArray(parsed)) return []
        return parsed.filter(
            (item): item is AssistantFact => item && typeof item.id === 'string' && typeof item.fact === 'string'
        )
    } catch {
        return []
    }
}

export function writeAssistantFacts(facts: AssistantFact[]): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(factsKey(), JSON.stringify(facts.slice(0, MAX_FACTS)))
        emit()
    } catch {
        /* quota */
    }
}

export function rememberAssistantFact(fact: string): void {
    const text = fact.trim().slice(0, 220)
    if (!text) return
    const existing = readAssistantFacts()
    if (existing.some((item) => item.fact.toLowerCase() === text.toLowerCase())) return
    writeAssistantFacts([{ id: `fact_${Date.now().toString(36)}`, fact: text, at: new Date().toISOString() }, ...existing])
}

export function answersDigest(limit = 6): string {
    const rows = readAssistantAnswers().slice(0, limit)
    if (!rows.length) return 'They have not answered you yet.'
    return rows.map((row) => `- On "${row.title}": ${row.text}`).join('\n')
}

export function factsDigest(limit = 8): string {
    const rows = readAssistantFacts().slice(0, limit)
    if (!rows.length) return ''
    return rows.map((row) => `- ${row.fact}`).join('\n')
}

export function lastAnswersLookLikeDodges(): boolean {
    const recent = readAssistantAnswers().slice(0, 3)
    if (recent.length < 2) return false
    return recent.every((row) => row.text.trim().length < 48)
}
