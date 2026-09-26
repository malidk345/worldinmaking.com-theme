import { describe, expect, it } from 'vitest'
import { isCancelledRouteError, isSameUrlHardNavigationError } from './swallow-cancelled-route'

describe('isSameUrlHardNavigationError', () => {
    it('matches the Next.js same-URL hard navigation invariant', () => {
        const err = new Error(
            'Invariant: attempted to hard navigate to the same URL /workspace-chat https://www.worldinmaking.com/workspace-chat'
        )
        expect(isSameUrlHardNavigationError(err)).toBe(true)
        expect(isCancelledRouteError(err)).toBe(false)
    })

    it('does not match other route errors', () => {
        expect(isSameUrlHardNavigationError(new Error('Failed to load static props'))).toBe(false)
        expect(isSameUrlHardNavigationError(undefined)).toBe(false)
    })
})
