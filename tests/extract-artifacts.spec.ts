import { test, expect } from '@playwright/test'
import {
    dedupeArtifacts,
    extractArtifactsFromContent,
    isPromptLikeTitle,
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
})
