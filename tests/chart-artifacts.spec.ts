import { test, expect } from '@playwright/test'
import {
    extractChartArtifacts,
    normalizeChartSpec,
    parseChartSpec,
    stripChartArtifactMarkup,
} from '../src/lib/ai/chart-artifacts'
import { normalizeSandboxReactSource, WIM_UI_SOURCE } from '../src/components/ClaudeWorkspaceChat/sandbox/wimUiSource'
import { parse } from '@babel/parser'
import {
    closeTruncatedJsx,
    hoistJsxEmbeddedStatements,
    iframeUiSource,
    jsxSourceLooksBroken,
    liftDataDeclarations,
    needsRecharts,
    preparePreviewSource,
    prepareSandpackSource,
    repairJsxAttributeStrings,
    repairUnclosedJsxOpeningTags,
    repairUnterminatedJsStrings,
    rewritePreviewImports,
} from '../src/components/ClaudeWorkspaceChat/sandbox/reactPreview'

function assertPreviewParses(code: string) {
    parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        allowReturnOutsideFunction: true,
    })
}

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
        expect(WIM_UI_SOURCE).toContain('export function Dialog')
        expect(WIM_UI_SOURCE).toContain('export function Avatar')
        expect(WIM_UI_SOURCE).toContain('bg-primary')
    })

    test('adds a default export so Sandpack can mount a named screen', () => {
        const normalized = normalizeSandboxReactSource(
            'function BillingDashboard() {\n  return <div className="p-4">Billing</div>\n}'
        )
        expect(normalized).toContain('function BillingDashboard')
        expect(normalized).toContain('export default BillingDashboard')
    })

    test('prepares Sandpack files without stripping the default export', () => {
        const prepared = prepareSandpackSource(
            [
                "import { Card } from '@wim/ui'",
                'export default function Preview() {',
                '  return (',
                '    <div>',
                '      // "Pseudo-individuation" here is a metric of failure, not success.',
                '      const dataConformity = [',
                "        { time: '00:00', standardization: 82, pseudoIndividuation: 45, passivity: 90 },",
                '      ]',
                '      <Card>{dataConformity[0].time}</Card>',
                '    </div>',
                '  )',
                '}',
            ].join('\n')
        )
        expect(prepared).toContain("from './wim-ui'")
        expect(prepared).toContain('export default function Preview')
        expect(prepared.indexOf('const dataConformity')).toBeLessThan(prepared.indexOf('return'))
        assertPreviewParses(prepared)
    })

    test('folds multiline className strings so Sandpack does not see unterminated quotes', () => {
        const source = [
            'export default function Orders() {',
            '  return (',
            '    <table>',
            '      <tbody>',
            '        {recentOrders.map((order) => (',
            '          <tr key={order.id} className="',
            '            border-b hover:bg-slate-50',
            '          ">',
            '            <td>{order.id}</td>',
            '          </tr>',
            '        ))}',
            '      </tbody>',
            '    </table>',
            '  )',
            '}',
        ].join('\n')

        const repaired = repairJsxAttributeStrings(source)
        expect(repaired).toContain('className="border-b hover:bg-slate-50"')
        expect(repaired).not.toMatch(/className="\s*\n/)
        assertPreviewParses(repaired)

        const prepared = prepareSandpackSource(source)
        expect(prepared).toContain('className="border-b hover:bg-primary"')
        assertPreviewParses(prepared)
    })

    test('closes a className string when the model drops the ending quote', () => {
        const source = [
            'export default function Orders() {',
            '  return (',
            '    <tr key={order.id} className="',
            '      border-b hover:bg-slate-50',
            '    >',
            '      <td>{order.id}</td>',
            '    </tr>',
            '  )',
            '}',
        ].join('\n')

        const repaired = repairJsxAttributeStrings(source)
        expect(repaired).toContain('className="border-b hover:bg-slate-50"')
        expect(repaired).toContain('>')
        assertPreviewParses(repaired)
    })

    test('does not collapse className to empty when the next line is a JSX expression', () => {
        const source = [
            'export default function Orders() {',
            '  return (',
            '    <tbody>',
            '      {recentOrders.map((order) => (',
            '        <tr key={order.id} className="',
            "          border-b hover:bg-slate-50 {order.urgent ? 'bg-red-50' : ''}",
            '        ">',
            '          <td>{order.id}</td>',
            '        </tr>',
            '      ))}',
            '    </tbody>',
            '  )',
            '}',
        ].join('\n')

        const repaired = repairJsxAttributeStrings(source)
        expect(repaired).not.toContain('className=""')
        expect(repaired).toContain('border-b hover:bg-slate-50')
        expect(repaired).toContain('order.urgent')
        assertPreviewParses(repaired)
    })

    test('closes a JSX opening tag left dangling after className=""', () => {
        const source = [
            'export default function Orders() {',
            '  const recentOrders = [{ id: "A-1", product: "Desk" }]',
            '  return (',
            '    <table>',
            '      <tbody>',
            '        {recentOrders.map((order) => (',
            '          <tr key={order.id} className=""',
            '            <td>{order.id}</td>',
            '          </tr>',
            '        ))}',
            '      </tbody>',
            '    </table>',
            '  )',
            '}',
        ].join('\n')

        const repaired = repairUnclosedJsxOpeningTags(source)
        expect(repaired).toContain('<tr key={order.id} className="">')
        expect(repaired).not.toMatch(/className=""\s*\n\s*<td>/)
        assertPreviewParses(repaired)

        const prepared = prepareSandpackSource(source)
        expect(prepared).toContain('<tr key={order.id} className="">')
        expect(jsxSourceLooksBroken(prepared)).toBe(false)
        assertPreviewParses(prepared)
    })

    test('closes className="" when the model also drops the tag closer before </tr>', () => {
        const source = [
            'export default function Orders() {',
            '  const recentOrders = [{ id: "A-1" }]',
            '  return (',
            '    <tr key={order.id} className="',
            '    "',
            '      <td>{order.id}</td>',
            '    </tr>',
            '  )',
            '}',
        ].join('\n')

        const prepared = prepareSandpackSource(source)
        expect(prepared).toMatch(/<tr key=\{order\.id\} className="">/)
        expect(prepared).toContain('<td>{order.id}</td>')
        expect(jsxSourceLooksBroken(prepared)).toBe(false)
        assertPreviewParses(prepared)
    })

    test('does not close a multi-line tag before later attributes', () => {
        const source = [
            'export default function Card() {',
            '  return (',
            '    <button',
            '      type="button"',
            '      className="px-3 py-2"',
            '      disabled',
            '    >',
            '      Save',
            '    </button>',
            '  )',
            '}',
        ].join('\n')

        const repaired = repairUnclosedJsxOpeningTags(source)
        expect(repaired).toBe(source)
        assertPreviewParses(repaired)
    })

    test('finishes a dashboard that was cut off at <tr className="', () => {
        const source = [
            "import { Card, Button, Table, Alert, Progress } from '@wim/ui'",
            "import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'",
            'const recentOrders = [',
            "  { id: 'ORD001', müşteri: 'Ayşe Yılmaz', durum: 'Hazırlanıyor', toplam: '₺120.00' },",
            "  { id: 'ORD002', müşteri: 'Mehmet Demir', durum: 'Gönderildi', toplam: '₺245.50' },",
            ']',
            'export default function SimpleDashboard() {',
            '  return (',
            '    <div className="p-6 bg-gray-50 min-h-screen">',
            '      <Card className="p-6 shadow-sm mt-6">',
            '        <h3 className="text-lg font-semibold mb-4">Son Siparişler</h3>',
            '        <Table>',
            '          <thead>',
            '            <tr>',
            '              <th className="text-left py-2">Sipariş ID</th>',
            '            </tr>',
            '          </thead>',
            '          <tbody>',
            '            {recentOrders.map((order) => (',
            '              <tr key={order.id} className="',
        ].join('\n')

        const prepared = prepareSandpackSource(source)
        expect(prepared).toContain('<tr key={order.id} className="">')
        expect(prepared).toContain('{order.id}')
        expect(prepared).toContain('{order.müşteri}')
        expect(prepared).toContain('</tr>')
        expect(prepared).toContain('</tbody>')
        expect(prepared).toContain('</Table>')
        expect(prepared).toMatch(/\)\)\}/)
        expect(jsxSourceLooksBroken(prepared)).toBe(false)
        assertPreviewParses(prepared)
        expect(closeTruncatedJsx(prepared)).toBe(prepared)
    })

    test('closes an unterminated color string inside a JSX expression', () => {
        const source = [
            'export default function NetworkMap() {',
            '  const [selected, setSelected] = React.useState(null)',
            '  const c = { id: "n1" }',
            '  const cx = 40',
            '  const cy = 40',
            '  const isSelected = selected === c.id',
            '  return (',
            '    <svg>',
            '      <g key={c.id} transform={`translate(${cx},${cy})`} onClick={() => setSelected(isSelected ? null : c.id)} style={{ cursor: \'pointer\' }}>',
            "        <circle r={isSelected ? 32 : 26} fill={isSelected ? '#1e3a5f",
            '',
            '>',
            '</circle>',
            '      </g>',
            '    </svg>',
            '  )',
            '}',
        ].join('\n')

        const repaired = repairUnterminatedJsStrings(source)
        expect(repaired).toContain("fill={isSelected ? '#1e3a5f' : '#94a3b8'}")
        expect(repaired).not.toMatch(/'#1e3a5f\s*$/m)

        const prepared = prepareSandpackSource(source)
        expect(prepared).toContain('#1e3a5f')
        expect(prepared).toContain('</circle>')
        assertPreviewParses(prepared)
    })

    test('refuses to treat still-invalid JSX as Sandpack-ready', () => {
        const broken = 'export default function Broken() {\n  return (\n    <div className="\n'
        expect(() => assertPreviewParses(broken)).toThrow()
        const prepared = prepareSandpackSource(broken)
        assertPreviewParses(prepared)
    })

    test('rewrites sandbox imports so the preview iframe does not need crypto.subtle', () => {
        const rewritten = rewritePreviewImports(
            [
                "import { Card, Button } from '@wim/ui'",
                "import { Activity } from 'lucide-react'",
                "import { LineChart } from 'recharts'",
            ].join('\n')
        )
        expect(rewritten).toContain('const { Card, Button } = WimUI')
        expect(rewritten).toContain('const { Activity } = LucideReact')
        expect(rewritten).toContain('const { LineChart } = Recharts')
        expect(rewritten).not.toContain('from ')

        const prepared = preparePreviewSource(
            'function OpsBoard() {\n  return <div className="p-4">Ops</div>\n}'
        )
        expect(prepared.rootName).toBe('OpsBoard')
        expect(prepared.code).toContain('function OpsBoard')
        expect(prepared.code).not.toContain('export default')
        expect(iframeUiSource()).toContain('const WimUI =')
        expect(iframeUiSource()).toContain('JSX.Element')
        expect(needsRecharts('import { LineChart } from "recharts"')).toBe(true)
        expect(needsRecharts('function Screen(){ return <div /> }')).toBe(false)
    })

    test('hoists const data objects that the model dropped inside JSX return', () => {
        const source = [
            'export default function Preview() {',
            '  return (',
            '    <div className="min-h-screen">',
            '      <h1>Culture Industry</h1>',
            '      // "Pseudo-individuation" here is a metric of failure, not success.',
            '      const dataConformity = [',
            "        { time: '00:00', standardization: 82, pseudoIndividuation: 45, passivity: 90 },",
            "        { time: '04:00', standardization: 75, pseudoIndividuation: 38, passivity: 85 },",
            '      ]',
            '      <p>hello</p>',
            '    </div>',
            '  )',
            '}',
        ].join('\n')

        const hoisted = hoistJsxEmbeddedStatements(source)
        expect(hoisted).toContain('const dataConformity = [')
        expect(hoisted).toContain("Pseudo-individuation")
        expect(hoisted.indexOf('const dataConformity')).toBeLessThan(hoisted.indexOf('return ('))
        expect(hoisted).toMatch(/return \(\s*<div/)
        assertPreviewParses(hoisted)

        const prepared = preparePreviewSource(
            [
                '<antArtifact type="react" title="Culture Industry Monitor">',
                source,
                '</antArtifact>',
            ].join('\n')
        )
        expect(prepared.rootName).toBe('Preview')
        expect(prepared.code).not.toContain('<antArtifact')
        expect(prepared.code.indexOf('const dataConformity')).toBeLessThan(prepared.code.indexOf('return ('))
        assertPreviewParses(prepared.code)
    })

    test('hoists const data out of an arrow-function JSX body', () => {
        const source = [
            "import { Card } from '@wim/ui'",
            "import { LineChart, Line } from 'recharts'",
            'const Preview = () => (',
            '  <div className="min-h-screen">',
            '    // "Pseudo-individuation" here is a metric of failure, not success.',
            '    const dataConformity = [',
            "      { time: '00:00', standardization: 82, pseudoIndividuation: 45, passivity: 90 },",
            '    ]',
            '    <Card><LineChart data={dataConformity}><Line dataKey="standardization" /></LineChart></Card>',
            '  </div>',
            ')',
        ].join('\n')

        const prepared = preparePreviewSource(source)
        expect(prepared.rootName).toBe('Preview')
        expect(prepared.code.indexOf('const dataConformity')).toBeLessThan(prepared.code.indexOf('=> ('))
        expect(prepared.code).toMatch(/return \(\s*<div|=> \(\s*<div/)
        assertPreviewParses(prepared.code)
    })

    test('hoists const data from a bare return <div> and hook destructure', () => {
        const source = [
            "import React, { useState } from 'react'",
            'export default function Preview() {',
            '  return <div className="p-4">',
            '      const [open, setOpen] = useState(false)',
            '      const rows = [{ time: "00:00", value: 1 }]',
            '      <button onClick={() => setOpen(!open)}>{rows[0].time}</button>',
            '    </div>',
            '}',
        ].join('\n')

        const rewritten = rewritePreviewImports("import React, { useState, useMemo } from 'react'")
        expect(rewritten).toContain('const { useState, useMemo } = React')
        expect(rewritten).not.toMatch(/const React = React/)

        const prepared = preparePreviewSource(source)
        expect(prepared.code.indexOf('const rows')).toBeLessThan(prepared.code.indexOf('return <'))
        expect(prepared.code.indexOf('const [open, setOpen]')).toBeLessThan(prepared.code.indexOf('return <'))
        expect(prepared.code).toContain('const { useState } = React')
        assertPreviewParses(prepared.code)
    })

    test('lifts data arrays even when JSX braces are unbalanced', () => {
        const source = [
            'export default function Preview() {',
            '  return (',
            '    <div className={cn("min-h-screen")',
            '    >',
            '      // "Pseudo-individuation" here is a metric of failure, not success.',
            '      const dataConformity = [',
            "        { time: '00:00', standardization: 82, pseudoIndividuation: 45, passivity: 90 },",
            "        { time: '04:00', standardization: 75, pseudoIndividuation: 38, passivity: 85 },",
            '      ]',
            '      <p>{dataConformity[0].time}</p>',
            '    </div>',
            '  )',
            '}',
        ].join('\n')

        const lifted = liftDataDeclarations(source)
        expect(lifted.indexOf('const dataConformity')).toBeLessThan(lifted.indexOf('function Preview'))
        expect(lifted).toContain("Pseudo-individuation")

        const prepared = preparePreviewSource(source)
        expect(prepared.code.indexOf('const dataConformity')).toBeLessThan(prepared.code.indexOf('function Preview'))
        expect(prepared.code).not.toMatch(/return \([\s\S]*const dataConformity/)
    })

    test('lifts data arrays out of a raw JSX root with no function wrapper', () => {
        const source = [
            '<div className="min-h-screen">',
            '  <h1>Culture Industry Monitor</h1>',
            '  // "Pseudo-individuation" here is a metric of failure, not success.',
            '  const dataConformity = [',
            "    { time: '00:00', standardization: 82, pseudoIndividuation: 45, passivity: 90 },",
            '  ]',
            '  <p>{dataConformity[0].time}</p>',
            '</div>',
        ].join('\n')

        const prepared = preparePreviewSource(source)
        expect(prepared.code.indexOf('const dataConformity')).toBeLessThan(prepared.code.indexOf('return'))
        assertPreviewParses(prepared.code)
    })

    test('does not hoist const declarations inside a JSX callback', () => {
        const source = [
            'function OpsBoard() {',
            '  return (',
            '    <div>',
            '      {items.map((item) => {',
            '        const label = item.name',
            '        return <span>{label}</span>',
            '      })}',
            '    </div>',
            '  )',
            '}',
        ].join('\n')

        const hoisted = hoistJsxEmbeddedStatements(source)
        expect(hoisted).toBe(source)
        expect(hoisted.indexOf('const label')).toBeGreaterThan(hoisted.indexOf('return ('))
    })

    test.skip('renders a stored chart artifact in the workspace canvas', async ({ page }) => {
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
