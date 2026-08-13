/**
 * Runtime env for Cloudflare Pages (next-on-pages) + local next dev.
 *
 * CRITICAL: In CF edge runtime, process.env is NOT populated with secrets.
 * Secrets bound in CF Pages dashboard are ONLY accessible via getRequestContext().env.
 * We use a static import with try/catch so local Node.js dev falls back gracefully.
 */

let getRequestContext: any = () => ({ env: {} })
// Instead of importing getRequestContext statically which breaks Client Components,
// or dynamically which breaks Webpack, we rely on the fact that standard nextjs builds inject ENV into process.env.
// If running inside true Cloudflare workers in production, the bindings must be assigned to process.env manually
// in a middleware or custom bootstrap since we're decoupling from the next-on-pages library in shared modules.

export type EnvStore = Record<string, string | undefined>

function getCfEnv(): Record<string, string> {
    try {
        const { env } = getRequestContext()
        if (env && typeof env === 'object') {
            const out: Record<string, string> = {}
            for (const [k, v] of Object.entries(env)) {
                if (typeof v === 'string' && v.length > 0) out[k] = v
            }
            return out
        }
    } catch {
        // Not in CF edge context (local dev) — silently ignore
    }
    return {}
}

export function getRuntimeEnv(): EnvStore {
    // Start with process.env (works locally, may be empty in CF edge for secrets)
    const base: EnvStore = { ...(process.env as EnvStore) }

    // Merge CF secrets on top — these are the authoritative values in production
    const cfEnv = getCfEnv()
    for (const [k, v] of Object.entries(cfEnv)) {
        base[k] = v
    }

    return base
}

export function envFrom(store: EnvStore, ...names: string[]): string {
    for (const name of names) {
        const v = store[name]
        if (v && String(v).trim()) return String(v).trim()
    }
    return ''
}

export function splitKeys(raw: string): string[] {
    return raw
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
}

export function hasCloudflareContext(): boolean {
    try {
        getRequestContext()
        return true
    } catch {
        return false
    }
}

export function getProviderKeyFlags(store: EnvStore) {
    return {
        groq: !!(envFrom(store, 'GROQ_API_KEYS', 'GROQ_API_KEY', 'GROQ_KEYS', 'GROQ_KEY')),
        openrouter: !!envFrom(store, 'OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY', 'OPENROUTER_KEY'),
        openai: !!envFrom(store, 'OPENAI_API_KEY', 'OPENAI_KEY'),
        gemini: !!envFrom(
            store,
            'GEMINI_API_KEYS',
            'GEMINI_API_KEY',
            'GEMINI_KEYS',
            'GEMINI_KEY',
            'GOOGLE_GENERATIVE_AI_API_KEY',
            'GOOGLE_API_KEY',
            'GOOGLE_AI_API_KEY',
            'GOOGLE_GEMINI_API_KEY',
        ),
        huggingface: !!envFrom(store, 'HUGGINGFACE_API_KEYS', 'HUGGINGFACE_API_KEY', 'HF_API_KEY', 'HF_TOKEN'),
        cfContext: hasCloudflareContext(),
        envSource: hasCloudflareContext() ? ('cloudflare+process' as const) : ('process-only' as const),
    }
}
