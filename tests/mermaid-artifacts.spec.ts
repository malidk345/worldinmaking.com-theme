import { test, expect } from '@playwright/test'
import { artifactToNotebookMarkdown } from '../src/lib/notebook-artifact-block'
import {
    artifactLooksLikeMermaid,
    cleanMermaidSource,
    isDiagramRequest,
    isMermaidSource,
} from '../src/lib/mermaid-loader'
import { isChartRequest } from '../src/lib/ai/chart-artifacts'
import { isUiDesignRequest, UI_DESIGN_INSTRUCTION } from '../src/lib/ai/design-request'
import {
    WIM_ARTIFACT_THEME_CSS,
    WIM_NAVY,
    WIM_PAPER,
    wrapHtmlArtifactDocument,
} from '../src/lib/wim-artifact-theme'
import { SHADCN_THEME_CSS } from '../src/components/ClaudeWorkspaceChat/sandbox/shadcnTheme'
import { WIM_UI_SOURCE } from '../src/components/ClaudeWorkspaceChat/sandbox/wimUiSource'
import type { Artifact } from '../src/components/ClaudeWorkspaceChat/types'

function mermaidArtifact(content: string): Artifact {
    return {
        id: 'art-1',
        title: 'Login Flow',
        type: 'mermaid',
        language: 'mermaid',
        content,
        version: 1,
        createdAt: new Date().toISOString(),
    }
}

test.describe('mermaid detection and notebook insert', () => {
    test('recognizes flowchart, sequence, and init-directive sources', () => {
        expect(isMermaidSource('flowchart TD\nA-->B')).toBe(true)
        expect(isMermaidSource('graph LR\nA-->B')).toBe(true)
        expect(isMermaidSource('sequenceDiagram\nAlice->>Bob: hi')).toBe(true)
        expect(isMermaidSource('%%{init: {"theme":"dark"}}%%\nflowchart TD\nA-->B')).toBe(true)
        expect(isMermaidSource('```mermaid\nflowchart TD\nA-->B\n```')).toBe(true)
        expect(isMermaidSource('export default function Screen() { return <div /> }')).toBe(false)
        expect(isMermaidSource('Pie is a dessert, not a diagram.')).toBe(false)
    })

    test('diagram prompts are mermaid, not charts or UI screens', () => {
        expect(isDiagramRequest('Draw a mermaid diagram of the login flow')).toBe(true)
        expect(isDiagramRequest('bir akış şeması çiz')).toBe(true)
        expect(isChartRequest('Draw a mermaid diagram of the login flow')).toBe(false)
        expect(isUiDesignRequest('Draw a mermaid diagram of the login flow')).toBe(false)
        expect(isChartRequest('Aylık gelir grafiği oluştur')).toBe(true)
    })

    test('strips fences before render / insert', () => {
        expect(cleanMermaidSource('```mermaid\nflowchart TD\nA-->B\n```')).toBe('flowchart TD\nA-->B')
        expect(artifactLooksLikeMermaid({ type: 'code', language: 'mermaid', content: 'flowchart TD\nA-->B' })).toBe(
            true
        )
    })

    test('sandbox theme uses WorldInMaking navy and paper, not zinc', () => {
        expect(SHADCN_THEME_CSS).toBe(WIM_ARTIFACT_THEME_CSS)
        expect(WIM_ARTIFACT_THEME_CSS).toContain(WIM_NAVY)
        expect(WIM_ARTIFACT_THEME_CSS).toContain('--bg:')
        expect(WIM_ARTIFACT_THEME_CSS).not.toContain('240 5.9% 10%')
        expect(WIM_UI_SOURCE).toContain('bg-navy')
        expect(WIM_UI_SOURCE).toContain('border-primary')
        expect(UI_DESIGN_INSTRUCTION).toContain(WIM_NAVY)
        expect(UI_DESIGN_INSTRUCTION).toContain('bg-navy')
    })

    test('HTML artifacts get the site theme stylesheet', () => {
        const doc = wrapHtmlArtifactDocument('<div class="bg-background">Hi</div>')
        expect(doc).toContain('cdn.tailwindcss.com')
        expect(doc).toContain('--bg:')
        expect(doc).toContain('class="bg-primary"')
    })

    test('Add to notebook inserts a mermaid fence, not a source dump of another language', () => {
        const markdown = artifactToNotebookMarkdown(
            mermaidArtifact('```mermaid\nflowchart TD\n  Login --> Home\n```')
        )
        expect(markdown).toContain('```mermaid')
        expect(markdown).toContain('flowchart TD')
        expect(markdown).toContain('Login --> Home')
        expect(markdown.match(/```mermaid/g)?.length).toBe(1)
    })
})
