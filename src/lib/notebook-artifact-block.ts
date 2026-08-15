import { parseChartSpec, type ChartSpec } from './ai/chart-artifacts'
import type { Artifact, Message } from '../components/ClaudeWorkspaceChat/types'

function fence(language: string, body: string): string {
    const text = String(body || '').replace(/\r\n/g, '\n').trim()
    let ticks = '```'
    while (text.includes(ticks)) ticks += '`'
    return `${ticks}${language}\n${text}\n${ticks}`
}

function heading(title: string): string {
    const clean = title.replace(/^#+\s*/, '').trim()
    return clean ? `### ${clean}` : ''
}

function jsonToMarkdownTable(raw: string): string | null {
    try {
        const parsed = JSON.parse(raw) as unknown
        const rows = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? [parsed] : null
        if (!rows?.length || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) return null
        const keys = Array.from(
            new Set(rows.flatMap((row) => Object.keys(row as Record<string, unknown>)))
        ).slice(0, 12)
        if (keys.length === 0) return null
        const cell = (value: unknown) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
        const header = `| ${keys.join(' | ')} |`
        const sep = `| ${keys.map(() => '---').join(' | ')} |`
        const body = rows
            .slice(0, 80)
            .map((row) => `| ${keys.map((key) => cell((row as Record<string, unknown>)[key])).join(' | ')} |`)
            .join('\n')
        return `${header}\n${sep}\n${body}`
    } catch {
        return null
    }
}

function asMarkdownTable(content: string): string {
    const text = String(content || '').trim()
    if (/^\s*\|.+\|/.test(text) && text.includes('\n')) return text
    return jsonToMarkdownTable(text) || text
}

/** Turn a chat artifact into notebook markdown: table, chart, mermaid, or live preview — not a source dump. */
export function artifactToNotebookMarkdown(artifact: Artifact): string {
    const title = heading(artifact.title || '')
    const body = String(artifact.content || '').trim()

    if (artifact.type === 'table') {
        return [title, asMarkdownTable(body)].filter(Boolean).join('\n\n')
    }
    if (artifact.type === 'chart') {
        const spec = artifact.chartSpec || parseChartSpec(body)
        const json = spec ? JSON.stringify(spec, null, 2) : body
        return [title, fence('chart', json)].filter(Boolean).join('\n\n')
    }
    if (artifact.type === 'mermaid') {
        return [title, fence('mermaid', body)].filter(Boolean).join('\n\n')
    }
    if (artifact.type === 'react') {
        return [title, fence('react', body)].filter(Boolean).join('\n\n')
    }
    if (artifact.type === 'html') {
        return [title, fence('wim-html', body)].filter(Boolean).join('\n\n')
    }
    if (artifact.type === 'svg') {
        return body.startsWith('<svg') ? [title, body].filter(Boolean).join('\n\n') : [title, fence('svg', body)].filter(Boolean).join('\n\n')
    }
    if (artifact.type === 'json') {
        const asChart = parseChartSpec(body)
        if (asChart) return [title, fence('chart', JSON.stringify(asChart, null, 2))].filter(Boolean).join('\n\n')
        const table = jsonToMarkdownTable(body)
        if (table) return [title, table].filter(Boolean).join('\n\n')
        return [title, fence('json', body)].filter(Boolean).join('\n\n')
    }
    return [title, body].filter(Boolean).join('\n\n')
}

export function messageToNotebookMarkdown(message: Pick<Message, 'content' | 'artifacts'>): string {
    const blocks = (message.artifacts || []).map(artifactToNotebookMarkdown).filter(Boolean)
    const prose = String(message.content || '').trim()
    const skipProse =
        !prose ||
        /^Opened \*\*".+"\*\* in the preview workspace\.$/i.test(prose) ||
        /^Created \*\*".+"\*\*/i.test(prose)
    if (blocks.length === 0) return prose
    if (skipProse) return blocks.join('\n\n')
    return `${prose}\n\n${blocks.join('\n\n')}`
}

export function isNotebookChartFence(language?: string): boolean {
    return /^(chart|chartjson)$/i.test(language || '')
}

export function isNotebookReactFence(language?: string): boolean {
    return /^(react|tsx|jsx|wim-ui)$/i.test(language || '')
}

export function isNotebookHtmlFence(language?: string): boolean {
    return /^(wim-html)$/i.test(language || '')
}

export function chartSpecFromFence(text: string): ChartSpec | null {
    return parseChartSpec(text)
}
