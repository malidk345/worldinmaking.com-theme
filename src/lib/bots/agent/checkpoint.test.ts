// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseAgentCheckpoint, snapshotCheckpoint } from './checkpoint'

describe('checkpoint usedPlanResearch soft-gate parity', () => {
    it('snapshots and restores usedPlanResearch so finalize soft-gate survives ask_user', () => {
        const snap = snapshotCheckpoint({
            messages: [{ role: 'user', content: 'plan a paper' }],
            todos: [{ id: 't1', title: 'Research sources', status: 'in_progress' }],
            scratchpad: [],
            agentMode: 'plan',
            stepCount: 2,
            usedTools: true,
            usedWebSearch: false,
            usedPlanResearch: true,
            interrupt: {
                kind: 'ask_user',
                title: 'Clarify scope',
                status: 'pending',
                question: 'Which era?',
            },
        })
        expect(snap.usedPlanResearch).toBe(true)
        expect(snap.usedWebSearch).toBe(false)

        const parsed = parseAgentCheckpoint(snap)
        expect(parsed?.usedPlanResearch).toBe(true)
        expect(parsed?.usedWebSearch).toBe(false)
    })

    it('omits usedPlanResearch when false (compact legacy-compatible shape)', () => {
        const snap = snapshotCheckpoint({
            messages: [{ role: 'user', content: 'hi' }],
            todos: [],
            scratchpad: [],
            agentMode: 'plan',
            stepCount: 0,
            usedTools: false,
            usedWebSearch: false,
            usedPlanResearch: false,
            interrupt: {
                kind: 'plan_approval',
                title: 'Approve',
                status: 'pending',
            },
        })
        expect(snap.usedPlanResearch).toBeUndefined()
        const parsed = parseAgentCheckpoint(snap)
        expect(parsed?.usedPlanResearch).toBeUndefined()
    })

    it('legacy checkpoints without the flag still parse', () => {
        const legacy = {
            v: 1,
            messages: [{ role: 'user', content: 'x' }],
            todos: [],
            scratchpad: [],
            agentMode: 'plan',
            stepCount: 1,
            usedTools: true,
            usedWebSearch: true,
            interrupt: { kind: 'ask_user', title: 'Q', status: 'pending', question: '?' },
        }
        const parsed = parseAgentCheckpoint(legacy)
        expect(parsed?.usedWebSearch).toBe(true)
        expect(parsed?.usedPlanResearch).toBeUndefined()
    })
})
