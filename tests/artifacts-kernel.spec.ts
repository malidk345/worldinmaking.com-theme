import { test, expect } from '@playwright/test'
import { classifyIntent, contractForIntent, finalizeArtifactTurn, getRenderer } from '../src/lib/artifacts'
import { isUiDesignRequest } from '../src/lib/ai/design-request'
import { isChartRequest } from '../src/lib/ai/chart-artifacts'

test.describe('artifact kernel', () => {
    test('intent is exclusive: mermaid wins over UI and chart', () => {
        expect(classifyIntent('Draw a mermaid diagram of the login flow')).toBe('mermaid')
        expect(isUiDesignRequest('Draw a mermaid diagram of the login flow')).toBe(false)
        expect(isChartRequest('Draw a mermaid diagram of the login flow')).toBe(false)
        expect(classifyIntent('bir akış şeması çiz')).toBe('mermaid')
    })

    test('chart, table, document, and UI do not collapse into each other', () => {
        expect(classifyIntent('Aylık gelir grafiği oluştur')).toBe('chart')
        expect(classifyIntent('şu verilerden bir tablo yap')).toBe('table')
        expect(classifyIntent('bir dilekçe yaz')).toBe('markdown')
        expect(classifyIntent('profesyonel bir analytics dashboard tasarla')).toBe('react_ui')
        expect(classifyIntent('Sen kimsin?')).toBe('chat')
    })

    test('only the winning contract is injected', () => {
        expect(contractForIntent('mermaid')).toContain('type="mermaid"')
        expect(contractForIntent('mermaid')).not.toContain('type="react"')
        expect(contractForIntent('chart')).toContain('wimArtifact type="chart"')
        expect(contractForIntent('chart')).not.toContain('type="mermaid"')
        expect(contractForIntent('react_ui')).toContain('type="react"')
        expect(contractForIntent('chat')).toBe('')
    })

    test('finalize extracts mermaid and strips it from the bubble', () => {
        const turn = finalizeArtifactTurn(
            'Draw a mermaid diagram of checkout',
            [
                'Here is the flow.',
                '',
                '```mermaid',
                'flowchart TD',
                '  A[Cart] --> B[Pay]',
                '```',
            ].join('\n')
        )
        expect(turn.intent).toBe('mermaid')
        expect(turn.artifacts).toHaveLength(1)
        expect(turn.artifacts[0].type).toBe('mermaid')
        expect(turn.visibleText).toContain('Here is the flow')
        expect(turn.visibleText).not.toContain('flowchart TD')
        expect(getRenderer(turn.artifacts[0].type).label).toBe('diagram')
    })

    test('finalize extracts a table without wrapping the whole reply', () => {
        const turn = finalizeArtifactTurn(
            'şu verilerden bir tablo yap',
            ['Karşılaştırma aşağıda.', '', '| Ürün | Fiyat |', '| --- | --- |', '| Elma | 10 |', '', 'İstersen satır eklerim.'].join(
                '\n'
            )
        )
        expect(turn.intent).toBe('table')
        expect(turn.artifacts).toHaveLength(1)
        expect(turn.artifacts[0].type).toBe('table')
        expect(turn.artifacts[0].content).toContain('| Elma | 10 |')
        expect(turn.visibleText).toContain('Karşılaştırma aşağıda')
    })
})
