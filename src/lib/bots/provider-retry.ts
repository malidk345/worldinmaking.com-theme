/**
 * `/api/chat` turn-level recovery when every provider in the fallback chain failed.
 * Upstream outages come in short bursts; one delayed retry of the whole turn recovers
 * a blip without the user pressing Retry. Only safe before anything reached the user
 * and before any tool ran (tools can write notebooks / artifacts).
 */

export const PROVIDER_RETRY_DELAY_MS = 1_500

export type ProviderFailureCode = 'EMPTY_REPLY' | 'TOOLS_REQUIRED' | 'PROVIDER_UNAVAILABLE'

export function providerFailureCode(error: unknown): ProviderFailureCode {
    if (error === 'empty_public_reply') return 'EMPTY_REPLY'
    if (error === 'tools_required') return 'TOOLS_REQUIRED'
    return 'PROVIDER_UNAVAILABLE'
}

export function shouldRetryProviderFailure(opts: {
    code: ProviderFailureCode
    sentPublicText: boolean
    toolEventSeen: boolean
    aborted: boolean
}): boolean {
    if (opts.aborted || opts.sentPublicText || opts.toolEventSeen) return false
    return opts.code === 'PROVIDER_UNAVAILABLE'
}

/** Resolves after `ms`, or at once when `signal` aborts. */
export function waitUnlessAborted(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        if (signal.aborted) return resolve()
        const onAbort = () => {
            clearTimeout(timer)
            resolve()
        }
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort)
            resolve()
        }, ms)
        signal.addEventListener('abort', onAbort, { once: true })
    })
}
