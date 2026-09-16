import type { EnvStore } from '../runtime-env'

const MAX_CODE_BYTES = 64 * 1024
const DEFAULT_WORKER_URL = 'https://worldinmaking-storage.dursunkayamustafa.workers.dev'

function isClientAbort(signal: AbortSignal | undefined, err?: unknown): boolean {
    return (
        Boolean(signal?.aborted) ||
        (Boolean(signal) && err instanceof Error && err.name === 'AbortError')
    )
}

function workerUrl(env?: EnvStore): string {
    return (
        env?.NEXT_PUBLIC_STORAGE_WORKER_URL ||
        env?.STORAGE_WORKER_URL ||
        (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STORAGE_WORKER_URL : '') ||
        DEFAULT_WORKER_URL
    ).replace(/\/+$/, '')
}

function authToken(env?: EnvStore): string {
    return (
        env?.SUPABASE_SERVICE_ROLE_KEY ||
        env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        (typeof process !== 'undefined'
            ? process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            : '') ||
        ''
    )
}

export async function executeCodeSandbox(
    args: Record<string, unknown>,
    env?: EnvStore,
    signal?: AbortSignal
): Promise<{ ok: boolean; result: string; title?: string }> {
    const code = typeof args.code === 'string' ? args.code : ''
    const language = typeof args.language === 'string' ? args.language : 'javascript'
    const title = typeof args.title === 'string' ? args.title : undefined

    if (!code) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'code is required' }), title }
    }
    if (language !== 'javascript' && language !== 'math' && language !== 'logic') {
        return {
            ok: false,
            result: JSON.stringify({ ok: false, error: 'unsupported language, use javascript, math, or logic' }),
            title,
        }
    }
    if (new TextEncoder().encode(code).length > MAX_CODE_BYTES) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'code exceeds 64KB limit' }), title }
    }
    if (signal?.aborted) {
        return { ok: false, result: JSON.stringify({ ok: false, error: 'client request aborted' }), title }
    }

    const base = workerUrl(env)
    const token = authToken(env)
    if (!base) {
        return {
            ok: false,
            result: JSON.stringify({ ok: false, error: 'code sandbox unavailable' }),
            title,
        }
    }
    if (!token) {
        return {
            ok: false,
            result: JSON.stringify({ ok: false, error: 'Authentication key is not configured for code sandbox.' }),
            title,
        }
    }

    try {
        const res = await fetch(`${base}/eval`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ language, code }),
            signal,
        })

        if (signal?.aborted) {
            return { ok: false, result: JSON.stringify({ ok: false, error: 'client request aborted' }), title }
        }

        const data = (await res.json().catch(() => ({}))) as {
            ok?: boolean
            result?: string
            error?: string
            ms?: number
        }

        if (!res.ok || data.ok === false) {
            const error = data.error || `code sandbox failed (${res.status})`
            return { ok: false, result: JSON.stringify({ ok: false, error }), title }
        }

        const output = typeof data.result === 'string' ? data.result : ''
        const ms = typeof data.ms === 'number' && Number.isFinite(data.ms) ? data.ms : 0
        const formattedResult = `Execution time: ${ms.toFixed(2)}ms\n\n\`\`\`${language}\n${output}\n\`\`\``
        return { ok: true, result: formattedResult, title }
    } catch (error: unknown) {
        if (isClientAbort(signal, error)) {
            return { ok: false, result: JSON.stringify({ ok: false, error: 'client request aborted' }), title }
        }
        const message = error instanceof Error ? error.message : 'Execution failed'
        return { ok: false, result: JSON.stringify({ ok: false, error: message }), title }
    }
}
