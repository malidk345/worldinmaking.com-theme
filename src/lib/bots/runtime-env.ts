/**
 * Runtime env for Cloudflare Pages (next-on-pages) + local next dev.
 * Secrets on CF live on getRequestContext().env — process.env is often empty.
 */
let getRequestContextFn: (() => any) | null = null
try {
    // Dynamic import/require to prevent Node.js ERR_PACKAGE_PATH_NOT_EXPORTED
    const cf = eval('require')('@cloudflare/next-on-pages')
    getRequestContextFn = cf?.getRequestContext || null
} catch {
    getRequestContextFn = null
}

export type EnvStore = Record<string, string | undefined>

export function getRuntimeEnv(): EnvStore {
    const base: EnvStore = { ...(process.env as EnvStore) }

    try {
        if (getRequestContextFn) {
            const ctx = getRequestContextFn()
            if (ctx?.env && typeof ctx.env === 'object') {
                for (const [k, v] of Object.entries(ctx.env)) {
                    if (v === undefined || v === null) continue
                    if (typeof v === 'string' && v.length > 0) {
                        base[k] = v
                    }
                }
            }
        }
    } catch {
        /* local next dev — process.env / .env.local only */
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
        if (getRequestContextFn) {
            getRequestContextFn()
            return true
        }
        return false
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
        cfContext: hasCloudflareContext(),
        envSource: hasCloudflareContext() ? ('cloudflare+process' as const) : ('process-only' as const),
    }
}
