import { describe, expect, it } from 'vitest'
import { providerFailureCode, shouldRetryProviderFailure, waitUnlessAborted } from './provider-retry'

const base = {
    code: 'PROVIDER_UNAVAILABLE' as const,
    sentPublicText: false,
    toolEventSeen: false,
    aborted: false,
}

describe('provider-retry', () => {
    it('maps orchestrator errors to SSE codes', () => {
        expect(providerFailureCode('empty_public_reply')).toBe('EMPTY_REPLY')
        expect(providerFailureCode('tools_required')).toBe('TOOLS_REQUIRED')
        expect(providerFailureCode('429 resource_exhausted')).toBe('PROVIDER_UNAVAILABLE')
        expect(providerFailureCode(undefined)).toBe('PROVIDER_UNAVAILABLE')
    })

    it('retries a provider outage once, before anything reached the user', () => {
        expect(shouldRetryProviderFailure(base)).toBe(true)
    })

    it('never retries after public text, a tool event, or an abort', () => {
        expect(shouldRetryProviderFailure({ ...base, sentPublicText: true })).toBe(false)
        expect(shouldRetryProviderFailure({ ...base, toolEventSeen: true })).toBe(false)
        expect(shouldRetryProviderFailure({ ...base, aborted: true })).toBe(false)
    })

    it('does not retry empty replies or skipped live search', () => {
        expect(shouldRetryProviderFailure({ ...base, code: 'EMPTY_REPLY' })).toBe(false)
        expect(shouldRetryProviderFailure({ ...base, code: 'TOOLS_REQUIRED' })).toBe(false)
    })

    it('stops waiting when the turn aborts', async () => {
        const controller = new AbortController()
        const started = Date.now()
        const wait = waitUnlessAborted(10_000, controller.signal)
        controller.abort()
        await wait
        expect(Date.now() - started).toBeLessThan(1_000)
    })
})
