import { describe, expect, it } from 'vitest'
import { artifactWindowKey, draftArtifactFromToolEvent } from './draft'

describe('draftArtifactFromToolEvent', () => {
    it('does not default unknown types to html (that opened a second "screen")', () => {
        expect(
            draftArtifactFromToolEvent({
                id: 't1',
                name: 'create_artifact',
                arguments: '{}',
            })
        ).toBeNull()
        expect(
            draftArtifactFromToolEvent({
                id: 't1',
                name: 'create_artifact',
                arguments: '{"title":"House"}',
            })
        ).toBeNull()
    })

    it('reads type from partial streamed JSON', () => {
        const draft = draftArtifactFromToolEvent({
            id: 'call-3d',
            name: 'create_artifact',
            arguments: '{"type":"model3d","title":"House model"',
        })
        expect(draft?.type).toBe('model3d')
        expect(draft?.title).toBe('House model')
        expect(draft?.toolCallId).toBe('call-3d')
        expect(artifactWindowKey(draft!)).toBe('artifact-tool-call-3d')
    })
})
