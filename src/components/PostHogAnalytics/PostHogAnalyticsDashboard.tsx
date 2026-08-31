import React, { useState } from 'react'
import { PostHogAnalyticsSpec } from './PostHogTheme'
import { LemonBigNumbers } from './LemonBigNumbers'
import { LemonGraph } from './LemonGraph'
import { LemonTable } from './LemonTable'
import { PostHogFunnel } from './PostHogFunnel'
import { LemonCard } from '../LemonUI/LemonCard'
import { LemonTag } from '../LemonUI/LemonTag'
import { LemonSegmentedButton } from '../LemonUI/LemonSegmentedButton'
import { Activity, BarChart2, Filter, Table, PieChart } from 'lucide-react'

interface PostHogAnalyticsDashboardProps {
    spec: PostHogAnalyticsSpec
    className?: string
    inline?: boolean
}

export const PostHogAnalyticsDashboard: React.FC<PostHogAnalyticsDashboardProps> = ({
    spec,
    className = '',
    inline = false,
}) => {
    const [activeTab, setActiveTab] = useState<'all' | 'graph' | 'funnel' | 'table'>('all')

    if (!spec) return null

    const hasGraph = Boolean(spec.graph && spec.graph.data && spec.graph.data.length > 0)
    const hasFunnel = Boolean(spec.funnel && spec.funnel.length > 0)
    const hasTable = Boolean(spec.table && spec.table.rows && spec.table.rows.length > 0)
    const hasMetrics = Boolean(spec.metrics && spec.metrics.length > 0)

    const tabOptions = [
        { value: 'all' as const, label: 'Overview', icon: <PieChart className="size-3.5" /> },
        ...(hasGraph ? [{ value: 'graph' as const, label: 'Trends', icon: <BarChart2 className="size-3.5" /> }] : []),
        ...(hasFunnel ? [{ value: 'funnel' as const, label: 'Funnel', icon: <Filter className="size-3.5" /> }] : []),
        ...(hasTable ? [{ value: 'table' as const, label: 'Table', icon: <Table className="size-3.5" /> }] : []),
    ]

    return (
        <div className={`w-full space-y-4 font-sans ${className}`}>
            {/* PostHog Lemon Insight Header */}
            {(spec.title || spec.description) && !inline && (
                <LemonCard hoverEffect={false} className="p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="size-9 rounded-lg bg-blue-600/10 border border-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                                <Activity className="size-4.5" />
                            </div>
                            <div>
                                {spec.title && (
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-[15px] font-bold text-primary tracking-tight">
                                            {spec.title}
                                        </h4>
                                        <LemonTag type="primary" size="small">
                                            PostHog Lemon UI
                                        </LemonTag>
                                    </div>
                                )}
                                {spec.description && (
                                    <p className="text-[11.5px] text-muted mt-0.5">{spec.description}</p>
                                )}
                            </div>
                        </div>

                        {tabOptions.length > 2 && (
                            <LemonSegmentedButton
                                size="small"
                                value={activeTab}
                                onChange={(val) => setActiveTab(val as any)}
                                options={tabOptions}
                            />
                        )}
                    </div>
                </LemonCard>
            )}

            {/* Metrics KPI Row */}
            {hasMetrics && (activeTab === 'all' || activeTab === 'graph') && (
                <LemonBigNumbers metrics={spec.metrics!} />
            )}

            {/* Graph Trends */}
            {hasGraph && (activeTab === 'all' || activeTab === 'graph') && (
                <LemonGraph spec={spec.graph!} />
            )}

            {/* Conversion Funnel */}
            {hasFunnel && (activeTab === 'all' || activeTab === 'funnel') && (
                <PostHogFunnel steps={spec.funnel!} />
            )}

            {/* Data Breakdown Table */}
            {hasTable && (activeTab === 'all' || activeTab === 'table') && (
                <LemonTable spec={spec.table!} />
            )}
        </div>
    )
}