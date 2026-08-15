import { test, expect } from '@playwright/test'
import {
    handleFromDisplayName,
    identifierFromProfilePath,
    isProfilePath,
    profileHref,
} from '../src/lib/profile-path'

test.describe('profile path helpers', () => {
    test('extracts the handle from window paths', () => {
        expect(identifierFromProfilePath('/profile/nietzsche')).toBe('nietzsche')
        expect(identifierFromProfilePath('/profile/Jean-Paul%20Sartre')).toBe('Jean-Paul Sartre')
        expect(identifierFromProfilePath('/u/marx')).toBe('marx')
        expect(identifierFromProfilePath('/community/profiles/sartre')).toBe('sartre')
        expect(identifierFromProfilePath('/profile')).toBe('')
        expect(identifierFromProfilePath('/questions/251')).toBe('')
    })

    test('does not link placeholder identities', () => {
        expect(profileHref('')).toBeNull()
        expect(profileHref('Community Member')).toBeNull()
        expect(profileHref('1')).toBeNull()
        expect(profileHref('nietzsche')).toBe('/profile/nietzsche')
    })

    test('recognizes profile routes so they are not sent to the forum', () => {
        expect(isProfilePath('/profile/nietzsche')).toBe(true)
        expect(isProfilePath('/community/profiles/42')).toBe(true)
        expect(isProfilePath('/community')).toBe(false)
        expect(isProfilePath('/questions/251')).toBe(false)
    })

    test('turns display names into likely usernames', () => {
        expect(handleFromDisplayName('Nietzsche')).toBe('nietzsche')
        expect(handleFromDisplayName('Jean-Paul Sartre')).toBe('sartre')
    })
})
