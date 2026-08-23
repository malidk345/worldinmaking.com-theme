import { test, expect } from '@playwright/test'
import { canonicalWindowPath, isPlaceholderPath, repairWindowPath, stripPathNoise } from '../src/lib/window-path'

test.describe('window path', () => {
    test('strips query and trailing slash', () => {
        expect(stripPathNoise('/posts/foo/?x=1#h')).toBe('/posts/foo')
        expect(isPlaceholderPath('/posts/[slug]')).toBe(true)
        expect(isPlaceholderPath('/posts/hello-world')).toBe(false)
    })

    test('repair maps listing/placeholder to the live detail URL', () => {
        expect(repairWindowPath('/posts/[slug]', '/posts/hello-world')).toBe('/posts/hello-world')
        expect(repairWindowPath('/posts', '/posts/hello-world')).toBe('/posts/hello-world')
        expect(repairWindowPath('/questions', '/questions/42')).toBe('/questions/42')
        expect(repairWindowPath('/posts/kept', '/posts/other')).toBe('/posts/kept')
    })

    test('canonical path is a clean pathname', () => {
        expect(canonicalWindowPath('/questions/99/?a=1')).toBe('/questions/99')
    })
})
