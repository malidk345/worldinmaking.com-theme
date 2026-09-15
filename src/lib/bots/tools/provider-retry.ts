/**
 * Provider fetch retry layer with exponential backoff and jitter.
 * Handles transient 429 (rate-limit) and 50x (gateway/server) errors during tool loop completions.
 * Edge-runtime safe (no Node-only modules).
 */

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new Error('client request aborted'))
            return
        }
        const timer = setTimeout(() => {
            if (signal) signal.removeEventListener('abort', onAbort)
            resolve()
        }, ms)
        const onAbort = () => {
            clearTimeout(timer)
            reject(new Error('client request aborted'))
        }
        if (signal) signal.addEventListener('abort', onAbort, { once: true })
    })
}

export interface RetryOptions {
    maxRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
    signal?: AbortSignal
}

/**
 * Executes an HTTP fetch with transient error retries (429, 500, 502, 503, 504).
 */
export async function fetchWithTransientRetry(
    input: RequestInfo | URL,
    init: RequestInit,
    options?: RetryOptions
): Promise<Response> {
    const maxRetries = options?.maxRetries ?? 2
    const baseDelayMs = options?.baseDelayMs ?? 400
    const maxDelayMs = options?.maxDelayMs ?? 1500
    const signal = options?.signal

    let attempt = 0
    const attempting = true;
    while (attempting) {
        if (signal?.aborted) {
            throw new Error('client request aborted')
        }

        try {
            const res = await fetch(input, init)

            // If successful or non-retryable error (e.g. 400 Bad Request, 401 Unauthorized), return response directly
            if (res.ok || !RETRYABLE_STATUS_CODES.has(res.status) || attempt >= maxRetries) {
                return res
            }

            // Retryable status code (429 or 50x)
            attempt += 1
            const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1))
            const jitter = Math.floor(Math.random() * 200)
            const delay = exponential + jitter

            await sleep(delay, signal)
        } catch (error) {
            if (signal?.aborted) throw error
            if (attempt >= maxRetries) throw error

            attempt += 1
            const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1))
            const jitter = Math.floor(Math.random() * 200)
            const delay = exponential + jitter

            await sleep(delay, signal)
        }
    }
    throw new Error('Unreachable retry state')
}
