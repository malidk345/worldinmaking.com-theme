import { test, expect } from '@playwright/test'
import {
    dedupeArtifacts,
    extractArtifactsFromContent,
    isPromptLikeTitle,
    stripExtractedArtifactMarkup,
} from '../src/components/ClaudeWorkspaceChat/utils/extractArtifacts'

test.describe('workspace artifact extraction', () => {
    test('a table request does not wrap the whole reply as a second document', () => {
        const prompt = 'Türkiye için 2024 ekonomik göstergeler tablosu oluştur'
        const content = [
            '<antArtifact identifier="doc-1" type="table" title="2024 Ekonomik Göstergeler">',
            '| Gösterge | Değer |',
            '| --- | --- |',
            '| Enflasyon | %44 |',
            '</antArtifact>',
            '',
            'İşte istediğin tablo.',
            '',
            '| Gösterge | Değer |',
            '| --- | --- |',
            '| Enflasyon | %44 |',
        ].join('\n')

        const artifacts = extractArtifactsFromContent(content, prompt)
        expect(artifacts).toHaveLength(1)
        expect(artifacts[0].title).toBe('2024 Ekonomik Göstergeler')
        expect(artifacts[0].content).toContain('Enflasyon')
    })

    test('drops a second artifact whose title is just the user prompt', () => {
        const prompt = 'bir karşılaştırma tablosu oluştur'
        const content = [
            '<antArtifact type="table" title="Motor Karşılaştırması">| A | B |\n| --- | --- |\n| 1 | 2 |</antArtifact>',
            `<antArtifact type="markdown" title="${prompt}">${prompt}</antArtifact>`,
        ].join('\n')

        const artifacts = extractArtifactsFromContent(content, prompt)
        expect(artifacts).toHaveLength(1)
        expect(artifacts[0].title).toBe('Motor Karşılaştırması')
        expect(isPromptLikeTitle(prompt, prompt)).toBe(true)
    })

    test('extracts one GFM table instead of turning the whole chat reply into a document', () => {
        const prompt = 'şu verilerden bir tablo yap'
        const content = [
            'Karşılaştırma aşağıda.',
            '',
            '| Ürün | Fiyat |',
            '| --- | --- |',
            '| Elma | 10 |',
            '',
            'İstersen satır eklerim.',
        ].join('\n')

        const artifacts = extractArtifactsFromContent(content, prompt)
        expect(artifacts).toHaveLength(1)
        expect(artifacts[0].type).toBe('table')
        expect(artifacts[0].content).toContain('| Elma | 10 |')
        expect(artifacts[0].content).not.toContain('İstersen satır eklerim')
    })

    test('dedupes overlapping table and full-reply markdown dumps', () => {
        const table = '| A | B |\n| --- | --- |\n| 1 | 2 |'
        const merged = dedupeArtifacts([
            { id: '1', type: 'markdown', title: 'bir tablo oluştur', content: `İşte tablo\n\n${table}` },
            { id: '2', type: 'table', title: 'Karşılaştırma', content: table },
        ])
        expect(merged).toHaveLength(1)
        expect(merged[0].type).toBe('table')
        expect(merged[0].title).toBe('Karşılaştırma')
    })

    test('a design request with a tsx fence becomes a react sandbox artifact', () => {
        const prompt = 'profesyonel bir analytics dashboard tasarla'
        const content = [
            'İşte örnek bir operasyon ekranı.',
            '',
            '```tsx',
            'export default function AnalyticsDashboard() {',
            '  return (',
            '    <div className="min-h-screen bg-slate-50 p-6">',
            '      <h1 className="text-2xl font-semibold">Revenue</h1>',
            '      <p className="text-slate-500">Sample data</p>',
            '    </div>',
            '  )',
            '}',
            '```',
        ].join('\n')

        const artifacts = extractArtifactsFromContent(content, prompt)
        expect(artifacts).toHaveLength(1)
        expect(artifacts[0].type).toBe('react')
        expect(artifacts[0].content).toContain('function AnalyticsDashboard')
    })

    test('promotes a code artifact that is actually a React screen', () => {
        const prompt = 'bir login ekranı tasarla'
        const content =
            '<antArtifact type="code" title="Login Screen">function LoginScreen() {\n  return <div className="min-h-screen p-8"><form className="space-y-3"><input className="border px-3 py-2" /></form></div>\n}</antArtifact>'

        const artifacts = extractArtifactsFromContent(content, prompt)
        expect(artifacts).toHaveLength(1)
        expect(artifacts[0].type).toBe('react')
        expect(artifacts[0].content).toContain('LoginScreen')
    })

    test('extracts a truncated antArtifact that never closed', () => {
        const prompt = 'bana basit bir arayüz yapar mısın dashboard arayüzü'
        const content = [
            'Elbette, o veri tabloları ve boş hücrelerle dolu kağıt parçasını bir kenara bırak.',
            '',
            '<antArtifact identifier="ui-1" type="react" title="Basit Operasyonel Durum Paneli">',
            '```jsx',
            'export default function SimpleDashboard() {',
            '  return (',
            '    <div className="p-6">',
            '      <h1 className="text-3xl">Gösterge Paneli</h1>',
            '      <tr key={order.id} className="',
        ].join('\n')

        const artifacts = extractArtifactsFromContent(content, prompt)
        expect(artifacts).toHaveLength(1)
        expect(artifacts[0].type).toBe('react')
        expect(artifacts[0].title).toBe('Basit Operasyonel Durum Paneli')
        expect(artifacts[0].content).toContain('function SimpleDashboard')
        expect(artifacts[0].content).not.toContain('<antArtifact')

        const visible = stripExtractedArtifactMarkup(content)
        expect(visible).toContain('Elbette, o veri tabloları')
        expect(visible).not.toContain('className=')
        expect(visible).not.toContain('SimpleDashboard')
    })

    test('a mermaid fence becomes a mermaid artifact, not a code dump', () => {
        const prompt = 'Draw a mermaid diagram of the login flow'
        const content = [
            'Here is the flow.',
            '',
            '```mermaid',
            'flowchart TD',
            '  A[Login] --> B{Valid?}',
            '  B -->|Yes| C[Home]',
            '  B -->|No| A',
            '```',
        ].join('\n')

        const artifacts = extractArtifactsFromContent(content, prompt)
        expect(artifacts).toHaveLength(1)
        expect(artifacts[0].type).toBe('mermaid')
        expect(artifacts[0].language).toBe('mermaid')
        expect(artifacts[0].content).toContain('flowchart TD')
        expect(artifacts[0].content).not.toContain('```')
        expect(stripExtractedArtifactMarkup(content)).not.toContain('flowchart TD')
    })

    test('promotes a mermaid antArtifact even when wrapped as markdown', () => {
        const prompt = 'bir akış şeması çiz'
        const content = [
            '<antArtifact identifier="diagram-1" type="markdown" title="Login Flow">',
            'flowchart TD',
            '  Start --> End',
            '</antArtifact>',
        ].join('\n')

        const artifacts = extractArtifactsFromContent(content, prompt)
        expect(artifacts).toHaveLength(1)
        expect(artifacts[0].type).toBe('mermaid')
        expect(artifacts[0].title).toBe('Login Flow')
        expect(artifacts[0].content).toContain('flowchart TD')
    })

    test('a mermaid antArtifact is not treated as a React screen', () => {
        const prompt = 'Draw a mermaid diagram of checkout'
        const content = [
            '<antArtifact identifier="diagram-1" type="mermaid" title="Checkout">',
            'sequenceDiagram',
            '  User->>API: POST /checkout',
            '  API-->>User: 200',
            '</antArtifact>',
        ].join('\n')

        const artifacts = extractArtifactsFromContent(content, prompt)
        expect(artifacts).toHaveLength(1)
        expect(artifacts[0].type).toBe('mermaid')
        expect(artifacts[0].content).toContain('sequenceDiagram')
    })
})
