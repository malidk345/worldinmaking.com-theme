import React, { useState } from 'react'
import { IconX, IconDocument, IconGraph, IconDashboard, IconNotebook, IconPlus, IconCheck } from '@posthog/icons'
import { LemonButton, LemonTag, LemonCard } from '../LemonUI'

interface ContextDrawerProps {
    isOpen: boolean
    onClose: () => void
    onSelectContext: (tag: string) => void
}

const AVAILABLE_EVENTS = [
    { id: '1', name: '$pageview', desc: 'Page view navigation telemetry', category: 'Event' },
    { id: '2', name: '$autocapture', desc: 'DOM click & form interactions', category: 'Event' },
    { id: '3', name: '$identify', desc: 'User identity & property traits', category: 'Person' },
    { id: '4', name: '$feature_flag_called', desc: 'Feature flag evaluation logs', category: 'Event' },
]

const AVAILABLE_INSIGHTS = [
    { id: 'ins-1', name: 'Weekly Active Users (WAU)', desc: 'Trends query over 30 days', category: 'Insight' },
    { id: 'ins-[2]', name: 'Signup Conversion Funnel', desc: 'Funnel step breakdown', category: 'Insight' },
]

export function ContextDrawer({ isOpen, onClose, onSelectContext }: ContextDrawerProps): JSX.Element | null {
    const [activeTab, setActiveTab] = useState<'events' | 'insights'>('events')
    const [attached, setAttached] = useState<string[]>([])

    if (!isOpen) return null

    const handleToggle = (name: string) => {
        if (attached.includes(name)) {
            setAttached(attached.filter((n) => n !== name))
        } else {
            setAttached([...attached, name])
            onSelectContext(name)
        }
    }

    return (
        <div className="absolute inset-y-0 right-0 z-50 w-80 bg-white dark:bg-[#23252e] border-l border-[var(--lemon-border)] shadow-2xl flex flex-col font-sans select-none animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--lemon-border)] bg-[var(--lemon-bg-alt)]">
                <div className="flex items-center gap-2">
                    <IconDocument className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-sm font-rounded text-[var(--lemon-text-primary)]">
                        Context Panel
                    </span>
                </div>
                <LemonButton type="tertiary" size="small" icon={<IconX />} onClick={onClose} />
            </div>

            {/* Tabs Row */}
            <div className="flex border-b border-[var(--lemon-border)] px-3 pt-2 gap-2 bg-slate-50 dark:bg-slate-900 text-xs">
                <button
                    onClick={() => setActiveTab('events')}
                    className={`pb-2 px-2 font-semibold border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'events' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                    }`}
                >
                    Events ({AVAILABLE_EVENTS.length})
                </button>
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`pb-2 px-2 font-semibold border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'insights' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                    }`}
                >
                    Insights ({AVAILABLE_INSIGHTS.length})
                </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {activeTab === 'events' &&
                    AVAILABLE_EVENTS.map((item) => {
                        const isSel = attached.includes(item.name)
                        return (
                            <div
                                key={item.id}
                                onClick={() => handleToggle(item.name)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                    isSel
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400'
                                        : 'bg-white dark:bg-[#1d1f26] border-[var(--lemon-border)] hover:border-slate-300'
                                }`}
                            >
                                <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-blue-600">
                                        <IconDocument className="w-3.5 h-3.5" />
                                        <span>{item.name}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate">{item.desc}</p>
                                </div>

                                {isSel ? (
                                    <IconCheck className="w-4 h-4 text-blue-600" />
                                ) : (
                                    <IconPlus className="w-4 h-4 text-slate-400" />
                                )}
                            </div>
                        )
                    })}

                {activeTab === 'insights' &&
                    AVAILABLE_INSIGHTS.map((item) => {
                        const isSel = attached.includes(item.name)
                        return (
                            <div
                                key={item.id}
                                onClick={() => handleToggle(item.name)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                    isSel
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400'
                                        : 'bg-white dark:bg-[#1d1f26] border-[var(--lemon-border)] hover:border-slate-300'
                                }`}
                            >
                                <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lemon-text-primary)] font-sans">
                                        <IconGraph className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{item.name}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate">{item.desc}</p>
                                </div>

                                {isSel ? (
                                    <IconCheck className="w-4 h-4 text-blue-600" />
                                ) : (
                                    <IconPlus className="w-4 h-4 text-slate-400" />
                                )}
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}
