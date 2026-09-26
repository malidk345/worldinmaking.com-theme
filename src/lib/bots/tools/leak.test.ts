import { describe, expect, it } from 'vitest'
import { stripLeakedOnScreenArtifacts, stripLeakedToolMarkup, stripLeakedToolMarkupForStream } from './leak'

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

    it('strips Host note marker and hyphen dash variants', () => {
        const leaked = [
            'Intro',
            '[Host note - on-screen artifacts. Revise with create_artifact using the same title. Do NOT paste this note or raw artifact JSON into the public answer.]',
            '### mermaid "Flow" id=art-2',
            '```',
            'graph TD; A-->B',
            '```',
            'Outro',
        ].join('\n')
        const cleaned = stripLeakedOnScreenArtifacts(leaked)
        expect(cleaned).toContain('Intro')
        expect(cleaned).toContain('Outro')
        expect(cleaned).not.toContain('Host note')
        expect(cleaned).not.toContain('### mermaid')
        expect(cleaned).not.toContain('graph TD')
    })

    it('strips known-type orphan heading without id when JSON follows', () => {
        const leaked = [
            'Prose',
            '### html "Widget"',
            '{"title":"Widget","markup":"<div/>"}',
            'After',
        ].join('\n')
        const cleaned = stripLeakedOnScreenArtifacts(leaked)
        expect(cleaned).toContain('Prose')
        expect(cleaned).toContain('After')
        expect(cleaned).not.toContain('### html')
        expect(cleaned).not.toContain('"markup"')
    })

    it('strips fenced JSON after ### model3d heading', () => {
        const leaked = [
            'See this.',
            '### model3d "Tower" id=art-9',
            '```json',
            '{"objects":[{"id":"t1"}]}',
            '```',
            'Done.',
        ].join('\n')
        const cleaned = stripLeakedOnScreenArtifacts(leaked)
        expect(cleaned).toBe('See this.\nDone.')
    })

})

describe('stripLeakedToolMarkupForStream', () => {
    it('keeps the space at the edge of a clean chunk', () => {
        expect(stripLeakedToolMarkupForStream('Hello')).toBe('Hello')
        expect(stripLeakedToolMarkupForStream(' world')).toBe(' world')
        expect(`${stripLeakedToolMarkupForStream('Hello')}${stripLeakedToolMarkupForStream(' world')}`).toBe(
            'Hello world'
        )
    })

    it('still drops a leaked tool call in a chunk', () => {
        const cleaned = stripLeakedToolMarkupForStream('Hello <tool_call>web_search(q="x")</tool_call>')
        expect(cleaned).not.toContain('tool_call')
        expect(cleaned).toContain('Hello')
    })
})
