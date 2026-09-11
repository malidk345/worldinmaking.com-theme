import { isSafeEmbedSrc, normalizeEmbedSrc } from './embedUrl'

describe('normalizeEmbedSrc', () => {
    it('turns a YouTube watch link into an embed URL', () => {
        expect(normalizeEmbedSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
            'https://www.youtube.com/embed/dQw4w9WgXcQ'
        )
    })

    it('turns youtu.be into an embed URL', () => {
        expect(normalizeEmbedSrc('https://youtu.be/dQw4w9WgXcQ')).toBe(
            'https://www.youtube.com/embed/dQw4w9WgXcQ'
        )
    })

    it('turns a Vimeo page into the player URL', () => {
        expect(normalizeEmbedSrc('https://vimeo.com/123456789')).toBe(
            'https://player.vimeo.com/video/123456789'
        )
    })

    it('rejects javascript URLs', () => {
        expect(isSafeEmbedSrc('javascript:alert(1)')).toBe(false)
    })
})
