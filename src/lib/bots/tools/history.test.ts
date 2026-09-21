import { describe, expect, it } from 'vitest'
import { compactToolHistory, formatHistoryContent, type HistoryTurn } from './history'

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

    it('keeps latest artifact body and stubs older ones to id/title', () => {
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
        expect(assistants[0]!.content).toContain('art-old')
        expect(assistants[0]!.content).toContain('Old Scene')
        expect(assistants[0]!.content).toContain('prior body omitted')
        expect(assistants[0]!.content).not.toContain('OLD_BODY_')
        expect(assistants[1]!.content).toContain('NEW_BODY_')
        expect(assistants[1]!.content).toContain('art-new')
    })

    it('formatHistoryContent defaults to including bodies', () => {
        const text = formatHistoryContent({
            role: 'assistant',
            content: 'hi',
            artifacts: [{ id: 'a1', type: 'react', title: 'Panel', content: 'CODE' }],
        })
        expect(text).toContain('CODE')
        expect(text).toContain('a1')
    })
})
