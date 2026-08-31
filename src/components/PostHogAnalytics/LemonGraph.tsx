import React, { useState } from 'react'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { PostHogGraphSpec } from './PostHogTheme'
import { LemonCard } from '../LemonUI/LemonCard'
import { LemonButton } from '../LemonUI/LemonButton'
import { LemonTag } from '../LemonUI/LemonTag'
import { BarChart3, TrendingUp, Activity } from 'lucide-react'

interface LemonGraphProps {
    spec: PostHogGraphSpec
    className?: string
    height?: number
}

const POSTHOG_PALETTE = [
    '#1d4ed8', // Primary Blue
    '#059669', // Emerald Green
    '#d97706', // Amber
    '#7c3aed', // Purple
    '#db2777', // Pink
    '#0284c7', // Sky Blue
]

export const LemonGraph: React.FC<LemonGraphProps> = ({
    spec,
    className = '',
    height = 280,
}) => {
    const [viewType, setViewType] = useState<'area' | 'bar' | 'line'>(spec.type || 'area')

    if (!spec || !spec.data || spec.data.length === 0) return null

    const data = spec.data
    const xAxisKey = spec.xAxisKey || Object.keys(data[0])[0] || 'date'
    const seriesKeys =
        spec.seriesKeys && spec.seriesKeys.length > 0
            ? spec.seriesKeys
            : Object.keys(data[0]).filter((k) => k !== xAxisKey && typeof data[0][k] === 'number')

    const activeSeriesKeys = seriesKeys.length > 0 ? seriesKeys : [Object.keys(data[0])[1] || 'value']

    return (
        <LemonCard className={`w-full p-4 ${className}`} hoverEffect={false}>
            {/* PostHog Insight Header & View Switcher */}
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-primary/20">
                <div className="flex items-center gap-2">
                    <Activity className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-[12px] font-semibold text-primary uppercase tracking-wider">
                        {spec.title || 'Insight Trends'}
                    </span>
                    {activeSeriesKeys.map((key, i) => (
                        <LemonTag key={key} type="option" size="small">
                            <span
                                className="size-2 rounded-full inline-block mr-1.5"
                                style={{ backgroundColor: POSTHOG_PALETTE[i % POSTHOG_PALETTE.length] }}
                            />
                            {key}
                        </LemonTag>
                    ))}
                </div>

                <div className="flex items-center gap-1 bg-primary/5 p-1 rounded-md border border-primary/10">
                    <LemonButton
                        size="xsmall"
                        type={viewType === 'area' ? 'primary' : 'secondary'}
                        onClick={() => setViewType('area')}
                        icon={<TrendingUp className="size-3.5" />}
                    >
                        Area
                    </LemonButton>
                    <LemonButton
                        size="xsmall"
                        type={viewType === 'bar' ? 'primary' : 'secondary'}
                        onClick={() => setViewType('bar')}
                        icon={<BarChart3 className="size-3.5" />}
                    >
                        Bar
                    </LemonButton>
                    <LemonButton
                        size="xsmall"
                        type={viewType === 'line' ? 'primary' : 'secondary'}
                        onClick={() => setViewType('line')}
                    >
                        Line
                    </LemonButton>
                </div>
            </div>

            {/* Chart Canvas */}
            <div style={{ width: '100%', height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {viewType === 'bar' ? (
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.15)" />
                            <XAxis
                                dataKey={xAxisKey}
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-bg-surface-primary, #ffffff)',
                                    borderColor: 'var(--color-border-primary, #e5e7eb)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}
                            />
                            {activeSeriesKeys.map((key, i) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={POSTHOG_PALETTE[i % POSTHOG_PALETTE.length]}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    ) : viewType === 'line' ? (
                        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.15)" />
                            <XAxis
                                dataKey={xAxisKey}
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-bg-surface-primary, #ffffff)',
                                    borderColor: 'var(--color-border-primary, #e5e7eb)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}
                            />
                            {activeSeriesKeys.map((key, i) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={POSTHOG_PALETTE[i % POSTHOG_PALETTE.length]}
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: POSTHOG_PALETTE[i % POSTHOG_PALETTE.length] }}
                                    activeDot={{ r: 5 }}
                                />
                            ))}
                        </LineChart>
                    ) : (
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                {activeSeriesKeys.map((key, i) => (
                                    <linearGradient key={key} id={`lemonGrad_${i}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={POSTHOG_PALETTE[i % POSTHOG_PALETTE.length]} stopOpacity={0.35} />
                                        <stop offset="95%" stopColor={POSTHOG_PALETTE[i % POSTHOG_PALETTE.length]} stopOpacity={0.0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.15)" />
                            <XAxis
                                dataKey={xAxisKey}
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-bg-surface-primary, #ffffff)',
                                    borderColor: 'var(--color-border-primary, #e5e7eb)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}
                            />
                            {activeSeriesKeys.map((key, i) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={POSTHOG_PALETTE[i % POSTHOG_PALETTE.length]}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill={`url(#lemonGrad_${i})`}
                                />
                            ))}
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </LemonCard>
    )
}