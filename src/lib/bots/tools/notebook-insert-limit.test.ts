import { describe, expect, it } from 'vitest'
import type { HostSnapshot } from './host'
import { clipNotebookInsert, executeInsertNotebookBlock, NOTEBOOK_INSERT_HARD_MAX_CHARS, NOTEBOOK_INSERT_MAX_CHARS } from './host'

const host: HostSnapshot = {
    notebookId: 'nb-1',
    notebookTitle: 'Notes',
    notebooks: [{ id: 'nb-1', title: 'Notes', content: '# Notes' }],
}

const entry = (i: number) => `Author${i}, A. (2020). A long title number ${i}. Journal, 1(1), 1–2. https://doi.org/10.1/${i}\n\n${'Annotation text. '.repeat(40)}`

describe('insert_notebook_block size limit', () => {
    it('keeps a 12k block intact (old 8,000 cap silently cut it)', () => {
        const long = Array.from({ length: 16 }, (_, i) => entry(i)).join('\n\n')
        expect(long.length).toBeGreaterThan(8_000)
        expect(long.length).toBeLessThan(NOTEBOOK_INSERT_MAX_CHARS)
        const res = executeInsertNotebookBlock(host, long)
        expect(res.ok).toBe(true)
        expect(res.truncated).toBe(false)
        expect(String(res.action?.payload.content)).toBe(long.trim())
    })

    it('clips at a paragraph boundary and reports truncation', () => {
        const huge = Array.from({ length: 80 }, (_, i) => entry(i)).join('\n\n')
        const { body, truncated } = clipNotebookInsert(huge, 10_000)
        expect(truncated).toBe(true)
        expect(body.length).toBeLessThanOrEqual(10_000)
        expect(huge.startsWith(body)).toBe(true)
        expect(huge.slice(body.length, body.length + 2)).toBe('\n\n')
        const res = executeInsertNotebookBlock(host, huge, undefined, { maxChars: 10_000 })
        expect(JSON.parse(res.result)).toMatchObject({ ok: true, truncated: true })
    })

    it('never exceeds the hard ceiling even when a caller asks for more', () => {
        const huge = 'x'.repeat(NOTEBOOK_INSERT_HARD_MAX_CHARS + 5_000)
        const { body, truncated } = clipNotebookInsert(huge, 10 ** 9)
        expect(truncated).toBe(true)
        expect(body.length).toBe(NOTEBOOK_INSERT_HARD_MAX_CHARS)
    })
})
