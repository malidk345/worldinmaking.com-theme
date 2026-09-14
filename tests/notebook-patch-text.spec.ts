import { test, expect } from '@playwright/test'
import { applyNotebookPatchText } from '../src/lib/notebook-patch-text'

test.describe('applyNotebookPatchText (Diff Apply)', () => {
    test('replaces a unique removed block with added text', () => {
        const current = 'Hello\nold paragraph\nWorld'
        const result = applyNotebookPatchText(current, {
            removed: 'old paragraph',
            added: 'new paragraph',
        })
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.mode).toBe('removed')
            expect(result.next).toBe('Hello\nnew paragraph\nWorld')
        }
    })

    test('prefers unique spanText over removed', () => {
        const current = 'AAA target BBB'
        const result = applyNotebookPatchText(current, {
            removed: 'AAA',
            added: 'REPLACED',
            spanText: 'target',
        })
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.mode).toBe('span')
            expect(result.next).toBe('AAA REPLACED BBB')
        }
    })

    test('fails closed when removed block is not unique (no append)', () => {
        const current = 'dup\nmiddle\ndup'
        const result = applyNotebookPatchText(current, {
            removed: 'dup',
            added: 'x',
        })
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toMatch(/uniquely/i)
        }
        expect(current).toBe('dup\nmiddle\ndup')
    })

    test('fails closed when removed block is missing', () => {
        const result = applyNotebookPatchText('only this', {
            removed: 'missing block',
            added: 'new',
        })
        expect(result.ok).toBe(false)
    })

    test('fails closed when neither span nor removed is usable', () => {
        const result = applyNotebookPatchText('doc', { added: 'stuff' })
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toMatch(/No removed text/i)
        }
    })
})
