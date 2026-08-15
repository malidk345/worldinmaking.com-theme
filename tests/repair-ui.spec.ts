import { test, expect } from '@playwright/test'
import { buildRepairUiPrompt, extractRepairedReactSource } from '../src/lib/ai/repair-ui'
import { prepareSandpackSource } from '../src/components/ClaudeWorkspaceChat/sandbox/reactPreview'
import { parse } from '@babel/parser'

function assertParses(code: string) {
    parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        allowReturnOutsideFunction: true,
    })
}

test.describe('silent UI repair', () => {
    test('pulls a fenced component out of a chatty repair reply', () => {
        const reply = [
            'Here is the fixed file.',
            '```tsx',
            'export default function Map() {',
            '  return <svg><circle fill="#1e3a5f" /></svg>',
            '}',
            '```',
        ].join('\n')

        const source = extractRepairedReactSource(reply)
        expect(source).toContain('function Map')
        expect(source).not.toContain('Here is the fixed file')
    })

    test('builds a compact repair prompt around the error', () => {
        const prompt = buildRepairUiPrompt('<div className="p-4">Hi</div>', 'Unterminated string constant (21:60)')
        expect(prompt).toContain('Unterminated string constant')
        expect(prompt).toContain('className="p-4"')
    })

    test('local heal still parses a truncated color attribute without the model', () => {
        const source = [
            'export default function Map() {',
            '  const isSelected = true',
            "  return <svg><circle r={isSelected ? 32 : 26} fill={isSelected ? '#1e3a5f",
            '>',
            '</circle></svg>',
            '}',
        ].join('\n')
        const prepared = prepareSandpackSource(source)
        assertParses(prepared)
        expect(prepared).toContain('#1e3a5f')
    })
})
