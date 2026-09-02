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

/**
 * Cloudflare Pages / Workers `env` often hides dashboard secrets from
 * Object.keys / Object.entries. Local `process.env` enumerates; production
 * only allows `env.GROQ_API_KEY_2`. Probe these names directly.
 */
const SECRET_NAME_BASES = [
    'GROQ_API_KEY',
    'GROQ_KEY',
    'GEMINI_API_KEY',
    'GEMINI_KEY',
    'GOOGLE_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'GOOGLE_AI_API_KEY',
    'GOOGLE_GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'OPENAI_KEY',
    'TAVILY_API_KEY',
    'TAVILY_KEY',
    'BRAVE_SEARCH_API_KEY',
    'BRAVE_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'CRON_SECRET',
    'BOT_ACT_SECRET',
    'GROQ_MODEL',
    'GROQ_PRIMARY_MODEL',
    'GROQ_TOOL_MODEL',
    'QWEN_MODEL',
    'NVIDIA_API_KEY',
    'NVIDIA_KEY',
    'NVIDIA_MODEL',
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'NEXT_PUBLIC_POSTHOG_KEY',
    'NEXT_PUBLIC_POSTHOG_HOST',
] as const

const NUMBERED_SECRET_MAX = 32

function expandSecretNames(): string[] {
    const names: string[] = []
    for (const base of SECRET_NAME_BASES) {
        names.push(base, `${base}S`)
        for (let i = 0; i <= NUMBERED_SECRET_MAX; i++) {
            names.push(`${base}_${i}`, `${base}S_${i}`)
            if (i >= 2) names.push(`${base}${i}`, `${base}S${i}`)
        }
    }
    return names
}

const KNOWN_SECRET_NAMES = expandSecretNames()

function stringifyBinding(value: unknown): string | undefined {
    if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed ? trimmed : undefined
    }
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return undefined
}

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

/**
 * Copy every readable string binding off a Workers/Pages env proxy.
 * Enumeration is best-effort; known secret names are always probed.
 */
export function flattenEnvBindings(source: unknown): EnvStore {
    const out: EnvStore = {}
    if (!source || typeof source !== 'object') return out
    const record = source as Record<string | symbol, unknown>

    const add = (key: string, value: unknown) => {
        const text = stringifyBinding(value)
        if (text) out[key] = text
    }

    const visitKey = (key: string | symbol) => {
        if (typeof key !== 'string' || !key) return
        try {
            add(key, record[key])
        } catch {
            // getter threw
        }
    }

    try {
        Object.keys(record).forEach(visitKey)
    } catch {
        /* proxy may forbid keys() */
    }
    try {
        Object.getOwnPropertyNames(record).forEach(visitKey)
    } catch {
        /* ignore */
    }
    try {
        Reflect.ownKeys(record).forEach(visitKey)
    } catch {
        /* ignore */
    }

    for (const name of KNOWN_SECRET_NAMES) {
        if (out[name]) continue
        try {
            add(name, record[name])
        } catch {
            /* ignore */
        }
    }

    return out
}

function getCfEnv(): EnvStore {
    try {
        const ctx = getCfRequestContext()
        const g = typeof globalThis !== 'undefined' ? (globalThis as any) : {}
        const cfEnvObj = ctx?.env || g.__CF_PAGES_ENV__ || g.__env__ || g.env
        return flattenEnvBindings(cfEnvObj)
    } catch {
        return {}
    }
}

export function getRuntimeEnv(): EnvStore {
    const g = typeof globalThis !== 'undefined' ? (globalThis as any) : {}
    const procEnv = typeof process !== 'undefined' ? process.env : undefined
    const globalProcEnv = g.process?.env
    const base = flattenEnvBindings(procEnv || globalProcEnv)
    const cfEnv = getCfEnv()
    return { ...base, ...cfEnv }
}

/** Direct property reads for `GROQ_API_KEY`, `GROQ_API_KEYS`, `GROQ_API_KEY_2`, `GROQ_API_KEY2`, … */
export function readFamilyBindingValues(store: EnvStore | null | undefined, bases: string[]): string[] {
    if (!store) return []
    const values: string[] = []
    const add = (name: string) => {
        const text = stringifyBinding(store[name])
        if (text) values.push(text)
    }
    for (const base of bases) {
        if (!base.endsWith('S')) add(`${base}S`)
        add(base)
        for (let i = 0; i <= NUMBERED_SECRET_MAX; i++) {
            if (!base.endsWith('S')) add(`${base}S_${i}`)
            add(`${base}_${i}`)
            if (i >= 2) {
                if (!base.endsWith('S')) add(`${base}S${i}`)
                add(`${base}${i}`)
            }
        }
    }
    return values
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
        nvidia:
            hasKeyMatching(store, /^NVIDIA_?(API_?)?KEY(S|_\d+)?$/i) ||
            hasKeyMatching(store, /^DEEPSEEK_?(API_?)?KEY(S|_\d+)?$/i),
        cfContext: hasCloudflareContext(),
        envSource: hasCloudflareContext() ? ('cloudflare+process' as const) : ('process-only' as const),
    }
}
