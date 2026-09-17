import { describe, expect, it } from 'vitest'
import { stripExtractedArtifactMarkup, visibleStreamingReply } from './extractArtifacts'

describe('visibleStreamingReply', () => {
    it('keeps leading prose and hides a streaming tsx fence', () => {
        const streamed = [
            'A desk for the reading list.',
            '',
            '```tsx',
            'export default function ReadingDesk() {',
            '  return <div className="p-6">Panel</div>',
        ].join('\n')
        expect(visibleStreamingReply(streamed)).toBe('A desk for the reading list.')
        expect(visibleStreamingReply(streamed)).not.toContain('export default')
        expect(visibleStreamingReply(streamed)).not.toContain('className=')
    })

    it('hides an unfenced React dump', () => {
        const unfenced = 'export default function Toy() {\n  return <div className="p-4">Hi</div>\n}'
        expect(visibleStreamingReply(unfenced)).toBe('')
        expect(stripExtractedArtifactMarkup(unfenced)).toBe('')
    })

    it('leaves a normal reply alone', () => {
        expect(visibleStreamingReply('Spinoza treats substance as causa sui.')).toBe(
            'Spinoza treats substance as causa sui.'
        )
    })
})
