import { test, expect } from '@playwright/test'
import {
    extractChartArtifacts,
    normalizeChartSpec,
    parseChartSpec,
    stripChartArtifactMarkup,
} from '../src/lib/ai/chart-artifacts'
import { normalizeSandboxReactSource, WIM_UI_SOURCE } from '../src/components/ClaudeWorkspaceChat/sandbox/wimUiSource'

test.describe('validated chart artifacts', () => {
    test('normalizes a line chart and infers its numeric series', () => {
        const spec = normalizeChartSpec({
            kind: 'line',
            data: [
                { month: 'Jan', revenue: 120 },
                { month: 'Feb', revenue: 180 },
            ],
        })

        expect(spec).not.toBeNull()
        expect(spec?.xKey).toBe('month')
        expect(spec?.series).toEqual([{ key: 'revenue', label: 'revenue' }])
    })

    test('extracts an explicit chart envelope without exposing it in the reply', () => {
        const content =
            'Grafik hazır.\n<wimArtifact type="chart" title="Revenue">' +
            '{"kind":"bar","xKey":"month","series":[{"key":"value"}],"data":[{"month":"Jan","value":10}]}' +
            '</wimArtifact>'

        const artifacts = extractChartArtifacts(content, 'Aylık gelir grafiği oluştur')

        expect(artifacts).toHaveLength(1)
        expect(artifacts[0]?.chartSpec.kind).toBe('bar')
        expect(stripChartArtifactMarkup(content)).toBe('Grafik hazır.')
    })

    test('supports legacy chart JSON code blocks only for chart requests', () => {
        const content = '```json\n{"kind":"pie","data":[{"label":"A","value":3}]}\n```'

        expect(extractChartArtifacts(content, 'Bu verilerden pie chart yap')).toHaveLength(1)
        expect(extractChartArtifacts(content, 'JSON formatını açıkla')).toHaveLength(0)
        expect(parseChartSpec(content)?.kind).toBe('pie')
    })

    test('rejects executable or oversized chart data', () => {
        expect(normalizeChartSpec({ kind: 'line', data: [{ month: 'Jan', value: { code: 'alert(1)' } }] })).toBeNull()
        expect(
            normalizeChartSpec({
                kind: 'bar',
                data: Array.from({ length: 501 }, (_, index) => ({ label: String(index), value: index })),
            })
        ).toBeNull()
    })

    test('maps shadcn-style imports to the controlled sandbox UI registry', () => {
        const source = [
            'import { Card } from "@/components/ui/card"',
            'import { Button } from "@wim/ui"',
            'import { cn } from "@/lib/utils"',
        ].join('\n')
        const normalized = normalizeSandboxReactSource(source)

        expect(normalized).not.toContain('@/components/ui')
        expect(normalized).not.toContain('@wim/ui')
        expect(normalized).toContain("from './wim-ui'")
        expect(WIM_UI_SOURCE).toContain('export function Card')
        expect(WIM_UI_SOURCE).toContain('export function TabsContent')
    })

    test('renders a stored chart artifact in the workspace canvas', async ({ page }) => {
        const chartSpec = {
            kind: 'bar',
            xKey: 'month',
            series: [{ key: 'revenue', label: 'Revenue' }],
            data: [
                { month: 'Jan', revenue: 120 },
                { month: 'Feb', revenue: 180 },
            ],
        }
        const chat = {
            id: 'chart-test-chat',
            title: 'Chart test',
            modelId: 'nietzsche',
            starred: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            thinkingBudget: 'balanced',
            webSearchEnabled: false,
            messages: [
                {
                    id: 'chart-test-message',
                    role: 'assistant',
                    content: 'Grafik hazır.',
                    timestamp: '12:00',
                    isTypingDone: true,
                    artifacts: [
                        {
                            id: 'chart-test-artifact',
                            title: 'Revenue',
                            type: 'chart',
                            language: 'json',
                            content: JSON.stringify(chartSpec),
                            chartSpec,
                            version: 1,
                            createdAt: new Date().toISOString(),
                        },
                    ],
                },
            ],
        }

        await page.addInitScript((storedChat) => {
            window.localStorage.setItem('claude_workspace_chats_v7', JSON.stringify([storedChat]))
            window.localStorage.setItem(
                'claude_workspace_settings',
                JSON.stringify({ typewriterSpeed: 'off', defaultThinkingBudget: 'balanced', defaultModel: 'nietzsche', autoOpenArtifacts: true, soundEffects: false })
            )
        }, chat)
        await page.goto('/workspace-chat')

        await expect(page.getByTestId('chart-artifact-preview')).toBeVisible()
    })
})
