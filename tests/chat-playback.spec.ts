import { test, expect } from '@playwright/test'
import { playbackChunks } from '../src/lib/ai/playback'

test.describe('chat playback chunks', () => {
    test('splits a finished reply on word boundaries', () => {
        const text = 'The agora is quiet and the windows sit in the center of the marble field today.'
        const chunks = playbackChunks(text, 24)
        expect(chunks.join('')).toBe(text)
        expect(chunks.length).toBeGreaterThan(1)
        expect(chunks.every((chunk) => chunk.length > 0)).toBe(true)
    })

    test('keeps short replies as a single frame', () => {
        expect(playbackChunks('Hello.', 56)).toEqual(['Hello.'])
        expect(playbackChunks('')).toEqual([])
    })
})
