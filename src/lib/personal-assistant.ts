import { PHILOSOPHER_BOTS } from './persona-engine'
import { matchPhilosopherId, type PhilosopherId } from './philosopher-avatar'
import { DEVICE_CHAT_OWNER_KEY, getActiveOwnerKey, namespacedStorageKey } from './wim-identity'
import { patchLocalSettingsDefaultModel, readLocalSettings } from './workspace-local'

export const PERSONAL_ASSISTANT_EVENT = 'wim-personal-assistant-changed'
const STORAGE_BASE = 'wim_personal_assistant_v1'

export type PersonalAssistantId = PhilosopherId

export function isPersonalAssistantId(value: string | null | undefined): value is PersonalAssistantId {
    if (!value) return false
    return PHILOSOPHER_BOTS.some((bot) => bot.id === value)
}

function storageKey(): string {
    return namespacedStorageKey(STORAGE_BASE, getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY))
}

export function readPersonalAssistantId(): PersonalAssistantId | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(storageKey())
        const parsed = matchPhilosopherId(raw || '')
        return parsed && isPersonalAssistantId(parsed) ? parsed : null
    } catch {
        return null
    }
}

function syncWorkspaceDefaultModel(id: PersonalAssistantId): void {
    patchLocalSettingsDefaultModel(id)
}

export function writePersonalAssistantId(id: PersonalAssistantId): void {
    if (typeof window === 'undefined') return
    if (!isPersonalAssistantId(id)) return
    try {
        window.localStorage.setItem(storageKey(), id)
        syncWorkspaceDefaultModel(id)
        window.dispatchEvent(new CustomEvent(PERSONAL_ASSISTANT_EVENT, { detail: { id } }))
    } catch {
        /* quota */
    }
}

export function clearPersonalAssistantId(): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.removeItem(storageKey())
        window.dispatchEvent(new CustomEvent(PERSONAL_ASSISTANT_EVENT, { detail: { id: null } }))
    } catch {
        /* ignore */
    }
}

export function getPersonalAssistantBot(id?: string | null) {
    const resolved = id && isPersonalAssistantId(id) ? id : readPersonalAssistantId()
    if (!resolved) return null
    return PHILOSOPHER_BOTS.find((bot) => bot.id === resolved) || null
}

export function adoptWimAiDefaultIfNeeded(): PersonalAssistantId | null {
    const current = readPersonalAssistantId()
    if (current) return current
    if (typeof window === 'undefined') return null
    try {
        const parsed = readLocalSettings()
        const fromWimAi = matchPhilosopherId(String(parsed?.defaultModel || ''))
        if (fromWimAi && isPersonalAssistantId(fromWimAi)) {
            writePersonalAssistantId(fromWimAi)
            return fromWimAi
        }
    } catch {
        /* ignore */
    }
    return null
}
