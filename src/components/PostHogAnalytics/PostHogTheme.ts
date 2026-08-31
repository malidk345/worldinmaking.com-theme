export const POSTHOG_COLORS: string[] = [
    '#1d4ed8', // PostHog Blue
    '#f97316', // PostHog Orange
    '#10b981', // Emerald Green
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#0284c7', // Sky Blue
    '#eab308', // Amber Yellow
    '#64748b', // Slate Gray
]

export interface PostHogMetricItem {
    label: string
    value: string | number
    change?: string
    trend?: 'up' | 'down' | 'neutral'
    positive?: boolean // if down is actually good (e.g. churn)
    sparkline?: number[]
}

export interface PostHogSeriesData {
    [key: string]: string | number | undefined
}

export interface PostHogGraphSpec {
    type: 'line' | 'area' | 'bar' | 'pie' | 'donut'
    xAxisKey: string
    seriesKeys?: string[]
    data: PostHogSeriesData[]
    stacked?: boolean
    height?: number
}

export interface PostHogTableSpec {
    columns: string[]
    rows: (string | number | { badge: string; variant?: 'blue' | 'green' | 'red' | 'amber' | 'purple' })[][]
    title?: string
}

export interface PostHogFunnelStep {
    name: string
    count: number
    conversionRate?: string
    dropOffRate?: string
}

export interface PostHogAnalyticsSpec {
    title?: string
    description?: string
    metrics?: PostHogMetricItem[]
    graph?: PostHogGraphSpec
    table?: PostHogTableSpec
    funnel?: PostHogFunnelStep[]
}