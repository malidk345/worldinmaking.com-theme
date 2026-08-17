import { test, expect } from '@playwright/test'
import { isUsableAvatarUrl, resolveUserOrPhilosopherAvatar } from '../src/lib/user-portraits'

test.describe('user portraits', () => {
    test('keeps a stored profile photo for ali instead of a missing portrait file', () => {
        const stored = 'https://lh3.googleusercontent.com/a/ali-photo'
        expect(resolveUserOrPhilosopherAvatar('ali', stored)).toBe(stored)
        expect(resolveUserOrPhilosopherAvatar('Ali', stored)).toBe(stored)
    })

    test('does not use the deleted mustafa-pixel path', () => {
        expect(isUsableAvatarUrl('/images/portraits/mustafa-pixel.png')).toBe(false)
        expect(resolveUserOrPhilosopherAvatar('ali', '/images/portraits/mustafa-pixel.png')).toBe('')
    })

    test('still maps philosopher handles to official busts', () => {
        expect(resolveUserOrPhilosopherAvatar('marx', null)).toBe('/philosophers/marx.png')
        expect(resolveUserOrPhilosopherAvatar('nietzsche', 'https://example.com/ignored.png')).toBe(
            'https://example.com/ignored.png'
        )
    })
})
