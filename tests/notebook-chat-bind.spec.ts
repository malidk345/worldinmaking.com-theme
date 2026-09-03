import { test, expect } from '@playwright/test'
import { extractUiScreenSource, isAdminNavigationRequest, isUiDesignRequest, UI_DESIGN_INSTRUCTION } from '../src/lib/ai/design-request'
import { artifactToNotebookMarkdown, messageToNotebookMarkdown } from '../src/lib/notebook-artifact-block'
import {
    buildNotebookAgentContext,
    clipNotebookBackground,
    extractNotebookOutline,
    isNotebookTask,
    NOTEBOOK_AVAILABLE_INSTRUCTION,
} from '../src/lib/notebook-chat-bind'

test.describe('notebook chat bind context', () => {
    test('extracts a short outline from markdown headings', () => {
        expect(
            extractNotebookOutline('# Agora\n\nIntro\n\n## Forum\n\nText\n\n### Voice\n\nMore', 2)
        ).toEqual(['# Agora', '## Forum'])
    })

    test('sends a large notebook instead of only the first page', () => {
        const longBody = `${'alpha '.repeat(2000)}\n\n## Later\n${'omega '.repeat(800)}`
        const context = buildNotebookAgentContext({
            title: 'Long notes',
            content: `# Start\n\n${longBody}`,
        })
        expect(context).toContain('Notebook length:')
        expect(context).toContain('omega')
        expect(context.length).toBeGreaterThan(8000)
    })

    test('ordinary chat is not a notebook task even if a notebook is open', () => {
        expect(isNotebookTask('özgürlük nedir')).toBe(false)
        expect(isNotebookTask('marx ne düşünür')).toBe(false)
        expect(isNotebookTask('what is freedom')).toBe(false)
        expect(isNotebookTask('bu paragrafı düzelt')).toBe(true)
        expect(isNotebookTask('notebooka bunu ekle')).toBe(true)
        expect(isNotebookTask('rewrite the selection')).toBe(true)
    })

    test('ordinary chat does not receive the full notebook body as the subject', () => {
        const full = buildNotebookAgentContext({
            title: 'Labor notes',
            content: '# Labor\n\n## Wages\n\n' + 'surplus value '.repeat(400),
        })
        expect(full).toContain('surplus value')
        const clipped = clipNotebookBackground(full)
        expect(clipped).toContain('Labor notes')
        expect(clipped).toContain('Outline:')
        expect(clipped).not.toContain('surplus value')
        expect(clipped).toContain('not the current task')
        expect(NOTEBOOK_AVAILABLE_INSTRUCTION).toContain('optional background')
        expect(NOTEBOOK_AVAILABLE_INSTRUCTION).toContain('Answer the Query / Prompt first')
        expect(NOTEBOOK_AVAILABLE_INSTRUCTION).not.toContain('Do not only dump notes')
    })

    test('prefers selection over dumping the whole notebook first', () => {
        const context = buildNotebookAgentContext({
            title: 'Agora notes',
            content: '# Agora\n\nLong body here',
            selection: 'edit this sentence',
        })
        expect(context).toContain('Bound notebook title: Agora notes')
        expect(context).toContain('# Agora')
        expect(context).toContain('Current selection (edit target)')
        expect(context).toContain('edit this sentence')
    })
})

test.describe('design vs admin navigation', () => {
    test('UI design turns are instructed to emit code only', () => {
        expect(UI_DESIGN_INSTRUCTION).toMatch(/NOTHING except one complete <antArtifact/i)
        expect(UI_DESIGN_INSTRUCTION).toMatch(/Code only/i)
        expect(UI_DESIGN_INSTRUCTION).not.toMatch(/1-3 sentences/i)
    })

    test('a dashboard design request is not an admin redirect', () => {
        expect(isUiDesignRequest('bir analytics dashboard tasarla')).toBe(true)
        expect(isAdminNavigationRequest('bir analytics dashboard tasarla')).toBe(false)
        expect(isAdminNavigationRequest('open admin dashboard')).toBe(true)
        expect(isUiDesignRequest('open admin')).toBe(false)
    })

    test('any make-on-screen ask is a UI build, not only dashboards', () => {
        expect(isUiDesignRequest('bana basit bir şey yap')).toBe(true)
        expect(isUiDesignRequest('oyun yap')).toBe(true)
        expect(isUiDesignRequest('hesap makinesi oluştur')).toBe(true)
        expect(isUiDesignRequest('şu haritayı çiz')).toBe(true)
        expect(isUiDesignRequest('marx ne düşünür')).toBe(false)
        expect(isUiDesignRequest('şu tabloyu yap')).toBe(false)
        expect(isUiDesignRequest('grafik oluştur')).toBe(false)
        expect(isUiDesignRequest('make me a simple game')).toBe(true)
        expect(isUiDesignRequest('build a calculator')).toBe(true)
        expect(isUiDesignRequest('create a todo app')).toBe(true)
        expect(isUiDesignRequest('I want a landing page')).toBe(true)
        expect(isUiDesignRequest('can you make a clock')).toBe(true)
        expect(isUiDesignRequest('show me a weather widget')).toBe(true)
        expect(isUiDesignRequest('what is a dashboard')).toBe(false)
        expect(isUiDesignRequest('make a comparison table')).toBe(false)
        expect(isUiDesignRequest('create a bar chart')).toBe(false)
    })

    test('extracts a React screen from an unlabeled fence', () => {
        const screen = extractUiScreenSource(
            [
                'Kurduğum ekran aşağıda.',
                '',
                '```',
                'function OpsDashboard() {',
                '  return <section className="p-6"><h1 className="text-xl">Ops</h1></section>',
                '}',
                '```',
            ].join('\n')
        )
        expect(screen?.title).toBe('OpsDashboard')
        expect(screen?.content).toContain('function OpsDashboard')
    })
})

test.describe('notebook artifact blocks', () => {
    test('inserts a table as a markdown table, not a code dump', () => {
        const markdown = artifactToNotebookMarkdown({
            id: 't1',
            title: 'Q1',
            type: 'table',
            content: '| Product | Price |\n| --- | --- |\n| Apple | 10 |',
            version: 1,
            createdAt: '2026-08-15',
        })
        expect(markdown).toContain('### Q1')
        expect(markdown).toContain('| Apple | 10 |')
        expect(markdown).not.toContain('```')
    })

    test('inserts a chart as a live chart fence', () => {
        const markdown = artifactToNotebookMarkdown({
            id: 'c1',
            title: 'Revenue',
            type: 'chart',
            content: '{"kind":"bar","xKey":"m","series":[{"key":"v"}],"data":[{"m":"Jan","v":2}]}',
            chartSpec: {
                kind: 'bar',
                xKey: 'm',
                series: [{ key: 'v' }],
                data: [{ m: 'Jan', v: 2 }],
            },
            version: 1,
            createdAt: '2026-08-15',
        })
        expect(markdown).toContain('```chart')
        expect(markdown).toContain('"kind": "bar"')
    })

    test('inserts a react screen as a react fence for the live notebook block', () => {
        const markdown = artifactToNotebookMarkdown({
            id: 'r1',
            title: 'Ops',
            type: 'react',
            content: 'export default function Ops() { return <div className="p-4">Hi</div> }',
            version: 1,
            createdAt: '2026-08-15',
        })
        expect(markdown).toContain('```react')
        expect(markdown).toContain('function Ops')
    })

    test('apply-last-reply prefers artifact blocks over the opened-preview sentence', () => {
        const markdown = messageToNotebookMarkdown({
            content: 'Opened **"Ops"** in the preview workspace.',
            artifacts: [
                {
                    id: 'r1',
                    title: 'Ops',
                    type: 'react',
                    content: 'export default function Ops() { return <div className="p-4">Hi</div> }',
                    version: 1,
                    createdAt: '2026-08-15',
                },
            ],
        })
        expect(markdown).toContain('```react')
        expect(markdown).not.toContain('Opened')
    })
})
