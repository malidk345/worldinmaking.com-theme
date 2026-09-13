import { describe, it, expect } from 'vitest'
import { executeAddNotebookFootnote, type HostSnapshot } from './host'
import { executeToolCall, resolveToolName } from './execute'

describe('add_notebook_footnote tool execution', () => {
    const mockHost: HostSnapshot = {
        notebookId: 'nb-123',
        notebookTitle: 'Critique of Pure Reason Notes',
        notebooks: [
            {
                id: 'nb-123',
                title: 'Critique of Pure Reason Notes',
                content: 'Kant introduces the synthetic a priori judgment as the foundation for metaphysics.',
            },
        ],
    }

    it('rejects empty or missing footnote text', () => {
        const result = executeAddNotebookFootnote(mockHost, '')
        expect(result.ok).toBe(false)
        const parsed = JSON.parse(result.result)
        expect(parsed.ok).toBe(false)
        expect(parsed.error).toContain('text')
    })

    it('fails gracefully when no notebook is bound or available', () => {
        const result = executeAddNotebookFootnote(undefined, 'Kant (1781), CPR A51/B75.')
        expect(result.ok).toBe(false)
        const parsed = JSON.parse(result.result)
        expect(parsed.ok).toBe(false)
        expect(parsed.error).toContain('No notebook is bound')
    })

    it('auto-increments marker starting from 1 when no footnotes exist', () => {
        const result = executeAddNotebookFootnote(
            mockHost,
            'Kant, Immanuel. Critique of Pure Reason (1781).',
            'synthetic a priori judgment'
        )

        expect(result.ok).toBe(true)
        expect(result.action).toBeDefined()
        expect(result.action?.type).toBe('add_notebook_footnote')
        expect(result.action?.payload.marker).toBe('1')
        expect(result.action?.payload.span_text).toBe('synthetic a priori judgment')
        expect(result.action?.payload.text).toBe('Kant, Immanuel. Critique of Pure Reason (1781).')
    })

    it('auto-increments to next available numeric marker when footnotes already exist', () => {
        const hostWithFootnotes: HostSnapshot = {
            notebookId: 'nb-123',
            notebooks: [
                {
                    id: 'nb-123',
                    title: 'Philosophy Draft',
                    content: 'First premise[^1]. Second premise[^2]. Third premise.\n\n[^1]: Note 1\n[^2]: Note 2',
                },
            ],
        }

        const result = executeAddNotebookFootnote(
            hostWithFootnotes,
            'Third premise citation.',
            'Third premise'
        )

        expect(result.ok).toBe(true)
        expect(result.action?.payload.marker).toBe('3')
    })

    it('respects custom string markers when provided', () => {
        const result = executeAddNotebookFootnote(
            mockHost,
            'Special scholarly gloss.',
            'metaphysics',
            'kant-cpr'
        )

        expect(result.ok).toBe(true)
        expect(result.action?.payload.marker).toBe('kant-cpr')
    })

    it('resolves tool name aliases properly', () => {
        expect(resolveToolName('add_footnote')).toBe('add_notebook_footnote')
        expect(resolveToolName('insert_footnote')).toBe('add_notebook_footnote')
        expect(resolveToolName('insert_notebook_footnote')).toBe('add_notebook_footnote')
        expect(resolveToolName('notebook_footnote')).toBe('add_notebook_footnote')
        expect(resolveToolName('footnote')).toBe('add_notebook_footnote')
        expect(resolveToolName('add_dipnot')).toBe('add_notebook_footnote')
        expect(resolveToolName('dipnot')).toBe('add_notebook_footnote')
    })

    it('executes through executeToolCall with argument normalization', async () => {
        const result = await executeToolCall(
            {
                id: 'call-fn-1',
                name: 'add_footnote',
                argumentsJson: JSON.stringify({
                    quote: 'synthetic a priori judgment',
                    comment: 'CPR B19: "All mathematical judgments are synthetic."',
                    id: 'b19',
                }),
            },
            undefined,
            mockHost,
            'execute'
        )

        expect(result.name).toBe('add_notebook_footnote')
        expect(result.ok).toBe(true)
        expect(result.action).toBeDefined()
        expect(result.action?.type).toBe('add_notebook_footnote')
        expect(result.action?.payload.marker).toBe('b19')
        expect(result.action?.payload.span_text).toBe('synthetic a priori judgment')
        expect(result.action?.payload.text).toBe('CPR B19: "All mathematical judgments are synthetic."')
    })
})
