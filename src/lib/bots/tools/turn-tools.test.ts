import { describe, expect, it } from 'vitest'
import {
    messagesUsedAcademicSeed,
    questionFollowUpNames,
    researchProtocolFor,
    selectTurnTools,
    shouldOmitResearchWrite,
} from './turn-tools'

const NAMES = [
    'search_academic_corpus',
    'related_papers',
    'find_quotes',
    'annotated_bibliography',
    'web_search',
    'create_artifact',
    'generate_image',
    'todo_write',
    'insert_notebook_block',
]

const tools = NAMES.map((name) => ({ function: { name } }))
const names = (selected: { function: { name: string } }[]) => selected.map((tool) => tool.function.name)

describe('selectTurnTools', () => {
    it('leaves an ordinary ask on the full list', () => {
        expect(names(selectTurnTools(tools, { mode: 'ask', question: 'merhaba' }))).toEqual(NAMES)
    })

    it('drops studio tools and deferred follow-ups on a literature question', () => {
        expect(names(selectTurnTools(tools, { mode: 'ask', question: 'Heidegger technology sources' }))).toEqual([
            'search_academic_corpus',
            'web_search',
            'insert_notebook_block',
        ])
    })

    it('adds follow-up schemas after a corpus search, not before', () => {
        const before = selectTurnTools(tools, {
            mode: 'ask',
            question: 'Spinoza substance monism papers',
            academicFollowUps: false,
        })
        const after = selectTurnTools(tools, {
            mode: 'ask',
            question: 'Spinoza substance monism papers',
            academicFollowUps: true,
        })
        expect(names(before)).not.toContain('related_papers')
        expect(names(after)).toEqual(expect.arrayContaining(['related_papers', 'find_quotes', 'annotated_bibliography']))
        expect(names(after)).not.toContain('create_artifact')
    })

    it('includes follow-ups immediately when the question asks for them', () => {
        const selected = selectTurnTools(tools, {
            mode: 'ask',
            question: 'related papers for DOI 10.1000/xyz',
            academicFollowUps: false,
        })
        expect(names(selected)).toContain('related_papers')
        expect(names(selected)).not.toContain('generate_image')
    })

    it('keeps the full list when the question also wants a studio tool', () => {
        expect(
            names(selectTurnTools(tools, { mode: 'ask', question: 'Heidegger kavram haritası çiz' }))
        ).toEqual(NAMES)
        expect(researchProtocolFor('Heidegger kavram haritası çiz')).toBeNull()
    })

    it('plan mode keeps its own filter; execute keeps every tool', () => {
        const planned = selectTurnTools(tools, { mode: 'plan', question: 'Heidegger technology sources' })
        expect(names(planned)).toContain('web_search')
        expect(names(planned)).toContain('todo_write')
        expect(names(planned)).not.toContain('create_artifact')
        expect(names(selectTurnTools(tools, { mode: 'execute', question: 'Heidegger technology sources' }))).toEqual(NAMES)
    })

    it('uses the short academic protocol only for a research ask', () => {
        expect(researchProtocolFor('merhaba')).toBeNull()
        const protocol = researchProtocolFor('Kant etiği üzerine makaleler')
        expect(protocol).toContain('[P1]')
        expect(protocol).not.toContain('create_artifact')
    })

    it('sees an academic seed already stored on a resumed thread', () => {
        expect(
            messagesUsedAcademicSeed([
                { tool_calls: [{ function: { name: 'search_academic_corpus' } }] },
            ])
        ).toBe(true)
        expect(messagesUsedAcademicSeed([{ tool_calls: [{ function: { name: 'web_search' } }] }])).toBe(false)
    })
})

const seedMessages = [
    {
        role: 'assistant',
        tool_calls: [{ id: 'c1', function: { name: 'search_academic_corpus' } }],
    },
    { role: 'tool', tool_call_id: 'c1', content: '{"ok":true,"papers":[]}' },
]

describe('post-seed tool schemas', () => {
    it('drops the corpus schema after a successful search and keeps the chain', () => {
        const selected = names(
            selectTurnTools(tools, {
                mode: 'ask',
                question: 'Heidegger technology sources',
                academicFollowUps: true,
                messages: seedMessages,
            })
        )
        expect(selected).not.toContain('search_academic_corpus')
        expect(selected).toEqual(expect.arrayContaining(['related_papers', 'find_quotes', 'annotated_bibliography', 'web_search']))
        expect(selected).not.toContain('insert_notebook_block')
        expect(selected).not.toContain('create_artifact')
        expect(selected).not.toContain('generate_image')
    })

    it('keeps notebook tools only when the question asks to save', () => {
        const selected = names(
            selectTurnTools(tools, {
                mode: 'ask',
                question: 'Heidegger sources, deftere ekle',
                academicFollowUps: true,
                messages: seedMessages,
            })
        )
        expect(selected).toContain('insert_notebook_block')
        expect(selected).not.toContain('search_academic_corpus')
    })

    it('keeps a failed search so the model can retry it', () => {
        const failed = [
            {
                role: 'assistant',
                tool_calls: [{ id: 'c1', function: { name: 'search_academic_corpus' } }],
            },
            { role: 'tool', tool_call_id: 'c1', content: '{"ok":false,"error":"timeout"}' },
        ]
        expect(
            names(
                selectTurnTools(tools, {
                    mode: 'ask',
                    question: 'Heidegger technology sources',
                    messages: failed,
                })
            )
        ).toContain('search_academic_corpus')
    })

    it('still sends follow-up schemas on the first turn after papers', () => {
        expect(
            shouldOmitResearchWrite({
                mode: 'ask',
                question: 'Heidegger technology sources',
                messages: seedMessages,
            })
        ).toBe(false)
    })

    it('drops schemas on the write after the chain already ran', () => {
        const chained = [
            ...seedMessages,
            {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'c2', function: { name: 'related_papers' } }],
            },
            { role: 'tool', tool_call_id: 'c2', content: '{"ok":true}' },
        ]
        expect(
            shouldOmitResearchWrite({
                mode: 'ask',
                question: 'Heidegger technology sources',
                messages: chained,
            })
        ).toBe(true)
        expect(questionFollowUpNames('Heidegger technology sources')).toEqual([])
    })

    it('keeps the write tools-on when a requested quote has not been fetched', () => {
        const looked = [
            ...seedMessages,
            { role: 'assistant', content: 'Checking the paper.' },
        ]
        expect(
            shouldOmitResearchWrite({
                mode: 'ask',
                question: 'Heidegger technology sources, alıntı getir',
                messages: looked,
            })
        ).toBe(false)
        expect(questionFollowUpNames('Heidegger technology sources, alıntı getir')).toContain('find_quotes')
    })

    it('does not strip schemas for plan mode or a non-research question', () => {
        const chained = [
            ...seedMessages,
            { role: 'assistant', content: 'done' },
        ]
        expect(
            shouldOmitResearchWrite({
                mode: 'plan',
                question: 'Heidegger technology sources',
                messages: chained,
            })
        ).toBe(false)
        expect(
            shouldOmitResearchWrite({
                mode: 'ask',
                question: 'merhaba',
                messages: chained,
            })
        ).toBe(false)
    })
})
