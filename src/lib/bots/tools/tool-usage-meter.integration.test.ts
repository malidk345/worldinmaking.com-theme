/**
 * Quota surcharge end to end: the chat route meters `onTool` events from streamBotTurn.
 * These drive the real orchestrator/pipeline/loop with a mocked Gemini + Crossref and
 * check how many tool calls get charged.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { streamBotTurn } from '../orchestrate'
import { __resetAcademicSearchStateForTests } from '../academic-search'
import { __setAcademicCacheForTests } from '../academic-cache'
import { createToolUsageMeter } from '../../tool-usage-meter'

type Call = { name: string; args: Record<string, unknown> }
type Script = {
    /** Function calls per main ACT round (each inner array = one model response). */
    rounds: Call[][]
    /** Sub-agent first round calls (task tool). */
    subagent?: Call[]
    /** Post-tool answer round fails (503) → #844 answer recovery (tools off). */
    answerFails?: boolean
}

const sse = (chunks: unknown[]) =>
    new Response(chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join(''), { status: 200, headers: { 'content-type': 'text/event-stream' } })
const parts = (items: unknown[]) => ({ candidates: [{ content: { parts: items } }] })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function installFetch(script: Script) {
    let round = 0
    let subRound = 0
    const crossref = { n: 0 }
    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('generativelanguage.googleapis.com')) {
            const body = JSON.parse(String(init?.body || '{}'))
            const sys = JSON.stringify(body.systemInstruction || body.system_instruction || '')
            const contents = JSON.stringify(body.contents || [])
            // Sub-agent rounds carry only the task goal as the user turn (no main "Query / Prompt").
            const isSubagent = sys.includes('focused subagent') || (contents.includes('Find two academic sources') && !contents.includes('Query / Prompt'))
            if (isSubagent) {
                if (body.tools && subRound === 0 && script.subagent?.length) {
                    subRound += 1
                    return sse([parts(script.subagent.map((c) => ({ functionCall: { name: c.name, args: c.args }, thoughtSignature: 'sub' })))])
                }
                return sse([parts([{ text: 'Subagent report: two sources found.' }])])
            }
            if (!body.tools) {
                if (contents.includes('Tool results already gathered')) return sse([parts([{ text: 'Recovered answer citing [P1].' }])])
                return sse([parts([{ text: 'Enough evidence; write the answer.' }])])
            }
            if (round < script.rounds.length) {
                const calls = script.rounds[round]
                round += 1
                return sse([parts(calls.map((c, i) => ({ functionCall: { name: c.name, args: c.args }, thoughtSignature: `sig-${round}-${i}` })))])
            }
            if (script.answerFails)
                return json({ error: { code: 503, message: 'The model is overloaded. Please try again later.', status: 'UNAVAILABLE' } }, 503)
            return sse([parts([{ text: 'Final answer citing [P1].' }])])
        }
        if (url.includes('api.crossref.org')) {
            crossref.n += 1
            return json({
                message: {
                    items: [
                        {
                            DOI: '10.1000/heidegger.1',
                            title: ['Heidegger, Gestell and the question concerning technology'],
                            author: [{ given: 'Ada', family: 'Keller' }],
                            issued: { 'date-parts': [[2019]] },
                            'container-title': ['Philosophy Today'],
                        },
                    ],
                },
            })
        }
        return new Response('not found', { status: 404 })
    }) as unknown as typeof fetch
    return crossref
}

async function runTurn(question: string) {
    const meter = createToolUsageMeter()
    const events: string[] = []
    const result = await streamBotTurn(
        {
            philosopher: 'Nietzsche',
            taskType: 'autonomous_assistant',
            enableTools: true,
            env: { GEMINI_API_KEY: 'test-gemini-key' } as Record<string, string>,
            question,
            onTool: (event) => {
                events.push(`${event.name}:${event.status}`)
                meter.observe(event)
            },
        },
        () => undefined
    )
    return { meter, events, result }
}

const SEARCH: Call = { name: 'search_academic_corpus', args: { query: 'Heidegger Gestell technology' } }

describe('quota surcharge counts executed tool calls (streamBotTurn → onTool)', () => {
    const originalFetch = globalThis.fetch
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        vi.spyOn(console, 'info').mockImplementation(() => undefined)
        __resetAcademicSearchStateForTests(0, 0)
        __setAcademicCacheForTests(null)
    })
    afterEach(() => {
        globalThis.fetch = originalFetch
        vi.restoreAllMocks()
    })

    it('zero tools → no surcharge', async () => {
        installFetch({ rounds: [] })
        const { meter, result } = await runTurn('Explain eternal recurrence in two paragraphs.')
        expect(result.success).toBe(true)
        expect(meter.count).toBe(0)
        expect(meter.tokens()).toBe(0)
    })

    it('one academic search → one call charged', async () => {
        installFetch({ rounds: [[SEARCH]] })
        const { meter, result } = await runTurn('Find academic sources on Heidegger and technology')
        expect(result.success).toBe(true)
        expect(meter.count).toBe(1)
        expect(meter.tokens()).toBeGreaterThan(2_000)
    })

    it('multiple tools across rounds, incl. a repeated (cached) search → each call charged', async () => {
        const crossref = installFetch({ rounds: [[SEARCH], [SEARCH, { name: 'related_papers', args: { paper: 'P1' } }]] })
        const { meter, events } = await runTurn('Find academic sources on Heidegger and technology, then related work')
        expect(events.filter((e) => e.endsWith(':done') || e.endsWith(':error'))).toHaveLength(3)
        expect(meter.count).toBe(3)
        expect(meter.tokens()).toBeGreaterThanOrEqual(6_000)
        // The repeat came from the turn cache (no second upstream fetch) but is still charged.
        expect(crossref.n).toBeGreaterThan(0)
    })

    it('#844 answer recovery (tools off) adds no extra charge', async () => {
        installFetch({ rounds: [[SEARCH]], answerFails: true })
        const { meter, result } = await runTurn('Find academic sources on Heidegger and technology')
        expect(result.success).toBe(true)
        expect(result.reply).toContain('Recovered answer')
        expect(meter.count).toBe(1)
    })

    it('a failed tool call is still charged', async () => {
        installFetch({ rounds: [[{ name: 'fetch_url', args: { url: 'http://127.0.0.1/private' } }]] })
        const { meter, events } = await runTurn('Read http://127.0.0.1/private for me')
        expect(events).toContain('fetch_url:error')
        expect(meter.count).toBe(1)
    })

    it('task sub-agent: the task call and its nested read tools are each charged', async () => {
        installFetch({
            rounds: [[{ name: 'task', args: { goal: 'Find two academic sources on Heidegger and technology' } }]],
            subagent: [SEARCH],
        })
        const { meter, events } = await runTurn('Delegate a subtask: find sources on Heidegger and technology')
        expect(events).toContain('task:done')
        expect(events).toContain('search_academic_corpus:done')
        expect(meter.count).toBe(2)
    })
})
