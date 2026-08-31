import React from 'react'
import { MetricItem } from './PostHogTheme'
import { LemonCard } from '../LemonUI/LemonCard'
import { LemonTag } from '../LemonUI/LemonTag'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface LemonBigNumbersProps {
    metrics: MetricItem[]
    className?: string
}

export const LemonBigNumbers: React.FC<LemonBigNumbersProps> = ({ metrics, className = '' }) => {
    if (!metrics || metrics.length === 0) return null

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 ${className}`}>
            {metrics.map((metric, idx) => {
                const isUp = metric.trend === 'up' || (metric.change && metric.change.startsWith('+'))
                const isDown = metric.trend === 'down' || (metric.change && metric.change.startsWith('-'))
                const isPositive = metric.positive !== undefined ? metric.positive : isUp

                const tagType = isUp ? (isPositive ? 'success' : 'danger') : isDown ? (isPositive ? 'danger' : 'success') : 'default'

                return (
                    <LemonCard
                        key={idx}
                        hoverEffect
                        className="p-4 flex flex-col justify-between transition-all duration-200"
                    >
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[12px] font-semibold text-muted tracking-tight truncate">
                                {metric.label}
                            </span>
                            {metric.change && (
                                <LemonTag
                                    type={tagType}
                                    size="small"
                                    icon={
                                        isUp ? (
                                            <TrendingUp className="size-3" />
                                        ) : isDown ? (
                                            <TrendingDown className="size-3" />
                                        ) : (
                                            <Minus className="size-3" />
                                        )
                                    }
                                >
                                    {metric.change}
                                </LemonTag>
                            )}
                        </div>

                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-primary font-mono">
                                {metric.value}
                            </span>
                        </div>

                        {metric.description && (
                            <p className="text-[11px] text-muted mt-2 border-t border-primary/10 pt-2 line-clamp-1">
                                {metric.description}
                            </p>
                        )}
                    </LemonCard>
                )
            })}
        </div>
    )
}