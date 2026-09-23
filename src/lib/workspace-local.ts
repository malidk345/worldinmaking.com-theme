/**
 * Owner-namespaced WIM AI projects + settings (parity with chat-local).
 * Global keys leaked project systemPrompt / prefs across logout before this module.
 */
import type { ProjectSpace, UserSettings } from '../components/ClaudeWorkspaceChat/types'
import {
    DEVICE_CHAT_OWNER_KEY,
    getActiveOwnerKey,
    getAuthUserId,
    namespacedStorageKey,
    WIM_IDENTITY_EVENT,
} from './wim-identity'

export const PROJECT_STORAGE_BASE = 'claude_workspace_projects_v7'
export const SETTINGS_STORAGE_BASE = 'claude_workspace_settings'

export const LEGACY_PROJECT_KEYS = [
    'claude_workspace_projects_v7',
    'claude_workspace_projects_v6',
    'claude_workspace_projects',
] as const

export const LEGACY_SETTINGS_KEYS = ['claude_workspace_settings'] as const

const DEFAULT_SETTINGS: UserSettings = {
    typewriterSpeed: 'smooth',
    defaultThinkingBudget: 'balanced',
    defaultModel: 'nietzsche',
    autoOpenArtifacts: false,
    soundEffects: false,
}

function ownerKey(): string {
    return getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY)
}

export function getProjectLsKey(): string {
    return namespacedStorageKey(PROJECT_STORAGE_BASE, ownerKey())
}

export function getSettingsLsKey(): string {
    return namespacedStorageKey(SETTINGS_STORAGE_BASE, ownerKey())
}

function parseProjects(raw: string | null): ProjectSpace[] | null {
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as unknown
        return Array.isArray(parsed) ? (parsed as ProjectSpace[]) : null
    } catch {
        return null
    }
}

function parseSettings(raw: string | null): Partial<UserSettings> | null {
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as unknown
        return parsed && typeof parsed === 'object' ? (parsed as Partial<UserSettings>) : null
    } catch {
        return null
    }
}

/** Read projects for the active owner. Never copy a previous guest/account cache into a signed-in user. */
export function readLocalProjects(fallback: ProjectSpace[] = []): ProjectSpace[] {
    if (typeof window === 'undefined') return fallback
    try {
        const fromNs = parseProjects(window.localStorage.getItem(getProjectLsKey()))
        if (fromNs) return fromNs
    } catch {
        /* ignore */
    }
    if (getAuthUserId()) return fallback
    for (const key of LEGACY_PROJECT_KEYS) {
        try {
            const saved = window.localStorage.getItem(key)
            const parsed = parseProjects(saved)
            if (!parsed) continue
            try {
                window.localStorage.setItem(getProjectLsKey(), saved as string)
            } catch {
                /* quota */
            }
            return parsed
        } catch {
            /* keep looking */
        }
    }
    return fallback
}

export function writeLocalProjects(projects: ProjectSpace[]): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(getProjectLsKey(), JSON.stringify(projects))
    } catch {
        /* quota */
    }
}

export function readLocalSettings(fallback: UserSettings = DEFAULT_SETTINGS): UserSettings {
    if (typeof window === 'undefined') return fallback
    let partial: Partial<UserSettings> | null = null
    try {
        partial = parseSettings(window.localStorage.getItem(getSettingsLsKey()))
    } catch {
        partial = null
    }
    if (!partial && !getAuthUserId()) {
        for (const key of LEGACY_SETTINGS_KEYS) {
            try {
                const saved = window.localStorage.getItem(key)
                const parsed = parseSettings(saved)
                if (!parsed) continue
                try {
                    window.localStorage.setItem(getSettingsLsKey(), saved as string)
                } catch {
                    /* quota */
                }
                partial = parsed
                break
            } catch {
                /* keep looking */
            }
        }
    }
    return partial ? { ...fallback, ...partial } : fallback
}

export function writeLocalSettings(settings: UserSettings): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(getSettingsLsKey(), JSON.stringify(settings))
    } catch {
        /* quota */
    }
}

/** Patch defaultModel on the active owner's settings (personal-assistant bridge). */
export function patchLocalSettingsDefaultModel(defaultModel: string): void {
    if (typeof window === 'undefined') return
    try {
        const current = readLocalSettings()
        writeLocalSettings({ ...current, defaultModel: defaultModel as UserSettings['defaultModel'] })
    } catch {
        /* ignore */
    }
}

/** Reset wipe: drop namespaced + legacy project/settings keys for this browser. */
export function clearLocalWorkspacePrefs(): void {
    if (typeof window === 'undefined') return
    const keys = new Set<string>([
        getProjectLsKey(),
        getSettingsLsKey(),
        ...LEGACY_PROJECT_KEYS,
        ...LEGACY_SETTINGS_KEYS,
    ])
    for (const key of keys) {
        try {
            window.localStorage.removeItem(key)
        } catch {
            /* ignore */
        }
    }
}

export function getDefaultWorkspaceSettings(): UserSettings {
    return { ...DEFAULT_SETTINGS }
}


export const WIM_AI_DRAFT_PROMPT_KEY = 'wim_ai_draft_prompt'
export const WIM_FORUM_DRAFT_KEY = 'wim_forum_topic_draft_v1'

let lastWorkspaceOwnerKey: string | null = null

/** Clear ephemeral global leftovers on owner change (draft prompt / forum session draft). Namespaced prefs switch via key. */
export function syncWorkspaceLocalForIdentity(): void {
    if (typeof window === 'undefined') return
    const next = getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY)
    if (lastWorkspaceOwnerKey !== null && lastWorkspaceOwnerKey !== next) {
        try {
            window.localStorage.removeItem(WIM_AI_DRAFT_PROMPT_KEY)
        } catch {
            /* ignore */
        }
        try {
            window.sessionStorage.removeItem(WIM_FORUM_DRAFT_KEY)
        } catch {
            /* ignore */
        }
    }
    lastWorkspaceOwnerKey = next
}

function installWorkspaceLocalIdentityGuard(): void {
    if (typeof window === 'undefined') return
    if (typeof window.addEventListener !== 'function') return
    const w = window as Window & { __wimWorkspaceLocalIdGuard?: boolean }
    if (w.__wimWorkspaceLocalIdGuard) return
    w.__wimWorkspaceLocalIdGuard = true
    lastWorkspaceOwnerKey = getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY)
    window.addEventListener(WIM_IDENTITY_EVENT, () => {
        syncWorkspaceLocalForIdentity()
    })
}

if (typeof window !== 'undefined') {
    installWorkspaceLocalIdentityGuard()
}
