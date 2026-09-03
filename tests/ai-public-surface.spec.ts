import { test, expect } from '@playwright/test'
import { toPublicProviderLabel } from '../src/lib/ai/contracts'
import type { HumanTurn, HumanTurnKind } from '../src/lib/bots/agent/human'
import { publicBotSuccessFields, type BotRunSuccess } from '../src/lib/bots/orchestrate'
import { OPENAI_CHAT_TOOLS, toolsForAgentMode } from '../src/lib/bots/tools/spec'
import { toolStatusLabel } from '../src/lib/bots/tools/labels'

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