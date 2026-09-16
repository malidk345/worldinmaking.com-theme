import { DEVICE_NOTEBOOK_OWNER_KEY, getActiveOwnerKey, namespacedStorageKey, WIM_IDENTITY_EVENT } from './wim-identity'
import { applySm2, defaultSm2Schedule, isDue, type Sm2Grade, type Sm2Schedule } from './study-sm2'

export type StudyCard = Sm2Schedule & {
    id: string
    front: string
    back: string
    hint?: string
    tags?: string[]
}

export type StudyDeck = {
    id: string
    title: string
    cards: StudyCard[]
    updatedAt: string
}

const STORAGE_BASE = 'wim_study_decks_v1'

type Listener = (decks: StudyDeck[]) => void

let decks: StudyDeck[] = []
const listeners = new Set<Listener>()

function storageKey(): string {
    return namespacedStorageKey(STORAGE_BASE, getActiveOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY))
}

function newId(prefix: string): string {
    const rand = Math.random().toString(36).slice(2, 8)
    return `${prefix}-${Date.now().toString(36)}-${rand}`
}

function emit(): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY_NOW(), JSON.stringify({ decks, updatedAt: Date.now() }))
        } catch {
            /* quota */
        }
    }
    listeners.forEach((listener) => listener(decks))
}

function STORAGE_KEY_NOW(): string {
    return storageKey()
}

function load(): void {
    if (typeof window === 'undefined') {
        decks = []
        return
    }
    try {
        const raw = window.localStorage.getItem(storageKey())
        if (!raw) {
            decks = []
            return
        }
        const parsed = JSON.parse(raw) as { decks?: unknown }
        decks = Array.isArray(parsed.decks) ? parsed.decks.filter(isDeck) : []
    } catch {
        decks = []
    }
}

function isDeck(value: unknown): value is StudyDeck {
    if (!value || typeof value !== 'object') return false
    const row = value as StudyDeck
    return typeof row.id === 'string' && typeof row.title === 'string' && Array.isArray(row.cards)
}

function normalizeCard(raw: unknown, index: number, now = new Date()): StudyCard | null {
    if (!raw || typeof raw !== 'object') return null
    const row = raw as Record<string, unknown>
    const front = String(row.front || row.question || row.q || '').trim()
    const back = String(row.back || row.answer || row.a || '').trim()
    if (!front || !back) return null
    const schedule = defaultSm2Schedule(now)
    const tags = Array.isArray(row.tags) ? row.tags.map((tag) => String(tag).trim()).filter(Boolean) : undefined
    const hint = row.hint ? String(row.hint).trim() : undefined
    return {
        id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `card-${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
        front,
        back,
        hint: hint || undefined,
        tags: tags && tags.length ? tags : undefined,
        easiness: typeof row.easiness === 'number' && Number.isFinite(row.easiness) ? row.easiness : schedule.easiness,
        intervalDays: typeof row.intervalDays === 'number' && Number.isFinite(row.intervalDays) ? row.intervalDays : schedule.intervalDays,
        repetitions: typeof row.repetitions === 'number' && Number.isFinite(row.repetitions) ? row.repetitions : schedule.repetitions,
        dueAt: typeof row.dueAt === 'string' && row.dueAt ? row.dueAt : schedule.dueAt,
    }
}

load()

if (typeof window !== 'undefined') {
    window.addEventListener(WIM_IDENTITY_EVENT, () => {
        load()
        listeners.forEach((listener) => listener(decks))
    })
}

export const StudyDeckStore = {
    list(): StudyDeck[] {
        return decks
    },

    subscribe(listener: Listener): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },

    get(id: string): StudyDeck | undefined {
        return decks.find((deck) => deck.id === id)
    },

    upsert(deck: StudyDeck): StudyDeck {
        const next: StudyDeck = {
            ...deck,
            title: deck.title.trim() || 'Study Flashcards',
            cards: deck.cards,
            updatedAt: new Date().toISOString(),
        }
        const index = decks.findIndex((item) => item.id === next.id)
        if (index >= 0) decks = decks.map((item, i) => (i === index ? next : item))
        else decks = [next, ...decks]
        emit()
        return next
    },

    upsertFromToolResult(raw: unknown): StudyDeck | null {
        if (!raw || typeof raw !== 'object') return null
        const row = raw as Record<string, unknown>
        const cardsRaw = row.flashcards || row.cards || row.deck
        if (!Array.isArray(cardsRaw)) return null
        const now = new Date()
        const cards = cardsRaw.map((card, index) => normalizeCard(card, index, now)).filter((card): card is StudyCard => Boolean(card))
        if (!cards.length) return null
        const id =
            (typeof row.deck_id === 'string' && row.deck_id.trim()) ||
            (typeof row.id === 'string' && row.id.trim()) ||
            newId('deck')
        const existing = decks.find((deck) => deck.id === id)
        const mergedCards = existing
            ? cards.map((card) => {
                  const prev = existing.cards.find((item) => item.id === card.id || item.front === card.front)
                  return prev ? { ...card, easiness: prev.easiness, intervalDays: prev.intervalDays, repetitions: prev.repetitions, dueAt: prev.dueAt } : card
              })
            : cards
        return StudyDeckStore.upsert({
            id,
            title: String(row.deck_title || row.title || 'Study Flashcards'),
            cards: mergedCards,
            updatedAt: now.toISOString(),
        })
    },

    gradeCard(deckId: string, cardId: string, grade: Sm2Grade, now = new Date()): StudyDeck | undefined {
        const deck = decks.find((item) => item.id === deckId)
        if (!deck) return undefined
        const nextCards = deck.cards.map((card) => {
            if (card.id !== cardId) return card
            const scheduled = applySm2(card, grade, now)
            return { ...card, ...scheduled }
        })
        return StudyDeckStore.upsert({ ...deck, cards: nextCards })
    },

    dueCards(deckId?: string, now = new Date()): Array<{ deck: StudyDeck; card: StudyCard }> {
        const source = deckId ? decks.filter((deck) => deck.id === deckId) : decks
        const due: Array<{ deck: StudyDeck; card: StudyCard }> = []
        for (const deck of source) {
            for (const card of deck.cards) {
                if (isDue(card.dueAt, now)) due.push({ deck, card })
            }
        }
        if (due.length) return due
        if (deckId) {
            const deck = decks.find((item) => item.id === deckId)
            if (deck?.cards.length) {
                const oldest = [...deck.cards].sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))[0]
                if (oldest) return [{ deck, card: oldest }]
            }
        }
        return []
    },
}

export function parseStudyDeckId(path?: string | null): string | null {
    const raw = String(path || '')
    const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : ''
    const params = new URLSearchParams(query.split('#')[0])
    const id = params.get('deck') || params.get('id')
    return id && id.trim() ? id.trim() : null
}
