import { describe, expect, it } from 'vitest'
import { stripLeakedOnScreenArtifacts, stripLeakedToolMarkup } from './leak'

describe('stripLeakedOnScreenArtifacts', () => {
    it('removes On-screen host marker + model3d JSON dump', () => {
        const leaked = [
            'Here is your city visualization.',
            '',
            '[On-screen artifacts — revise with create_artifact using the same title]',
            '### model3d "Şehir: Demo" id=art-pending-gemini-0-create_artifact',
            '{"title":"Şehir","objects":[{"id":"b1","type":"box","position":[0,0,0]}]}',
            '',
            'Enjoy the scene.',
        ].join('\n')
        const cleaned = stripLeakedOnScreenArtifacts(leaked)
        expect(cleaned).toContain('Here is your city visualization.')
        expect(cleaned).toContain('Enjoy the scene.')
        expect(cleaned).not.toContain('On-screen artifacts')
        expect(cleaned).not.toContain('art-pending-gemini')
        expect(cleaned).not.toContain('"objects"')
    })

    it('removes repeated host blocks', () => {
        const block = [
            '[On-screen artifacts — revise with create_artifact using the same title]',
            '### model3d "City" id=art-pending-1',
            '{"objects":[{"id":"a"}]}',
        ].join('\n')
        const leaked = `Intro\n\n${block}\n\n${block}\n\n${block}\n\nDone.`
        const cleaned = stripLeakedOnScreenArtifacts(leaked)
        expect(cleaned).toBe('Intro\n\nDone.')
    })

    it('strips orphan ### type id= dumps without host marker', () => {
        const leaked = [
            'Prose first.',
            '### canvas "Map" id=art-xyz',
            '{"nodes":[],"edges":[]}',
            'More prose.',
        ].join('\n')
        const cleaned = stripLeakedOnScreenArtifacts(leaked)
        expect(cleaned).toContain('Prose first.')
        expect(cleaned).toContain('More prose.')
        expect(cleaned).not.toContain('### canvas')
        expect(cleaned).not.toContain('"nodes"')
    })

    it('stripLeakedToolMarkup also clears on-screen leaks', () => {
        const leaked =
            'Hi\n\n[On-screen artifacts — revise with create_artifact using the same title]\n### model3d "X" id=art-1\n{"objects":[]}'
        const cleaned = stripLeakedToolMarkup(leaked)
        expect(cleaned).toBe('Hi')
    })
})
