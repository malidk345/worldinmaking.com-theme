import { test, expect } from '@playwright/test'
import { canOptimizeRemoteImage } from '../src/lib/next-image-hosts'

test.describe('next/image host allowlist', () => {
    test('allows configured CDNs and local paths', () => {
        expect(canOptimizeRemoteImage('https://res.cloudinary.com/x/image.png')).toBe(true)
        expect(canOptimizeRemoteImage('https://raw.githubusercontent.com/org/repo/img.png')).toBe(true)
        expect(canOptimizeRemoteImage('https://posthog.com/brand.png')).toBe(true)
        expect(canOptimizeRemoteImage('https://iydypisgfaksqkjdraiu.supabase.co/storage/v1/object/public/x.png')).toBe(
            true
        )
        expect(canOptimizeRemoteImage('/images/og/default.png')).toBe(true)
    })

    test('rejects arbitrary blog CDNs so next/image does not crash', () => {
        expect(
            canOptimizeRemoteImage(
                'https://www.filomythos.com/wp-content/uploads/2025/06/apollon_charles_meynier_filomythos.png'
            )
        ).toBe(false)
        expect(canOptimizeRemoteImage('https://example.com/photo.jpg')).toBe(false)
    })
})
