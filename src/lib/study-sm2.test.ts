import { describe, expect, it } from 'vitest'
import { applySm2, defaultSm2Schedule, isDue, qualityFromGrade } from './study-sm2'

describe('SM-2', () => {
    it('maps Again/Hard/Good/Easy onto SM-2 qualities', () => {
        expect(qualityFromGrade(1)).toBe(1)
        expect(qualityFromGrade(2)).toBe(3)
        expect(qualityFromGrade(3)).toBe(4)
        expect(qualityFromGrade(4)).toBe(5)
    })

    it('resets interval to 1 day on Again', () => {
        const now = new Date('2026-09-16T12:00:00.000Z')
        const next = applySm2({ easiness: 2.5, intervalDays: 6, repetitions: 3, dueAt: now.toISOString() }, 1, now)
        expect(next.repetitions).toBe(0)
        expect(next.intervalDays).toBe(1)
        expect(next.dueAt).toBe('2026-09-17T12:00:00.000Z')
    })

    it('increases easiness on Easy and uses 1 then 6 day intervals', () => {
        const now = new Date('2026-09-16T12:00:00.000Z')
        const first = applySm2(defaultSm2Schedule(now), 4, now)
        expect(first.repetitions).toBe(1)
        expect(first.intervalDays).toBe(1)
        expect(first.easiness).toBeGreaterThan(2.5)

        const second = applySm2(first, 3, new Date(first.dueAt))
        expect(second.repetitions).toBe(2)
        expect(second.intervalDays).toBe(6)
    })

    it('treats missing due dates as due', () => {
        expect(isDue('not-a-date')).toBe(true)
        expect(isDue(new Date(Date.now() + 86_400_000).toISOString())).toBe(false)
    })
})
