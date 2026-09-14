import { describe, it, expect } from 'vitest'
import { executeExportNotebook } from '../src/lib/bots/tools/execute'
import { HostSnapshot } from '../src/lib/bots/tools/spec'

describe('executeExportNotebook', () => {
    it('should strip footnotes when includeFootnotes is false', () => {
        const host: HostSnapshot = {
            notebooks: [
                {
                    id: '123',
                    title: 'Test Notebook',
                    content: 'Hello world[^1]. This is a test[^test].\n\n[^1]: First footnote.\n[^test]: Second footnote across\nmultiple lines?\n\nAnd another paragraph.',
                    slug: 'test-notebook',
                    version: 1,
                    type: 'notebook',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ]
        }

        const result = executeExportNotebook('markdown', '123', false, false, host)
        expect(result.ok).toBe(true)
        expect(result.artifact?.content).toContain('Hello world. This is a test.')
        expect(result.artifact?.content).not.toContain('[^1]')
        expect(result.artifact?.content).not.toContain('First footnote.')
        expect(result.artifact?.content).toContain('And another paragraph.')
    })

    it('should normalize footnotes when includeFootnotes is true', () => {
        const host: HostSnapshot = {
            notebooks: [
                {
                    id: '123',
                    title: 'Test Notebook',
                    content: 'Hello world[^1]. This is a test[^test].\n\n[^1]: First footnote.\n[^test]: Second footnote across\nmultiple lines?\n\nAnd another paragraph.',
                    slug: 'test-notebook',
                    version: 1,
                    type: 'notebook',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ]
        }

        const result = executeExportNotebook('markdown', '123', false, true, host)
        expect(result.ok).toBe(true)
        expect(result.artifact?.content).toContain('Hello world[^1]. This is a test[^test].')
        expect(result.artifact?.content).toContain('And another paragraph.')
        expect(result.artifact?.content).toContain('[^1]: First footnote.')
    })
})
