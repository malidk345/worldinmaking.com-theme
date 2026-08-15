import React, { useEffect, useState } from 'react'
import { Bar, Doughnut, Line, Pie, Scatter } from 'react-chartjs-2'
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from 'chart.js'
import type { ChartSpec } from 'lib/ai/chart-artifacts'

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip)

/** Site navy / muted series — not the default Chart.js rainbow. */
const SERIES_COLORS = [
    'rgb(29 78 216)',
    'rgb(14 165 233)',
    'rgb(5 150 105)',
    'rgb(124 58 237)',
    'rgb(217 119 6)',
    'rgb(15 118 110)',
]

interface ChartTheme {
    grid: string
    tick: string
    surface: string
}

const FALLBACK_THEME: ChartTheme = {
    grid: 'rgb(192 192 192 / 0.35)',
    tick: 'rgb(113 113 113)',
    surface: 'rgb(253 253 253)',
}

function cssRgb(variable: string, alpha?: number): string | null {
    if (typeof document === 'undefined') return null
    const raw = getComputedStyle(document.body).getPropertyValue(variable).trim()
    if (!raw) return null
    return alpha == null ? `rgb(${raw})` : `rgb(${raw} / ${alpha})`
}

function readTheme(): ChartTheme {
    return {
        grid: cssRgb('--border', 0.45) || FALLBACK_THEME.grid,
        tick: cssRgb('--text-muted') || FALLBACK_THEME.tick,
        surface: cssRgb('--bg') || FALLBACK_THEME.surface,
    }
}

function useChartTheme(): ChartTheme {
    const [theme, setTheme] = useState<ChartTheme>(FALLBACK_THEME)
    useEffect(() => {
        const apply = () => setTheme(readTheme())
        apply()
        const obs = new MutationObserver(apply)
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])
    return theme
}

function numericValue(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.replace(/,/g, ''))
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function seriesColor(item: { color?: string }, index: number): string {
    return item.color || SERIES_COLORS[index % SERIES_COLORS.length]
}

function withAlpha(color: string, alpha: number): string {
    if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
        const hex = color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    if (color.startsWith('rgb(') && !color.includes('/')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
    }
    return color
}

function chartOptions(spec: ChartSpec, showLegend: boolean, theme: ChartTheme): Record<string, unknown> {
    const isCircular = spec.kind === 'pie' || spec.kind === 'doughnut'
    const tick = { color: theme.tick, font: { size: 11 }, maxRotation: 0 }
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                display: showLegend,
                position: 'top',
                align: 'end',
                labels: { boxWidth: 8, boxHeight: 8, padding: 12, color: theme.tick, font: { size: 11 } },
            },
            title: { display: false },
            tooltip: {
                backgroundColor: theme.surface,
                titleColor: theme.tick,
                bodyColor: theme.tick,
                borderColor: theme.grid,
                borderWidth: 1,
                padding: 8,
                displayColors: true,
            },
        },
        scales: isCircular
            ? undefined
            : {
                  x: {
                      border: { display: false },
                      grid: { display: false },
                      ticks: tick,
                  },
                  y: {
                      beginAtZero: true,
                      border: { display: false },
                      title: spec.yLabel ? { display: true, text: spec.yLabel, color: theme.tick, font: { size: 11 } } : undefined,
                      grid: { color: theme.grid, drawTicks: false },
                      ticks: tick,
                  },
              },
    }
}

export function ChartArtifactRenderer({
    spec,
    chrome = true,
}: {
    spec: ChartSpec
    chrome?: boolean
}): JSX.Element {
    const theme = useChartTheme()
    const labels = spec.data.map((row, index) => String(row[spec.xKey || ''] ?? index + 1))
    const series = spec.series.length > 0 ? spec.series : [{ key: 'value', label: 'Value' }]
    const isCircular = spec.kind === 'pie' || spec.kind === 'doughnut'
    const showLegend = isCircular || series.length > 1
    const options = chartOptions(spec, showLegend, theme) as never

    let plot: JSX.Element
    if (isCircular) {
        const selectedSeries = series[0]
        const data = {
            labels,
            datasets: [
                {
                    label: selectedSeries.label || selectedSeries.key,
                    data: spec.data.map((row) => numericValue(row[selectedSeries.key])),
                    backgroundColor: spec.data.map((_, index) => SERIES_COLORS[index % SERIES_COLORS.length]),
                    borderColor: theme.surface,
                    borderWidth: 2,
                },
            ],
        }
        const Component = spec.kind === 'pie' ? Pie : Doughnut
        plot = <Component data={data} options={options} />
    } else if (spec.kind === 'scatter') {
        plot = (
            <Scatter
                data={{
                    datasets: series.map((item, index) => ({
                        label: item.label || item.key,
                        data: spec.data
                            .map((row, rowIndex) => ({
                                x: numericValue(row[spec.xKey || '']) ?? rowIndex,
                                y: numericValue(row[item.key]),
                            }))
                            .filter((point) => point.y !== null),
                        backgroundColor: seriesColor(item, index),
                        borderColor: seriesColor(item, index),
                    })),
                }}
                options={options}
            />
        )
    } else {
        const Component = spec.kind === 'bar' ? Bar : Line
        plot = (
            <Component
                data={{
                    labels,
                    datasets: series.map((item, index) => {
                        const color = seriesColor(item, index)
                        return {
                            label: item.label || item.key,
                            data: spec.data.map((row) => numericValue(row[item.key])),
                            borderColor: color,
                            backgroundColor: spec.kind === 'line' ? withAlpha(color, 0.12) : color,
                            borderWidth: spec.kind === 'line' ? 2 : 0,
                            tension: spec.kind === 'line' ? 0.2 : 0,
                            fill: spec.kind === 'line',
                            pointRadius: 0,
                            pointHoverRadius: 3,
                            pointHitRadius: 8,
                        }
                    }),
                }}
                options={options}
            />
        )
    }

    const plotBox = (
        <div className="h-[260px] w-full min-w-0" data-testid="chart-artifact-preview">
            {plot}
        </div>
    )

    if (!chrome) return plotBox

    return (
        <div className="overflow-hidden rounded-lg border border-primary bg-primary">
            {spec.title ? (
                <div className="px-3 pt-2.5 text-[13px] font-semibold text-primary">{spec.title}</div>
            ) : null}
            <div className="px-2 pb-2 pt-1">{plotBox}</div>
        </div>
    )
}
