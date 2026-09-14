import { describe, expect, it } from 'vitest'
import { runAgentNodePipeline, type AgentPipelineParams, type CompletionRound } from './pipeline'

describe('Progressive Interleaved Multi-Turn Composition', () => {
    it('accumulates public text emitted across tool rounds and streams them seamlessly', async () => {
        const tokensEmitted: string[] = []
        let thinkCount = 0
        let decisionCount = 0

        const mockComplete = async (input: {
            messages: Array<{ role: string; content: string | null }>
            toolChoice: string
            onToken?: (text: string) => void
            onThinking?: (text: string) => void
            omitTools?: boolean
        }): Promise<CompletionRound> => {
            if (input.omitTools) {
                thinkCount += 1
                return {
                    ok: true,
                    content: '',
                    toolCalls: [],
                    reasoning: thinkCount === 1 ? 'Plan step' : 'Post-tool reflection step',
                }
            }

            decisionCount += 1

            if (decisionCount === 1) {
                // Decision 1: Model writes section 1 AND calls verified_corpus_search
                const section1 = '## 1. Giriş: Töz Birliği ve Spinoza\n\nSpinoza felsefesinde doğa ve Tanrı özdeşliği temel aksiyomdur.'
                input.onToken?.(section1)
                return {
                    ok: true,
                    content: section1,
                    toolCalls: [
                        {
                            id: 'call-corpus-1',
                            name: 'verified_corpus_search',
                            argumentsJson: JSON.stringify({ philosopher: 'Spinoza', query: 'Deus sive Natura' }),
                        },
                    ],
                }
            }

            if (decisionCount === 2) {
                // Decision 2: Model continues writing section 2 without calling more tools
                const section2 = '## 2. Kanıtlama: Önerme 14 ve Etika İncelemesi\n\nEtika 1. Bölüm 14. Önerme uyarınca, Tanrı haricinde hiçbir töz var olamaz.'
                input.onToken?.(section2)
                return {
                    ok: true,
                    content: section2,
                    toolCalls: [],
                }
            }

            return {
                ok: true,
                content: 'Bitti.',
                toolCalls: [],
            }
        }

        const params: AgentPipelineParams = {
            baseMessages: [
                { role: 'system', content: 'You are a philosophical writing assistant.' },
                { role: 'user', content: 'Spinoza Deus sive Natura kavramını açıkla.' },
            ],
            complete: mockComplete,
            onToken: (text) => tokensEmitted.push(text),
            maxSteps: 6,
        }

        const result = await runAgentNodePipeline(params)

        expect(result.ok).toBe(true)
        expect(result.usedTools).toBe(true)

        // Verify that tokens from BOTH round 1 and round 2 were emitted
        const allEmittedText = tokensEmitted.join('')
        expect(allEmittedText).toContain('1. Giriş: Töz Birliği ve Spinoza')
        expect(allEmittedText).toContain('2. Kanıtlama: Önerme 14 ve Etika İncelemesi')

        // Verify that final result.text accumulates BOTH sections seamlessly
        expect(result.text).toContain('## 1. Giriş: Töz Birliği ve Spinoza')
        expect(result.text).toContain('## 2. Kanıtlama: Önerme 14 ve Etika İncelemesi')
        expect(result.text.indexOf('## 1.')).toBeLessThan(result.text.indexOf('## 2.'))
    })

    it('retains single-round direct answers when no tools are called', async () => {
        const tokensEmitted: string[] = []

        const params: AgentPipelineParams = {
            baseMessages: [
                { role: 'system', content: 'You are an assistant.' },
                { role: 'user', content: 'Kısaca selam ver.' },
            ],
            complete: async (input) => {
                if (input.omitTools) {
                    return { ok: true, content: '', toolCalls: [] }
                }
                const answer = 'Merhaba, hoş geldiniz!'
                input.onToken?.(answer)
                return { ok: true, content: answer, toolCalls: [] }
            },
            onToken: (text) => tokensEmitted.push(text),
            maxSteps: 4,
        }

        const result = await runAgentNodePipeline(params)

        expect(result.ok).toBe(true)
        expect(result.usedTools).toBe(false)
        expect(result.text).toBe('Merhaba, hoş geldiniz!')
        expect(tokensEmitted.join('')).toBe('Merhaba, hoş geldiniz!')
    })
})
