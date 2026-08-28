import { isDiagramRequest } from '../mermaid-patterns'

export const CHART_KINDS = ['line', 'bar', 'pie', 'doughnut', 'scatter'] as const

export type ChartKind = (typeof CHART_KINDS)[number]
export type ChartCell = string | number | null

export interface ChartSeries {
    key: string
    label?: string
    color?: string
}

export interface ChartSpec {
    kind: ChartKind
    data: Array<Record<string, ChartCell>>
    xKey?: string
    series: ChartSeries[]
    title?: string
    yLabel?: string
}

export interface ExtractedChartArtifact {
    title: string
    description: string
    content: string
    chartSpec: ChartSpec
}

const MAX_DATA_POINTS = 500
const MAX_SERIES = 8
const MAX_CELL_LENGTH = 500
const MAX_TITLE_LENGTH = 120
const CHART_REQUEST_PATTERN =
    /(grafik|grafiği|grafiğini|\bcharts?\b|\bplot\b|visuali[sz]ation|\btrend\b|bar chart|line chart|pie chart|bar graph)/i

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function boundedString(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed ? trimmed.slice(0, maxLength) : undefined
}

function isSafeKey(value: string): boolean {
    return /^[\w .:/-]{1,64}$/.test(value)
}

function normalizeCell(value: unknown): ChartCell | undefined {
    if (value === null) return null
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
    if (typeof value === 'string') return value.slice(0, MAX_CELL_LENGTH)
    return undefined
}

function safeColor(value: unknown): string | undefined {
    const color = boundedString(value, 20)
    return color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : undefined
}

function firstDataKey(data: Array<Record<string, ChartCell>>): string | undefined {
    return Object.keys(data[0] || {})[0]
}

function inferXKey(data: Array<Record<string, ChartCell>>, requested?: string): string | undefined {
    if (requested && data.some((row) => Object.prototype.hasOwnProperty.call(row, requested))) return requested

    const keys = Object.keys(data[0] || {})
    const nonNumericKey = keys.find((key) =>
        data.some((row) => {
            const value = row[key]
            return typeof value === 'string' || value === null
        })
    )
    return nonNumericKey || firstDataKey(data)
}

function inferSeries(data: Array<Record<string, ChartCell>>, xKey: string | undefined): ChartSeries[] {
    const keys = Object.keys(data[0] || {})
    return keys
        .filter((key) => key !== xKey)
        .filter((key) => data.some((row) => typeof row[key] === 'number' || (typeof row[key] === 'string' && row[key] !== '')))
        .slice(0, MAX_SERIES)
        .map((key) => ({ key, label: key }))
}

/**
 * Converts untrusted model JSON into the small declarative chart language that
 * the browser renderer understands. No code, URLs, or arbitrary options pass
 * through this boundary.
 */
export function normalizeChartSpec(value: unknown): ChartSpec | null {
    if (!isRecord(value)) return null

    const rawKind = typeof value.kind === 'string' ? value.kind.toLowerCase() : ''
    if (!CHART_KINDS.includes(rawKind as ChartKind)) return null

    const rawData = Array.isArray(value.data) ? value.data : []
    if (rawData.length === 0 || rawData.length > MAX_DATA_POINTS) return null

    const data: Array<Record<string, ChartCell>> = []
    for (const rawRow of rawData) {
        if (!isRecord(rawRow)) return null
        const row: Record<string, ChartCell> = {}
        for (const [key, rawCell] of Object.entries(rawRow)) {
            if (!isSafeKey(key)) continue
            const cell = normalizeCell(rawCell)
            if (cell !== undefined) row[key] = cell
        }
        if (Object.keys(row).length > 0) data.push(row)
    }

    if (data.length === 0) return null

    const requestedXKey = boundedString(value.xKey, 64)
    const xKey = inferXKey(data, requestedXKey)
    const rawSeries = Array.isArray(value.series) ? value.series : []
    const series: ChartSeries[] = []
    for (const rawSeriesItem of rawSeries) {
        if (!isRecord(rawSeriesItem)) continue
        const key = boundedString(rawSeriesItem.key, 64)
        if (
            !key ||
            !isSafeKey(key) ||
            !data.some((row) => Object.prototype.hasOwnProperty.call(row, key)) ||
            series.some((item) => item.key === key)
        ) {
            continue
        }
        series.push({
            key,
            label: boundedString(rawSeriesItem.label, 80),
            color: safeColor(rawSeriesItem.color),
        })
        if (series.length >= MAX_SERIES) break
    }

    const normalizedSeries = series.length > 0 ? series : inferSeries(data, xKey)
    if (normalizedSeries.length === 0) return null

    return {
        kind: rawKind as ChartKind,
        data,
        xKey,
        series: normalizedSeries,
        title: boundedString(value.title, MAX_TITLE_LENGTH),
        yLabel: boundedString(value.yLabel, 80),
    }
}

export function parseChartSpec(content: string): ChartSpec | null {
    const normalized = content
        .trim()
        .replace(/^```(?:json|chart|chartjson)?\s*/i, '')
        .replace(/\s*```$/i, '')

    try {
        const parsed = JSON.parse(normalized) as unknown
        if (isRecord(parsed) && isRecord(parsed.spec)) return normalizeChartSpec(parsed.spec)
        return normalizeChartSpec(parsed)
    } catch {
        return null
    }
}

export function isChartRequest(prompt: string): boolean {
    const text = String(prompt || '')
    if (!text) return false
    if (isDiagramRequest(text)) return false
    return CHART_REQUEST_PATTERN.test(text)
}

function attributeValue(attributes: string, name: string): string | undefined {
    const match = attributes.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))
    return match?.[1]?.trim()
}

const CHART_ARTIFACT_PATTERN = /<(?:wimArtifact|antArtifact|artifact)\s+([^>]*?)>([\s\S]*?)<\/(?:wimArtifact|antArtifact|artifact)>/gi
const CHART_CODE_BLOCK_PATTERN = /```(?:chart|chartjson|json)\s*\n([\s\S]*?)```/gi

/** Extracts only explicit chart artifacts or chart-shaped JSON requested by the user. */
export function extractChartArtifacts(content: string, userPrompt: string): ExtractedChartArtifact[] {
    if (!content.trim()) return []

    const artifacts: ExtractedChartArtifact[] = []
    let match: RegExpExecArray | null

    while ((match = CHART_ARTIFACT_PATTERN.exec(content)) !== null) {
        const attributes = match[1]
        const rawType = attributeValue(attributes, 'type')?.toLowerCase()
        if (rawType !== 'chart' && rawType !== 'visualization') continue

        const chartSpec = parseChartSpec(match[2])
        if (!chartSpec) continue

        artifacts.push({
            title: attributeValue(attributes, 'title') || chartSpec.title || 'Generated chart',
            description: 'Validated declarative chart artifact',
            content: JSON.stringify(chartSpec),
            chartSpec,
        })
    }

    if (artifacts.length > 0 || !isChartRequest(userPrompt)) return artifacts

    while ((match = CHART_CODE_BLOCK_PATTERN.exec(content)) !== null) {
        const chartSpec = parseChartSpec(match[1])
        if (!chartSpec) continue
        artifacts.push({
            title: chartSpec.title || 'Generated chart',
            description: 'Chart JSON converted to a validated artifact',
            content: JSON.stringify(chartSpec),
            chartSpec,
        })
    }

    if (artifacts.length === 0 && content.trim().startsWith('{')) {
        const chartSpec = parseChartSpec(content)
        if (chartSpec) {
            artifacts.push({
                title: chartSpec.title || 'Generated chart',
                description: 'Chart JSON converted to a validated artifact',
                content: JSON.stringify(chartSpec),
                chartSpec,
            })
        }
    }

    return artifacts
}

/** Removes chart envelopes while preserving the assistant's visible answer. */
export function stripChartArtifactMarkup(content: string): string {
    return content
        .replace(CHART_ARTIFACT_PATTERN, (fullMatch, attributes: string) => {
            const rawType = attributeValue(attributes, 'type')?.toLowerCase()
            return rawType === 'chart' || rawType === 'visualization' ? '' : fullMatch
        })
        .replace(/<(?:wimArtifact|antArtifact|artifact)\s+([^>]*?type=["'](?:chart|visualization)["'][^>]*)>[\s\S]*$/gi, '')
        .replace(CHART_CODE_BLOCK_PATTERN, '')
        .trim()
}
