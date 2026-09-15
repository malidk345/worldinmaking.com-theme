import { describe, it, expect } from 'vitest'
import { executeExportNotebook, executeArrangeWorkspacePreset } from './execute'
import { executeReplaceNotebookSelection } from './host'

describe('notebook AI bridge regressions', () => {
    describe('export_notebook', () => {
        const mockHost = {
            notebooks: [{ id: 'nb1', title: 'Test Notebook', content: '# Intro\n\nhello world [^1]\n\n[^1]: footnote test' }],
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

        it('honors include_toc for html', () => {
            const withToc = executeExportNotebook('html', 'nb1', true, true, mockHost as any)
            const withoutToc = executeExportNotebook('html', 'nb1', false, true, mockHost as any)
            expect(withToc.ok).toBe(true)
            expect(withoutToc.ok).toBe(true)
            // Real TOC marker on main (#635): <ul> of heading anchors + <hr />
            expect(withToc.artifact?.content).toContain('<li><a href="#intro">Intro</a></li>')
            expect(withoutToc.artifact?.content).not.toContain('<li><a href="#intro">Intro</a></li>')
        })
    })

    describe('arrange_workspace_preset', () => {
        it('studio preset maps correctly to workspace-chat', () => {
            const result = executeArrangeWorkspacePreset('studio')
            expect(result.ok).toBe(true)
            expect(result.action?.type).toBe('manage_windows')
            expect(result.action?.payload.action).toBe('split')
            expect(result.action?.payload.left_path).toBe('/notebooks')
            expect(result.action?.payload.right_path).toBe('/workspace-chat')
        })

        it('split_dual right is /workspace-chat and prefers open notebook', () => {
            const withNotebook = executeArrangeWorkspacePreset('split_dual', {
                windows: [{ path: '/notebooks/nb-1' }],
            } as any)
            expect(withNotebook.ok).toBe(true)
            expect(withNotebook.action?.payload.action).toBe('split')
            expect(withNotebook.action?.payload.left_path).toBe('/notebooks/nb-1')
            expect(withNotebook.action?.payload.right_path).toBe('/workspace-chat')

            const fallback = executeArrangeWorkspacePreset('split_dual')
            expect(fallback.ok).toBe(true)
            expect(fallback.action?.payload.left_path).toBe('/notebooks')
            expect(fallback.action?.payload.right_path).toBe('/workspace-chat')
        })

        it('research uses split (not tile) matching resolver', () => {
            const result = executeArrangeWorkspacePreset('research')
            expect(result.ok).toBe(true)
            expect(result.action?.payload.action).toBe('split')
            expect(result.action?.payload.left_path).toBe('/scratchpad')
            expect(result.action?.payload.right_path).toBe('/notebooks')
        })

        it('unknown preset fails closed', () => {
            const result = executeArrangeWorkspacePreset('not_a_real_preset')
            expect(result.ok).toBe(false)
            expect(result.result).toContain('unknown preset')
            expect(result.action).toBeUndefined()
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
            // span_text not yet on replace payload on this branch — content assert only
        })
    })
})
