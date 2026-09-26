import { describe, expect, it } from 'vitest'
import {
    compactToolHistory,
    formatHistoryContent,
    formatOnScreenArtifactsNote,
    type HistoryTurn,
} from './history'

describe('History tool/artifact memory (soft)', () => {
    it('keeps recent tool results fuller than older ones', () => {
        const history: HistoryTurn[] = []
        for (let i = 0; i < 8; i += 1) {
            history.push({
                role: 'assistant',
                content: '',
                tool_calls: [{ id: `c${i}`, name: 'web_search', arguments: '{"query":"x"}' }],
            })
            history.push({
                role: 'tool',
                tool_call_id: `c${i}`,
                content: `payload-${i}-` + 'a'.repeat(2_000),
            })
        }
        const compacted = compactToolHistory(history)
        const tools = compacted.filter((m) => m.role === 'tool')
        expect(tools.length).toBe(8)
        const older = tools[0]!.content
        const recent = tools[tools.length - 1]!.content
        expect(older.length).toBeLessThanOrEqual(400)
        expect(recent.length).toBeGreaterThan(1_200)
        expect(recent.length).toBeLessThanOrEqual(2_400)
    })

    it('keeps assistant prose clean and puts artifacts in a synthetic user note', () => {
        const history: HistoryTurn[] = [
            {
                role: 'assistant',
                content: 'first',
                artifacts: [
                    {
                        id: 'art-old',
                        type: 'model3d',
                        title: 'Old Scene',
                        content: 'OLD_BODY_' + 'b'.repeat(500),
                    },
                ],
            },
            { role: 'user', content: 'enrich it' },
            {
                role: 'assistant',
                content: 'second',
                artifacts: [
                    {
                        id: 'art-new',
                        type: 'model3d',
                        title: 'New Scene',
                        content: 'NEW_BODY_' + 'c'.repeat(500),
                    },
                ],
            },
        ]
        const compacted = compactToolHistory(history)
        const assistants = compacted.filter((m) => m.role === 'assistant')
        expect(assistants[0]!.content).toBe('first')
        expect(assistants[0]!.content).not.toContain('On-screen artifacts')
        expect(assistants[0]!.content).not.toContain('OLD_BODY_')
        expect(assistants[0]!.content).not.toContain('art-old')
        expect(assistants[1]!.content).toBe('second')
        expect(assistants[1]!.content).not.toContain('NEW_BODY_')

        const notes = compacted.filter(
            (m) => m.role === 'user' && m.content.includes('on-screen artifacts')
        )
        expect(notes.length).toBe(2)
        expect(notes[0]!.content).toContain('art-old')
        expect(notes[0]!.content).toContain('Old Scene')
        expect(notes[0]!.content).toContain('prior body omitted')
        expect(notes[0]!.content).not.toContain('OLD_BODY_')
        expect(notes[1]!.content).toContain('NEW_BODY_')
        expect(notes[1]!.content).toContain('art-new')
        expect(notes[1]!.content).toContain('Do NOT paste')
    })

    it('defers artifact note until after tool results when assistant has tool_calls', () => {
        const history: HistoryTurn[] = [
            {
                role: 'assistant',
                content: '',
                tool_calls: [{ id: 'c1', name: 'create_artifact', arguments: '{}' }],
                artifacts: [
                    {
                        id: 'art-1',
                        type: 'model3d',
                        title: 'Scene',
                        content: '{"objects":[]}',
                    },
                ],
            },
            { role: 'tool', tool_call_id: 'c1', content: 'ok' },
        ]
        const compacted = compactToolHistory(history)
        expect(compacted.map((m) => m.role)).toEqual(['assistant', 'tool', 'user'])
        expect(compacted[2]!.content).toContain('art-1')
        expect(compacted[0]!.content).toBe('')
    })

    it('formatHistoryContent returns public body only', () => {
        const text = formatHistoryContent({
            role: 'assistant',
            content: 'hi',
            artifacts: [{ id: 'a1', type: 'react', title: 'Panel', content: 'CODE' }],
        })
        expect(text).toBe('hi')
        expect(text).not.toContain('CODE')
        expect(text).not.toContain('a1')
    })

    it('formatOnScreenArtifactsNote includes bodies by default', () => {
        const text = formatOnScreenArtifactsNote([{ id: 'a1', type: 'react', title: 'Panel', content: 'CODE' }])
        expect(text).toContain('CODE')
        expect(text).toContain('a1')
        expect(text).toContain('Do NOT paste')
    })

    it('strips polluted on-screen dumps already baked into assistant content', () => {
        const polluted = [
            'Nice scene.',
            '',
            '[On-screen artifacts — revise with create_artifact using the same title]',
            '### model3d "City" id=art-pending-1',
            '{"objects":[{"id":"a"}]}',
        ].join('\n')
        expect(formatHistoryContent({ role: 'assistant', content: polluted })).toBe('Nice scene.')
    })

    it('merges host artifact note into the following user turn (no consecutive users)', () => {
        const history: HistoryTurn[] = [
            {
                role: 'assistant',
                content: 'done',
                artifacts: [
                    { id: 'art-1', type: 'model3d', title: 'Scene', content: '{"objects":[]}' },
                ],
            },
            { role: 'user', content: 'make it taller' },
        ]
        const compacted = compactToolHistory(history)
        expect(compacted.map((m) => m.role)).toEqual(['assistant', 'user'])
        expect(compacted[1]!.content).toContain('on-screen artifacts')
        expect(compacted[1]!.content).toContain('art-1')
        expect(compacted[1]!.content).toContain('make it taller')
        expect(compacted[0]!.content).toBe('done')
    })

    it('does not carry uploaded PDF pages into the next question', () => {
        const history: HistoryTurn[] = [
            {
                role: 'user',
                content: `What is this?\n\n[Document: book.pdf]\n[Page 1]\nPreface secret\n\n[Page 2]\n${'Z'.repeat(80)}`,
            },
            {
                role: 'assistant',
                content: 'Opened the start.',
                tool_calls: [
                    { id: 'r1', name: 'read_document', arguments: JSON.stringify({ name: 'book.pdf', page: 1 }) },
                ],
            },
            {
                role: 'tool',
                tool_call_id: 'r1',
                content: '[book.pdf — page 1 of 40]\n[Page 1]\nPreface secret in full',
            },
            {
                role: 'assistant',
                content: '',
                tool_calls: [{ id: 'w1', name: 'web_search', arguments: '{"query":"x"}' }],
            },
            { role: 'tool', tool_call_id: 'w1', content: 'search hit stays' },
        ]
        const compacted = compactToolHistory(history)
        const blob = compacted.map((message) => message.content).join('\n')
        expect(blob).toContain('What is this?')
        expect(blob).toContain('call read_document')
        expect(blob).toContain('page=1')
        expect(blob).toContain('search hit stays')
        expect(blob).not.toContain('Preface secret')
        expect(blob).not.toContain('Z'.repeat(40))
        expect(blob).not.toContain('3 pages')
    })
})
