import { describe, expect, it } from 'vitest'
import { citationMarkersToFootnotes, notebookHasSource, notebookSourceKey } from './notebook-citations'
import { messageToNotebookMarkdown } from './notebook-artifact-block'
import { parseMarkdownNotebook, serializeMarkdownNotebook } from '../notebook-app/lib/components/MarkdownNotebook/markdown'
import type { WebCitation } from '../components/ClaudeWorkspaceChat/types'

const heidegger: WebCitation = {
    id: 1,
    title: 'The question concerning technology',
    url: 'https://doi.org/10.1000/qct',
    snippet: '',
    kind: 'paper',
    authors: ['Martin Heidegger'],
    year: 1977,
    doi: '10.1000/qct',
}
const doe: WebCitation = { id: 2, title: 'Attention and machines', url: 'https://example.org/att', snippet: '', kind: 'paper', authors: ['Jane Doe'], year: 2020 }
const roe: WebCitation = { id: 3, title: 'Screens', url: 'https://example.org/screens', snippet: '', kind: 'web' }
const cited = [heidegger, doe, roe]

// Mirrors the audit's mocked answer (e2e-common.mjs ANSWER).
const ANSWER = 'Technology enframes [P1]. Attention is shaped by devices [P2, P3]. The tool form [P@1] leaks sometimes. Code like `x[1]` and arr[5] is not a citation; [P9] is unknown.'

describe('whole-reply Add → notebook footnotes', () => {
    it('turns [P#] / [P@n] / [n, m] markers into footnotes with APA definitions', () => {
        const md = citationMarkersToFootnotes(ANSWER, cited)
        expect(md).toContain('Technology enframes [^1].')
        expect(md).toContain('devices [^2][^3].')
        expect(md).toContain('The tool form [^1] leaks')
        expect(md).toContain('`x[1]` and arr[5]')
        expect(md).toContain('[P9] is unknown')
        expect(md).toMatch(/\n\[\^1\]: Heidegger, M\. \(1977\)\. The question concerning technology\..*https:\/\/doi\.org\/10\.1000\/qct/)
        expect(md).toMatch(/\n\[\^2\]: Doe, J\. \(2020\)\. Attention and machines\./)
        expect(md).toMatch(/\n\[\^3\]: .*Screens/)
        expect(md).not.toMatch(/\\\[P/)
    })

    it('supports [n] and [Source n] markers and keeps unknown ids next to known ones', () => {
        const md = citationMarkersToFootnotes('One [1]. Two [Source 2]. Mixed [2, 7].', cited)
        expect(md).toContain('One [^1]. Two [^2]. Mixed [^2] [7].')
    })

    it('leaves text alone without citations', () => {
        expect(citationMarkersToFootnotes('Plain [P1] text', [])).toBe('Plain [P1] text')
        expect(citationMarkersToFootnotes('No markers.', cited)).toBe('No markers.')
    })

    it('the notebook parses them as real footnotes (FOOTNOTES section), not escaped text', () => {
        const md = messageToNotebookMarkdown({ content: ANSWER, artifacts: [], citations: cited })
        const doc = parseMarkdownNotebook(md)
        expect(Object.keys(doc.footnotes || {})).toEqual(['1', '2', '3'])
        const saved = serializeMarkdownNotebook(doc)
        expect(saved).not.toContain('\\[P1\\]')
        expect(saved).toContain('[^1]: Heidegger, M. (1977)')
    })
})

describe('duplicate source detection', () => {
    const notebook = [
        '# Notes',
        '',
        'Claim[^1].',
        '',
        '[^1]: Heidegger, M. (1977). The question concerning technology. Harper. https://doi.org/10.1000/QCT',
        '',
        'Doe, J. (2020). Attention and machines. https://www.example.org/att/',
    ].join('\n')

    it('matches by DOI (case-insensitive), by URL (www / trailing slash) and by title in a reference line', () => {
        expect(notebookHasSource(notebook, notebookSourceKey(heidegger))).toBe(true)
        expect(notebookHasSource(notebook, notebookSourceKey(doe))).toBe(true)
        expect(notebookHasSource(notebook, { title: 'Attention and Machines!' })).toBe(true)
    })

    it('does not match a new source or a title merely mentioned in prose', () => {
        expect(notebookHasSource(notebook, notebookSourceKey(roe))).toBe(false)
        expect(notebookHasSource('I love The question concerning technology as a text.', { title: heidegger.title })).toBe(false)
        expect(notebookHasSource('', notebookSourceKey(heidegger))).toBe(false)
    })
})
