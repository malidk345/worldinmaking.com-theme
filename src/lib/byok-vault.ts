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

/**
 * Returns active user custom API keys formatted for request headers.
 */
export function getActiveByokHeaders(): Record<string, string> {
    const configs = loadByokConfigs()
    const headers: Record<string, string> = {}

    for (const [provider, conf] of Object.entries(configs)) {
        if (conf.enabled && conf.apiKey.trim()) {
            headers[`x-byok-${provider}`] = conf.apiKey.trim()
            if (conf.preferredModel) {
                headers[`x-byok-${provider}-model`] = conf.preferredModel.trim()
            }
        }
    }

    return headers
}
