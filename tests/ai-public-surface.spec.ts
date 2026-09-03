import { test, expect } from '@playwright/test'
import { formatAiSseEvent, shouldAdvertiseQualityCorrection, toPublicProviderLabel } from '../src/lib/ai/contracts'
import type { HumanTurn, HumanTurnKind, HumanTurnStatus } from '../src/lib/bots/agent/human'
import { parseResumeAction } from '../src/lib/bots/agent/checkpoint'
import { publicBotSuccessFields, type BotRunSuccess } from '../src/lib/bots/orchestrate'
import { OPENAI_CHAT_TOOLS, toolsForAgentMode } from '../src/lib/bots/tools/spec'
import { toolStatusLabel, toolResultSummary } from '../src/lib/bots/tools/labels'
import { scrubSecretMaterial } from '../src/lib/ai/scrub'

test.describe('Public provider labels', () => {
    test('toPublicProviderLabel maps gateway ids to coarse public tiers', () => {
        expect(toPublicProviderLabel('groq')).toBe('groq')
        expect(toPublicProviderLabel('groq:qwen')).toBe('groq')
        expect(toPublicProviderLabel('GROQ')).toBe('groq')
        expect(toPublicProviderLabel('gemini')).toBe('gemini')
        expect(toPublicProviderLabel('gemini-fetch:foo')).toBe('gemini')
        expect(toPublicProviderLabel('openai')).toBe('openai')
        expect(toPublicProviderLabel('OpenAI')).toBe('openai')
    })

    test('toPublicProviderLabel drops none / empty / unknown / non-string', () => {
        expect(toPublicProviderLabel('none')).toBeUndefined()
        expect(toPublicProviderLabel('')).toBeUndefined()
        expect(toPublicProviderLabel('   ')).toBeUndefined()
        expect(toPublicProviderLabel('unknown')).toBeUndefined()
        expect(toPublicProviderLabel('anthropic')).toBeUndefined()
        expect(toPublicProviderLabel(undefined)).toBeUndefined()
        expect(toPublicProviderLabel(null)).toBeUndefined()
        expect(toPublicProviderLabel(42)).toBeUndefined()
        expect(toPublicProviderLabel({ provider: 'groq' })).toBeUndefined()
    })
})

test.describe('Public bot act success whitelist', () => {
    test('publicBotSuccessFields keeps only the client-safe keys', () => {
        const fat = {
            success: true as const,
            philosopher: 'nietzsche',
            epistemicStance: 'perspectival',
            reply: 'Become who you are.',
            thought: 'aphorism',
            latencyMs: 123,
            taskType: 'chat',
            // infra / internal — must not leak to /api/bots/act clients
            provider: 'groq',
            attempts: ['groq:qwen', 'gemini'],
            configured: { groq: true, gemini: true, openai: false },
            thinking: { depth: 'deep', stages: [{ title: 'secret', detail: 'internal' }] },
            confident: true,
            persona: { name: 'Nietzsche', epistemicStance: 'perspectival', writingStyle: 'aphoristic' },
            artifacts: [{ id: 'a1' }],
            citations: [{ id: 1, title: 't', url: 'https://example.com', snippet: 's' }],
            usedTools: true,
            qualityGate: 'passed',
        } as unknown as BotRunSuccess

        const published = publicBotSuccessFields(fat)

        expect(published).toEqual({
            success: true,
            philosopher: 'nietzsche',
            epistemicStance: 'perspectival',
            reply: 'Become who you are.',
            thought: 'aphorism',
            latencyMs: 123,
            taskType: 'chat',
        })
        expect(Object.keys(published).sort()).toEqual([
            'epistemicStance',
            'latencyMs',
            'philosopher',
            'reply',
            'success',
            'taskType',
            'thought',
        ])
        expect(published).not.toHaveProperty('provider')
        expect(published).not.toHaveProperty('attempts')
        expect(published).not.toHaveProperty('configured')
        expect(published).not.toHaveProperty('thinking')
        expect(published).not.toHaveProperty('confident')
        expect(published).not.toHaveProperty('persona')
        expect(published).not.toHaveProperty('artifacts')
        expect(published).not.toHaveProperty('citations')
        expect(published).not.toHaveProperty('usedTools')
        expect(published).not.toHaveProperty('qualityGate')
    })
})

test.describe('Human SSE is plan_approval-only', () => {
    test('HumanTurnKind is plan_approval (ask_user removed)', () => {
        const kind: HumanTurnKind = 'plan_approval'
        expect(kind).toBe('plan_approval')

        const turn: HumanTurn = {
            kind: 'plan_approval',
            title: 'Approve plan',
            status: 'pending',
            plan: [{ id: '1', title: 'Step', status: 'pending' }],
        }
        expect(turn.kind).toBe('plan_approval')
        expect(JSON.stringify(turn)).not.toContain('ask_user')
    })

    test('ResumeAction rejects answer; HumanTurnStatus has no answered', () => {
        expect(parseResumeAction('answer')).toBeUndefined()
        expect(parseResumeAction('run')).toBe('run')
        expect(parseResumeAction('revise')).toBe('revise')
        const statuses: HumanTurnStatus[] = ['pending', 'approved', 'revised']
        expect(statuses).toEqual(['pending', 'approved', 'revised'])
        expect(statuses.includes('answered' as HumanTurnStatus)).toBe(false)
        const turn: HumanTurn = {
            kind: 'plan_approval',
            title: 'Approve plan',
            status: 'approved',
        }
        expect(['pending', 'approved', 'revised']).toContain(turn.status)
    })

    test('OPENAI_CHAT_TOOLS and mode toolkits still exclude ask_user', () => {
        const catalog = OPENAI_CHAT_TOOLS.map((tool) => tool.function.name)
        expect(catalog).not.toContain('ask_user')

        for (const mode of ['ask', 'plan', 'execute'] as const) {
            const names = toolsForAgentMode(mode).map((tool) => tool.function.name)
            expect(names).not.toContain('ask_user')
        }
    })
})

test.describe('Tool workbench labels', () => {
    test('toolStatusLabel never returns a raw ask_user label for known tools', () => {
        for (const name of OPENAI_CHAT_TOOLS.map((tool) => tool.function.name)) {
            for (const status of ['running', 'done', 'error'] as const) {
                expect(toolStatusLabel(name, status).toLowerCase()).not.toContain('ask_user')
            }
        }
    })
})

test.describe('Secret scrubbing on public surfaces', () => {
    test('scrubSecretMaterial redacts Bearer, sk-, and gsk_ material', () => {
        const bearer = scrubSecretMaterial('auth failed Bearer FAKESECRET_e4f5g6h7i8j9k0l1m2n3')
        expect(bearer).toContain('Bearer [redacted]')
        expect(bearer).not.toMatch(/Bearer\s+sk-abc/)

        const openai = scrubSecretMaterial('upstream: sk-abcdefghijklmnopqrstuvwxyz12')
        expect(openai).toContain('[redacted]')
        expect(openai).not.toMatch(/sk-[A-Za-z0-9]{20,}/)

        const groq = scrubSecretMaterial('quota: gsk_abcdefghijklmnopqrstuvwxyz12')
        expect(groq).toContain('[redacted]')
        expect(groq).not.toMatch(/gsk_[A-Za-z0-9]{20,}/)
    })

    test('toolResultSummary scrubs secrets on JSON and plain error paths', () => {
        const jsonErr = toolResultSummary(
            'web_search',
            false,
            JSON.stringify({ error: 'Provider said Bearer sk-abcdefghijklmnopqrstuvwxyz12' }),
        )
        expect(jsonErr).toContain('Bearer [redacted]')
        expect(jsonErr).not.toMatch(/Bearer\s+sk-/)

        const plain = toolResultSummary('fetch_url', false, 'fail gsk_abcdefghijklmnopqrstuvwxyz12')
        expect(plain).toContain('[redacted]')
        expect(plain).not.toMatch(/gsk_[A-Za-z0-9]{20,}/)
    })

    test('toolResultSummary scrubs secrets on successful raw line paths', () => {
        const line = toolResultSummary(
            'web_search',
            true,
            '1. Result sk-abcdefghijklmnopqrstuvwxyz12\nmore',
        )
        expect(line).toContain('[redacted]')
        expect(line).not.toMatch(/sk-[A-Za-z0-9]{20,}/)
    })

    test('formatAiSseEvent scrubs secrets in tool/phase/error/activity string fields', () => {
        const secret = 'sk-abcdefghijklmnopqrstuvwxyz12'
        const bearer = `Bearer ${secret}`

        const toolFrame = formatAiSseEvent({
            type: 'tool',
            tool: {
                id: 't1',
                name: 'web_search',
                status: 'error',
                detail: `fail ${bearer}`,
                arguments: `{"q":"${secret}"}`,
                result: `upstream ${secret}`,
            },
        })
        expect(toolFrame.startsWith('data: ')).toBe(true)
        expect(toolFrame).toContain('[redacted]')
        expect(toolFrame).not.toContain(secret)
        expect(toolFrame).not.toMatch(/Bearer\s+sk-/)

        const phaseFrame = formatAiSseEvent({
            type: 'phase',
            phase: {
                phase: 'generation',
                status: 'failed',
                detail: `Provider said ${bearer}`,
            },
        })
        expect(phaseFrame).toContain('[redacted]')
        expect(phaseFrame).not.toContain(secret)

        const errorFrame = formatAiSseEvent({
            type: 'error',
            code: 'PROVIDER_UNAVAILABLE',
            message: `auth failed ${secret}`,
            retryable: true,
        })
        expect(errorFrame).toContain('[redacted]')
        expect(errorFrame).not.toContain(secret)
        expect(errorFrame).toContain('"retryable":true')

        const activityFrame = formatAiSseEvent({
            type: 'activity',
            activity: {
                seq: 1,
                kind: 'tool',
                id: 'a1',
                status: 'error',
                detail: bearer,
                result: secret,
            },
        })
        expect(activityFrame).toContain('[redacted]')
        expect(activityFrame).not.toContain(secret)
        expect(activityFrame).toContain('"seq":1')
    })

    test('formatAiSseEvent preserves non-string leaves on token and usage events', () => {
        const tokenFrame = formatAiSseEvent({ type: 'token', text: 'hello' })
        expect(tokenFrame).toBe('data: {"type":"token","text":"hello"}\n\n')

        const usageFrame = formatAiSseEvent({
            type: 'token_usage',
            snapshot: {
                subject: 'user',
                tier: 'free',
                usedTokens: 42,
                limitTokens: 100,
                remainingTokens: 58,
                percentage: 42,
                allowed: false,
                resetAtUtc: '2026-09-03T00:00:00.000Z',
            },
        })
        expect(usageFrame).toContain('"usedTokens":42')
        expect(usageFrame).toContain('"allowed":false')
        expect(usageFrame).not.toContain('[redacted]')
    })
})

test.describe('done.corrected honesty', () => {
    test('shouldAdvertiseQualityCorrection only when gate passed and text changed', () => {
        expect(shouldAdvertiseQualityCorrection('passed', 'live', 'final')).toBe(true)
        expect(shouldAdvertiseQualityCorrection('passed', 'same', 'same')).toBe(false)
        expect(shouldAdvertiseQualityCorrection('passed', '  same  ', 'same')).toBe(false)
        expect(shouldAdvertiseQualityCorrection('failed', 'live', 'final')).toBe(false)
        expect(shouldAdvertiseQualityCorrection('skipped', 'live', 'final')).toBe(false)
        expect(shouldAdvertiseQualityCorrection(undefined, 'live', 'final')).toBe(false)
    })
})

