import { describe, expect, it } from 'vitest'
import { parseMarkdownNotebook, relaxBracketEscapes, serializeMarkdownNotebook } from './markdown'

const roundTrip = (markdown: string) => serializeMarkdownNotebook(parseMarkdownNotebook(markdown))
const shape = (markdown: string) => JSON.parse(JSON.stringify(parseMarkdownNotebook(markdown).nodes, (key, value) => (key === 'id' ? undefined : value)))

describe('notebook markdown round-trips keep existing markdown', () => {
    it.each([
        ['GitHub callout', '# T\n\n> [!TIP]\n> Body text here'],
        ['callout with title', '# T\n\n> [!NOTE] Heads up\n> Body'],
        ['warning callout', '> [!WARNING]\n> Careful'],
        ['citation markers', 'See [P1], [P2, P3] and [Source 4].'],
        ['footnotes', 'Claim[^1] and more[^2].\n\n[^1]: Ref one\n[^2]: Ref two'],
        ['tasks', '- [ ] task\n- [x] done'],
        ['links and wikilinks', 'A [link](https://x.y/a) and [[Wiki Page]].'],
        ['code with brackets', 'Code `a[1]` and arr[5].'],
        ['bold brackets', '**[P1]** bold'],
    ])('%s survives save → load → save unchanged', (_label, markdown) => {
        const once = roundTrip(markdown)
        expect(once).toBe(markdown)
        expect(roundTrip(once)).toBe(once)
    })

    it('inserting a block into a note with a callout does not escape the callout', () => {
        const existing = '# Notes\n\n> [!TIP]\n> Keep it short'
        const doc = parseMarkdownNotebook(existing)
        const inserted = parseMarkdownNotebook('New paragraph [P1].')
        const merged = serializeMarkdownNotebook({ ...doc, nodes: [...doc.nodes, ...inserted.nodes] })
        expect(merged).toContain('> [!TIP]\n> Keep it short')
        expect(merged).not.toContain('\\[!TIP')
        expect(merged).toContain('New paragraph [P1].')
    })

    it('keeps escapes that protect literal text from becoming syntax', () => {
        // A literal footnote-looking text, a literal link-looking text, a non-task list item
        // and a definition-looking line must stay literal after re-parse.
        for (const literal of ['\\[^1\\] literal', 'text \\[foo\\](bar)', '- \\[ \\] not a task', '\\[x\\]: not a def', '\\[\\[not wiki\\]\\]']) {
            const once = roundTrip(literal)
            expect(shape(once)).toEqual(shape(literal))
            expect(roundTrip(once)).toBe(once)
        }
        expect(roundTrip('- \\[ \\] not a task')).toMatch(/^- \\\[/)
        expect(roundTrip('text \\[foo\\](bar)')).not.toMatch(/(^|[^\\])\[foo\]\(bar\)/)
    })

    it('relaxBracketEscapes only relaxes when the parse is identical', () => {
        expect(relaxBracketEscapes('> \\[!TIP\\]')).toBe('> [!TIP]')
        expect(relaxBracketEscapes('\\[a\\](b)')).not.toBe('[a](b)')
        expect(relaxBracketEscapes('plain')).toBe('plain')
    })
})
