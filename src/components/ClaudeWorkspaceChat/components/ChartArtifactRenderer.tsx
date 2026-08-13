import React from 'react'
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
    Title,
    Tooltip,
} from 'chart.js'
import type { ChartSpec } from 'lib/ai/chart-artifacts'

ChartJS.register(
    ArcElement,
    BarElement,
    CategoryScale,
    Filler,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Title,
    Tooltip
)

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#4f46e5']

interface ChartArtifactRendererProps {
    spec: ChartSpec
}

function numericValue(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.replace(/,/g, ''))
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function chartOptions(spec: ChartSpec, showLegend: boolean): Record<string, unknown> {
    const isCircular = spec.kind === 'pie' || spec.kind === 'doughnut'
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
            legend: { display: showLegend, position: 'bottom' },
            title: { display: Boolean(spec.title), text: spec.title },
        },
        scales: isCircular
            ? undefined
            : {
                  x: { grid: { color: 'rgba(120, 120, 120, 0.12)' } },
                  y: {
                      beginAtZero: true,
                      title: spec.yLabel ? { display: true, text: spec.yLabel } : undefined,
                      grid: { color: 'rgba(120, 120, 120, 0.12)' },
                  },
              },
    }
}

export function ChartArtifactRenderer({ spec }: ChartArtifactRendererProps): JSX.Element {
    const labels = spec.data.map((row, index) => String(row[spec.xKey || ''] ?? index + 1))
    const series = spec.series.length > 0 ? spec.series : [{ key: 'value', label: 'Value' }]
    const isCircular = spec.kind === 'pie' || spec.kind === 'doughnut'

    if (isCircular) {
        const selectedSeries = series[0]
        const data = {
            labels,
            datasets: [
                {
                    label: selectedSeries.label || selectedSeries.key,
                    data: spec.data.map((row) => numericValue(row[selectedSeries.key])),
                    backgroundColor: spec.data.map((_, index) => COLORS[index % COLORS.length]),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                },
            ],
        }
        const Component = spec.kind === 'pie' ? Pie : Doughnut
        return (
            <div className="h-[320px] w-full" data-testid="chart-artifact-preview">
                <Component data={data} options={chartOptions(spec, true) as never} />
            </div>
        )
    }

    if (spec.kind === 'scatter') {
        const scatterData = {
            datasets: series.map((item, index) => ({
                label: item.label || item.key,
                data: spec.data
                    .map((row, rowIndex) => ({
                        x: numericValue(row[spec.xKey || '']) ?? rowIndex,
                        y: numericValue(row[item.key]),
                    }))
                    .filter((point) => point.y !== null),
                backgroundColor: item.color || COLORS[index % COLORS.length],
                borderColor: item.color || COLORS[index % COLORS.length],
            })),
        }
        return (
            <div className="h-[320px] w-full" data-testid="chart-artifact-preview">
                <Scatter data={scatterData} options={chartOptions(spec, true) as never} />
            </div>
        )
    }

    const data = {
        labels,
        datasets: series.map((item, index) => ({
            label: item.label || item.key,
            data: spec.data.map((row) => numericValue(row[item.key])),
            borderColor: item.color || COLORS[index % COLORS.length],
            backgroundColor: item.color || COLORS[index % COLORS.length],
            borderWidth: 2,
            tension: spec.kind === 'line' ? 0.25 : 0,
            fill: false,
        })),
    }

    const Component = spec.kind === 'bar' ? Bar : Line
    return (
        <div className="h-[320px] w-full" data-testid="chart-artifact-preview">
            <Component data={data} options={chartOptions(spec, series.length > 1) as never} />
        </div>
    )
}
