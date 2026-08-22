import { test, expect } from '@playwright/test'
import { safeAuthNextPath, shouldIgnorePkceExchangeError } from '../src/lib/auth-callback'

test.describe('auth callback', () => {
    test('only allows same-origin relative next paths', () => {
        expect(safeAuthNextPath('/profile/me')).toBe('/profile/me')
        expect(safeAuthNextPath('/questions/hello')).toBe('/questions/hello')
        expect(safeAuthNextPath('/desktop')).toBe('/')
        expect(safeAuthNextPath('/login')).toBe('/')
        expect(safeAuthNextPath('/auth/callback')).toBe('/')
        expect(safeAuthNextPath('https://evil.example/phish')).toBe('/')
        expect(safeAuthNextPath('//evil.example')).toBe('/')
        expect(safeAuthNextPath(undefined)).toBe('/')
    })

    test('ignores a consumed PKCE verifier when the session already exists', () => {
        expect(
            shouldIgnorePkceExchangeError(
                'PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared.',
                true
            )
        ).toBe(true)
        expect(shouldIgnorePkceExchangeError('PKCE code verifier not found in storage.', false)).toBe(false)
        expect(shouldIgnorePkceExchangeError('Invalid login credentials', true)).toBe(false)
    })
})
