/**
 * Runtime env for Cloudflare Pages (next-on-pages) + local next dev.
 *
 * CRITICAL: In CF edge runtime, process.env is NOT populated with secrets.
 * Secrets bound in CF Pages dashboard are ONLY accessible via the
 * next-on-pages request context (same symbol as getRequestContext()).
 *
 * Do not use Function()/eval()/require() here — Next.js Edge webpack rejects
 * dynamic code evaluation at build time (`philosopher-bot` and other edge routes).
 * Reading the published CF symbol keeps webpack edge-safe and avoids bundling
 * the `@cloudflare/next-on-pages` CLI package.
 */

export type EnvStore = Record<string, string | undefined>

const CF_REQUEST_CONTEXT = Symbol.for('__cloudflare-request-context__')

type CfRequestContext = {
    env?: Record<string, unknown>
    [key: string]: unknown
}

function getCfRequestContext(): CfRequestContext | null {
    try {
        const ctx = (globalThis as typeof globalThis & {
            [CF_REQUEST_CONTEXT]?: CfRequestContext
        })[CF_REQUEST_CONTEXT]
        if (ctx && typeof ctx === 'object') return ctx
    } catch {
        // Not in CF edge context (local dev or client) — silently ignore
    }
    return null
}

function getCfEnv(): Record<string, string> {
    try {
        const ctx = getCfRequestContext()
        const env = ctx?.env
        if (env && typeof env === 'object') {
            const out: Record<string, string> = {}
            for (const [k, v] of Object.entries(env)) {
                if (typeof v === 'string' && v.length > 0) out[k] = v
            }
            return out
        }
    } catch {
        // Not in CF edge context
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
    // Case-insensitive fallback for Cloudflare Pages environment variables
    const lowerNames = names.map((n) => n.toLowerCase())
    for (const [k, v] of Object.entries(store || {})) {
        if (lowerNames.includes(k.toLowerCase()) && v && String(v).trim()) {
            return String(v).trim()
        }
    }
    return ''
}

export function splitKeys(raw: string): string[] {
    return raw
        .split(/[,;\n\r]+/)
        .map((k) => k.trim().replace(/^['"]+|['"]+$/g, ''))
        .filter(Boolean)
}

export function hasCloudflareContext(): boolean {
    try {
        const ctx = getCfRequestContext()
        return !!ctx
    } catch {
        return false
    }
}

/** Cloudflare Workers ExecutionContext.waitUntil, if this isolate exposes it. */
export function getWaitUntil(): ((promise: Promise<unknown>) => void) | null {
    try {
        const ctx = getCfRequestContext() as { ctx?: { waitUntil?: (promise: Promise<unknown>) => void } } | null
        const waitUntil = ctx?.ctx?.waitUntil
        if (typeof waitUntil === 'function') {
            return (promise) => waitUntil.call(ctx!.ctx, promise)
        }
    } catch {
        // Not in CF edge context
    }
    return null
}

function hasKeyMatching(store: EnvStore, pattern: RegExp): boolean {
    if (!store || typeof store !== 'object') return false
    for (const [k, v] of Object.entries(store)) {
        if (pattern.test(k) && typeof v === 'string' && v.trim()) return true
    }
    return false
}

export function getProviderKeyFlags(store: EnvStore) {
    return {
        groq: hasKeyMatching(store, /^GROQ_?(API_?)?KEY(S|_\d+)?$/i) || hasKeyMatching(store, /^GROQ_KEYS?(_\d+)?$/i),
        openai: hasKeyMatching(store, /^OPENAI_?(API_?)?KEY(S|_\d+)?$/i),
        gemini:
            hasKeyMatching(store, /^(GEMINI|GOOGLE)_?(API_?)?KEY(S|_\d+)?$/i) ||
            hasKeyMatching(store, /^GOOGLE_GENERATIVE_AI_API_KEY(S|_\d+)?$/i) ||
            hasKeyMatching(store, /^GOOGLE_AI_API_KEY(S|_\d+)?$/i),
        cfContext: hasCloudflareContext(),
        envSource: hasCloudflareContext() ? ('cloudflare+process' as const) : ('process-only' as const),
    }
}
