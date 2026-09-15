import { test, expect } from '@playwright/test'
import { executeExportNotebook } from '../src/lib/bots/tools/execute'
import { HostSnapshot } from '../src/lib/bots/tools/spec'

test.describe('executeExportNotebook', () => {
    test('should strip footnotes when includeFootnotes is false', () => {
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

    test('should normalize footnotes when includeFootnotes is true', () => {
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

test('should strip footnotes in LaTeX export when includeFootnotes is false', () => {
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

    const result = executeExportNotebook('latex', '123', false, false, host)
    expect(result.ok).toBe(true)
    expect(result.artifact?.content).toContain('Hello world. This is a test.')
    expect(result.artifact?.content).not.toContain('\\textasciicircum')
    expect(result.artifact?.content).not.toContain('First footnote.')
    expect(result.artifact?.content).toContain('And another paragraph.')
})

test('should transform footnotes to \\footnote{} in LaTeX export when includeFootnotes is true', () => {
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

    const result = executeExportNotebook('latex', '123', false, true, host)
    expect(result.ok).toBe(true)
    expect(result.artifact?.content).toContain('Hello world\\footnote{First footnote.}. This is a test\\footnote{Second footnote across multiple lines?}.')
    expect(result.artifact?.content).toContain('And another paragraph.')
    expect(result.artifact?.content).not.toContain('\\textasciicircum')
})

    test('should include TOC in HTML export when includeToc is true', () => {
        const host: HostSnapshot = {
            notebooks: [
                {
                    id: '123',
                    title: 'Test Notebook',
                    content: '# Introduction\n\nSome text.\n\n## Details\n\nMore text.',
                    slug: 'test-notebook',
                    version: 1,
                    type: 'notebook',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ]
        }

        const result = executeExportNotebook('html', '123', true, false, host)
        expect(result.ok).toBe(true)
        expect(result.artifact?.content).toContain('<ul>')
        expect(result.artifact?.content).toContain('<li><a href="#introduction">Introduction</a></li>')
        expect(result.artifact?.content).toContain('  <li><a href="#details">Details</a></li>')
        expect(result.artifact?.content).toContain('<h1 id="introduction">Introduction</h1>')
        expect(result.artifact?.content).toContain('<h2 id="details">Details</h2>')
    })

    test('should exclude TOC in HTML export when includeToc is false', () => {
        const host: HostSnapshot = {
            notebooks: [
                {
                    id: '123',
                    title: 'Test Notebook',
                    content: '# Introduction\n\nSome text.\n\n## Details\n\nMore text.',
                    slug: 'test-notebook',
                    version: 1,
                    type: 'notebook',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ]
        }

        const result = executeExportNotebook('html', '123', false, false, host)
        expect(result.ok).toBe(true)
        expect(result.artifact?.content).not.toContain('<ul>')
        expect(result.artifact?.content).not.toContain('<li><a href="#introduction">Introduction</a></li>')
        expect(result.artifact?.content).toContain('<h1 id="introduction">Introduction</h1>')
        expect(result.artifact?.content).toContain('<h2 id="details">Details</h2>')
    })
})
