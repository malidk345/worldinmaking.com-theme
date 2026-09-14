import { describe, it, expect } from 'vitest'
import { executeExportNotebook, executeArrangeWorkspacePreset } from './execute'
import { executeReplaceNotebookSelection } from './host'

describe('notebook AI bridge regressions', () => {
    describe('export_notebook', () => {
        const mockHost = {
            notebooks: [{ id: 'nb1', title: 'Test Notebook', content: 'hello world [^1]\n\n[^1]: footnote test' }],
            notebookId: 'nb1'
        }

        it('respects includeFootnotes flag for markdown', () => {
            const resultWithFootnotes = executeExportNotebook('markdown', 'nb1', true, true, mockHost as any)
            const resultWithoutFootnotes = executeExportNotebook('markdown', 'nb1', true, false, mockHost as any)
            expect(resultWithFootnotes.ok).toBe(true)
            expect(resultWithoutFootnotes.ok).toBe(true)
            expect(resultWithFootnotes.artifact?.content).toBeDefined()
            expect(resultWithFootnotes.artifact?.content).not.toEqual(resultWithoutFootnotes.artifact?.content)
            expect(resultWithoutFootnotes.artifact?.content).not.toContain('footnote test')
            expect(resultWithoutFootnotes.artifact?.content).not.toContain('[^1]')
        })

        it.fails('ignores include_toc flag for html compilation (current buggy behavior)', () => {
            const htmlExport = executeExportNotebook('html', 'nb1', true, true, mockHost as any)
            expect(htmlExport.ok).toBe(true)
            // HTML export SHOULD contain TOC when include_toc is true, but it currently does not.
            // When the bug is fixed, this assertion should pass and the .fails modifier can be removed.
            expect(htmlExport.artifact?.content).toContain('<nav class="toc"')
        })
    })

    describe('arrange_workspace_preset', () => {
        it('studio preset maps correctly to workspace-chat', () => {
            const result = executeArrangeWorkspacePreset('studio')
            expect(result.action.type).toBe('manage_windows')
            expect(result.action.payload.action).toBe('split')
            expect(result.action.payload.left_path).toBe('/notebooks')
            expect(result.action.payload.right_path).toBe('/workspace-chat')
        })
    })

    describe('replace_notebook_selection', () => {
        it('fails closed when there is no active selection', () => {
            const mockHostWithoutSelection = {
                notebooks: [{ id: 'nb1', title: 'Test Notebook', content: 'hello world' }],
                notebookId: 'nb1',
                selection: ''
            }
            const result = executeReplaceNotebookSelection(mockHostWithoutSelection as any, 'new content')
            expect(result.ok).toBe(false)
            expect(result.result).toContain('No active selection to replace')
        })

        it('succeeds when there is an active selection', () => {
            const mockHostWithSelection = {
                notebooks: [{ id: 'nb1', title: 'Test Notebook', content: 'hello world' }],
                notebookId: 'nb1',
                selection: 'world'
            }
            const result = executeReplaceNotebookSelection(mockHostWithSelection as any, 'new content')
            expect(result.ok).toBe(true)
            expect(result.action?.type).toBe('replace_notebook_selection')
            expect(result.action?.payload?.content).toBe('new content')
        })
    })
})
