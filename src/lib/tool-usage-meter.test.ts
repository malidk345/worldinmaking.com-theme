import { describe, expect, it } from 'vitest'
import { createToolUsageMeter } from './tool-usage-meter'
import { estimateTokens, estimateToolSurchargeTokens } from './token-quota'

const run = (id: string, name = 'web_search') => ({ id, name, status: 'running' as const, arguments: '{"q":"x"}' })
const done = (id: string, name = 'web_search', result = 'ok') => ({ id, name, status: 'done' as const, arguments: '{"q":"x"}', result })
const fail = (id: string, name = 'web_search') => ({ id, name, status: 'error' as const, arguments: '{"q":"x"}', result: '{"ok":false}' })

describe('tool usage meter (weekly quota surcharge)', () => {
    it('charges nothing when no tool ran', () => {
        const meter = createToolUsageMeter()
        expect(meter.count).toBe(0)
        expect(meter.tokens()).toBe(0)
    })

    it('surcharge is 2,000 tokens per executed call', () => {
        expect(estimateToolSurchargeTokens(0)).toBe(0)
        expect(estimateToolSurchargeTokens(3)).toBe(6_000)
    })

    it('counts every finished call once and adds the payload estimate', () => {
        const meter = createToolUsageMeter()
        for (const id of ['a', 'b', 'c']) meter.observe(run(id))
        meter.observe(done('a'))
        meter.observe(done('b', 'search_academic_corpus', 'x'.repeat(1200)))
        meter.observe(done('c'))
        expect(meter.count).toBe(3)
        const payload = '{"q":"x"}ok' + '{"q":"x"}' + 'x'.repeat(1200) + '{"q":"x"}ok'
        expect(meter.payloadChars).toBe(payload.length)
        expect(meter.tokens()).toBe(estimateTokens(payload) + 6_000)
    })

    it('counts failed tool calls (the model still spent a round on them)', () => {
        const meter = createToolUsageMeter()
        meter.observe(run('a'))
        meter.observe(fail('a'))
        expect(meter.count).toBe(1)
        expect(meter.tokens()).toBeGreaterThanOrEqual(2_000)
    })

    it('does not count a call that never finished (aborted / running only)', () => {
        const meter = createToolUsageMeter()
        meter.observe(run('a'))
        expect(meter.count).toBe(0)
        expect(meter.tokens()).toBe(0)
    })

    it('ignores a duplicate finish for the same call', () => {
        const meter = createToolUsageMeter()
        meter.observe(run('a'))
        meter.observe(done('a'))
        meter.observe(done('a'))
        meter.observe(fail('a'))
        expect(meter.count).toBe(1)
    })

    it('counts a provider id reused by a later round (new running → finish cycle)', () => {
        const meter = createToolUsageMeter()
        meter.observe(run('call_0'))
        meter.observe(done('call_0'))
        meter.observe(run('call_0'))
        meter.observe(done('call_0'))
        expect(meter.count).toBe(2)
    })

    it('counts the task call and each nested sub-agent read tool', () => {
        const meter = createToolUsageMeter()
        meter.observe(run('t1', 'task'))
        meter.observe(run('n1', 'web_search'))
        meter.observe(run('n2', 'search_academic_corpus'))
        meter.observe(done('n1'))
        meter.observe(done('n2', 'search_academic_corpus'))
        meter.observe(done('t1', 'task'))
        expect(meter.count).toBe(3)
    })

    it('counts the host live-web search (finish without a separate running is still one call)', () => {
        const meter = createToolUsageMeter()
        meter.observe({ id: 'host-search', name: 'web_search', status: 'done', result: 'r' })
        expect(meter.count).toBe(1)
    })

    it('ignores malformed events', () => {
        const meter = createToolUsageMeter()
        meter.observe(undefined as never)
        meter.observe({ id: 5, name: 'x', status: 'done' } as never)
        meter.observe({ id: 'a', name: 'x', status: 'queued' } as never)
        expect(meter.count).toBe(0)
    })
})
