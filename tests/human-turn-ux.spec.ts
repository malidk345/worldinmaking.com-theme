import { test, expect } from '@playwright/test'
import { preferHumanAnswerOverStop, resolveHumanTurn } from '../src/lib/human-turn-ux'
import type { HumanTurn } from '../src/components/ClaudeWorkspaceChat/types'
import { mergeMessages } from '../src/lib/chat-merge'
import type { Message } from '../src/components/ClaudeWorkspaceChat/types'

const pendingAsk = (): HumanTurn => ({
    kind: 'ask_user',
    title: 'Question',
    status: 'pending',
    question: 'Which tone?',
    choices: ['Formal', 'Casual'],
})

const answeredAsk = (): HumanTurn => ({
    ...pendingAsk(),
    status: 'answered',
    answer: 'Formal',
})

test.describe('human-turn UX guards', () => {
    test('resolveHumanTurn never regresses settled → pending', () => {
        expect(resolveHumanTurn(answeredAsk(), pendingAsk())).toEqual(answeredAsk())
        expect(resolveHumanTurn(pendingAsk(), answeredAsk())).toEqual(answeredAsk())
        expect(resolveHumanTurn(undefined, pendingAsk())).toEqual(pendingAsk())
        expect(resolveHumanTurn(answeredAsk(), undefined)).toEqual(answeredAsk())
    })

    test('resolveHumanTurn honors preferIncoming when both settled', () => {
        const revised: HumanTurn = {
            kind: 'plan_approval',
            title: 'Plan',
            status: 'revised',
            revisionNote: 'shorter',
        }
        const approved: HumanTurn = { kind: 'plan_approval', title: 'Plan', status: 'approved' }
        expect(resolveHumanTurn(revised, approved, true)).toEqual(approved)
        expect(resolveHumanTurn(revised, approved, false)).toEqual(revised)
    })

    test('preferHumanAnswerOverStop unlocks composer while interrupt stream drains', () => {
        expect(preferHumanAnswerOverStop(true, true)).toBe(true)
        expect(preferHumanAnswerOverStop(true, false)).toBe(false)
        expect(preferHumanAnswerOverStop(false, true)).toBe(true)
        expect(preferHumanAnswerOverStop(false, false)).toBe(true)
    })

    test('mergeMessages does not revive pending ask_user over local answered', () => {
        const local: Message = {
            id: 'a1',
            role: 'assistant',
            content: '?',
            timestamp: '',
            isTypingDone: true,
            humanTurn: answeredAsk(),
        }
        const remote: Message = {
            id: 'a1',
            role: 'assistant',
            content: '?',
            timestamp: '',
            isTypingDone: true,
            humanTurn: pendingAsk(),
        }
        const mergedPreferRemote = mergeMessages([local], [remote], true)
        expect(mergedPreferRemote[0].humanTurn?.status).toBe('answered')
        const mergedPreferLocal = mergeMessages([local], [remote], false)
        expect(mergedPreferLocal[0].humanTurn?.status).toBe('answered')
    })
})
