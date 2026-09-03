/**
 * BYOK (Bring Your Own Key) Vault — WorldInMaking
 *
 * Secure client-side credential store for user-provided LLM API keys
 * (OpenAI, Anthropic Claude, Google Gemini, Groq, DeepSeek).
 *
 * Ensures zero-server persistence of private enterprise API keys.
 */

export interface ByokProviderConfig {
    providerId: 'gemini' | 'groq' | 'openai' | 'anthropic' | 'deepseek'
    name: string
    apiKey: string
    preferredModel?: string
    enabled: boolean
    lastTestedAt?: string
    status: 'idle' | 'valid' | 'invalid'
}

const STORAGE_KEY = 'wim_byok_vault_v1'

const DEFAULT_CONFIGS: Record<string, ByokProviderConfig> = {
    gemini: {
        providerId: 'gemini',
        name: 'Google Gemini',
        apiKey: '',
        preferredModel: 'gemini-2.0-flash',
        enabled: false,
        status: 'idle',
    },
    groq: {
        providerId: 'groq',
        name: 'Groq Cloud (Llama 3.3)',
        apiKey: '',
        preferredModel: 'llama-3.3-70b-versatile',
        enabled: false,
        status: 'idle',
    },
    openai: {
        providerId: 'openai',
        name: 'OpenAI (GPT-4o / o3-mini)',
        apiKey: '',
        preferredModel: 'gpt-4o',
        enabled: false,
        status: 'idle',
    },
    anthropic: {
        providerId: 'anthropic',
        name: 'Anthropic Claude 3.7 / 3.5',
        apiKey: '',
        preferredModel: 'claude-3-7-sonnet',
        enabled: false,
        status: 'idle',
    },
    deepseek: {
        providerId: 'deepseek',
        name: 'DeepSeek',
        apiKey: '',
        preferredModel: 'deepseek-chat',
        enabled: false,
        status: 'idle',
    },
}

export function loadByokConfigs(): Record<string, ByokProviderConfig> {
    if (typeof window === 'undefined') return DEFAULT_CONFIGS
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { ...DEFAULT_CONFIGS }
        const parsed = JSON.parse(raw) as Record<string, ByokProviderConfig>
        return {
            ...DEFAULT_CONFIGS,
            ...parsed,
        }
    } catch {
        return { ...DEFAULT_CONFIGS }
    }
}

export function saveByokConfig(config: ByokProviderConfig): void {
    if (typeof window === 'undefined') return
    try {
        const current = loadByokConfigs()
        current[config.providerId] = { ...config }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
        window.dispatchEvent(new CustomEvent('wim_byok_updated', { detail: current }))
    } catch (e) {
        console.error('Failed to save BYOK configuration', e)
    }
}

export function removeByokKey(providerId: string): void {
    if (typeof window === 'undefined') return
    const current = loadByokConfigs()
    if (current[providerId]) {
        current[providerId].apiKey = ''
        current[providerId].enabled = false
        current[providerId].status = 'idle'
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
        window.dispatchEvent(new CustomEvent('wim_byok_updated', { detail: current }))
    }
}

export type ByokPayload = {
    groq?: string
    gemini?: string
    openai?: string
    anthropic?: string
    deepseek?: string
}

/**
 * Active user API keys for the chat request body only.
 * Never put these on shared auth headers — they would leak onto unrelated
 * chat-remote calls and into CDN/access logs.
 */
export function getActiveByokPayload(): ByokPayload {
    const configs = loadByokConfigs()
    const payload: ByokPayload = {}
    for (const id of ['groq', 'gemini', 'openai', 'anthropic', 'deepseek'] as const) {
        const conf = configs[id]
        if (conf?.enabled && conf.apiKey.trim()) {
            payload[id] = conf.apiKey.trim()
        }
    }
    return payload
}

export function hasActiveByok(): boolean {
    return Object.keys(getActiveByokPayload()).length > 0
}

