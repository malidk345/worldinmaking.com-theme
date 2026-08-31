import React from 'react'
import { PostHogFunnelStep } from './PostHogTheme'
import { LemonCard } from '../LemonUI/LemonCard'
import { LemonTag } from '../LemonUI/LemonTag'
import { LemonProgress } from '../LemonUI/LemonProgress'
import { ArrowDown, Filter } from 'lucide-react'

interface PostHogFunnelProps {
    steps: PostHogFunnelStep[]
    className?: string
    title?: string
}

export const PostHogFunnel: React.FC<PostHogFunnelProps> = ({
    steps,
    className = '',
    title = 'Conversion Funnel',
}) => {
    if (!steps || steps.length === 0) return null

    const maxCount = Math.max(...steps.map((s) => s.count)) || 1
    const overallConversion =
        steps.length > 1 ? ((steps[steps.length - 1].count / steps[0].count) * 100).toFixed(1) : '100'

    return (
        <LemonCard className={`w-full p-4 ${className}`} hoverEffect={false}>
            <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-primary/20">
                <div className="flex items-center gap-2">
                    <Filter className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-[12px] font-semibold text-primary uppercase tracking-wider">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted font-mono">Overall Conversion:</span>
                    <LemonTag type="success" size="small">
                        {overallConversion}%
                    </LemonTag>
                </div>
            </div>

            <div className="space-y-4">
                {steps.map((step, i) => {
                    const percentNum = (step.count / maxCount) * 100
                    const percent = percentNum.toFixed(1)
                    const prevCount = i > 0 ? steps[i - 1].count : step.count
                    const stepConversion = i > 0 ? ((step.count / prevCount) * 100).toFixed(1) : '100'
                    const droppedCount = i > 0 ? prevCount - step.count : 0
                    const dropOff = i > 0 ? (100 - Number(stepConversion)).toFixed(1) : null

                    return (
                        <div key={i} className="font-sans">
                            {dropOff !== null && (
                                <div className="my-1.5 ml-3 pl-3 border-l-2 border-dashed border-rose-400/40 py-1 flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/5 px-2 rounded-r-md">
                                    <div className="flex items-center gap-1.5">
                                        <ArrowDown className="size-3.5" />
                                        <span className="font-medium">Drop-off: -{dropOff}%</span>
                                    </div>
                                    <span className="font-mono text-[10.5px] text-muted">
                                        ({droppedCount.toLocaleString('en-US')} lost)
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="size-5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-[10.5px] font-bold font-mono flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                    <span className="font-semibold text-primary">
                                        {step.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-[11.5px]">
                                    <span className="text-primary font-bold">
                                        {step.count.toLocaleString('en-US')}
                                    </span>
                                    <span className="text-muted text-[11px]">({percent}%)</span>
                                </div>
                            </div>

                            <LemonProgress
                                percent={percentNum}
                                strokeColor="var(--color-primary-3000, #1d4ed8)"
                                className="w-full"
                            />
                        </div>
                    )
                })}
            </div>
        </LemonCard>
    )
}
