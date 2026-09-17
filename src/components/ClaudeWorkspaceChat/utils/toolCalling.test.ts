import { describe, expect, it } from 'vitest'
import type { Artifact } from '../types'
import { processArtifactRevision } from './toolCalling'

function art(partial: Partial<Artifact> & Pick<Artifact, 'id' | 'title' | 'type'>): Artifact {
    return {
        language: 'json',
        content: partial.content || '',
        version: partial.version || 1,
        createdAt: partial.createdAt || '2026-01-01T00:00:00.000Z',
        ...partial,
    }
}

describe('processArtifactRevision', () => {
    it('folds the finished 3D scene into the pending building card', () => {
        const pending = art({
            id: 'art-pending-t1',
            title: 'Untitled',
            type: 'model3d',
            pending: true,
            toolCallId: 't1',
        })
        const { activeArtifact, artifacts } = processArtifactRevision(
            [pending],
            {
                title: 'Modern house',
                type: 'model3d',
                content: '{"objects":[]}',
                description: 'Generated artifact',
                toolCallId: 't1',
            },
            { preferId: pending.id }
        )
        expect(artifacts).toHaveLength(1)
        expect(activeArtifact.id).toBe('art-pending-t1')
        expect(activeArtifact.pending).toBe(false)
        expect(activeArtifact.toolCallId).toBe('t1')
        expect(activeArtifact.title).toBe('Modern house')
    })
})
