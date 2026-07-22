"use client"

import React, { useState } from 'react'
import { IconSparkles, IconCheckCircle, IconPlay, IconPeople, IconActivity, IconCopy } from '@posthog/icons'


// ── 1. Query / Insight Chart Node ──────────────────────────────────────────
export function QueryNode({ type = 'line', title = 'Page Views' }: { type?: string; title?: string }) {
    const isLine = type === 'line'

    return (
        <div className="my-6 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-[#1C1C1E] shadow-sm font-sans">
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <div className="flex items-center gap-2">
                    <IconActivity className="size-4 text-amber-500" />
                    <span className="font-bold text-xs text-primary">{title}</span>
                </div>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold uppercase">
                    PostHog Insight
                </span>
            </div>
            <div className="p-5 flex flex-col items-center justify-center">
                {isLine ? (
                    /* Mock Line Chart */
                    <svg viewBox="0 0 500 200" className="w-full h-44 overflow-visible">
                        <defs>
                            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(245, 158, 11)" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="0.0" />
                            </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(0,0,0,0.05)" strokeDasharray="4" />
                        <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(0,0,0,0.05)" strokeDasharray="4" />
                        <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(0,0,0,0.05)" strokeDasharray="4" />
                        {/* Area fill */}
                        <path d="M 0 150 Q 100 80, 200 120 T 400 40 L 500 80 L 500 200 L 0 200 Z" fill="url(#chart-grad)" />
                        {/* Main Path */}
                        <path d="M 0 150 Q 100 80, 200 120 T 400 40 L 500 80" fill="none" stroke="rgb(245, 158, 11)" strokeWidth="3" />
                        {/* Interactive dots */}
                        <circle cx="200" cy="120" r="5" fill="rgb(245, 158, 11)" stroke="white" strokeWidth="2" />
                        <circle cx="400" cy="40" r="5" fill="rgb(245, 158, 11)" stroke="white" strokeWidth="2" />
                    </svg>
                ) : (
                    /* Mock Bar Chart */
                    <svg viewBox="0 0 500 200" className="w-full h-44">
                        <rect x="30" y="80" width="30" height="120" rx="3" fill="rgb(245, 158, 11)" />
                        <rect x="110" y="40" width="30" height="160" rx="3" fill="rgb(245, 158, 11)" />
                        <rect x="190" y="100" width="30" height="100" rx="3" fill="rgb(245, 158, 11)" />
                        <rect x="270" y="60" width="30" height="140" rx="3" fill="rgb(245, 158, 11)" />
                        <rect x="350" y="120" width="30" height="80" rx="3" fill="rgb(245, 158, 11)" />
                        <rect x="430" y="30" width="30" height="170" rx="3" fill="rgb(245, 158, 11)" />
                    </svg>
                )}
                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 font-sans text-xs text-muted opacity-80">
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-500" /> unique users</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-500/20" /> views</span>
                </div>
            </div>
        </div>
    )
}

// ── 2. SQL Query Node ───────────────────────────────────────────────────────
export function SQLNode({ code = 'SELECT event, count(*) FROM events GROUP BY event' }: { code?: string; nodeId?: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="my-6 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-[#161616] text-[#E4E4E7] shadow-sm font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-500" />
                    <span className="font-bold text-[10px] text-white/70">SQL (HogQL)</span>
                </div>
                <button onClick={handleCopy} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                    {copied ? <IconCheckCircle className="size-3.5 text-emerald-500" /> : <IconCopy className="size-3.5" />}
                </button>
            </div>
            {/* Editor Input */}
            <div className="p-4 bg-black/10 border-b border-white/5 whitespace-pre overflow-x-auto text-[#FCD34D]">
                {code}
            </div>
            {/* Table Results */}
            <div className="bg-[#1A1A1A] p-3 overflow-x-auto">
                <div className="text-[10px] uppercase font-bold text-white/40 mb-2">Query Results</div>
                <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-white/50">
                            <th className="pb-1.5 pr-4">event</th>
                            <th className="pb-1.5 text-right">count</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-white/5 text-white/80">
                            <td className="py-1.5 pr-4">$pageview</td>
                            <td className="py-1.5 text-right font-bold">14,250</td>
                        </tr>
                        <tr className="border-b border-white/5 text-white/80">
                            <td className="py-1.5 pr-4">button_click</td>
                            <td className="py-1.5 text-right font-bold">4,820</td>
                        </tr>
                        <tr className="text-white/80">
                            <td className="py-1.5 pr-4">sign_up</td>
                            <td className="py-1.5 text-right font-bold">1,250</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ── 3. Python Code Node ────────────────────────────────────────────────────
export function PythonNode({ code = 'print("executing model prediction...")' }: { code?: string; nodeId?: string }) {
    return (
        <div className="my-6 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-[#161616] text-[#E4E4E7] shadow-sm font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <IconPlay className="size-3 text-emerald-500" />
                    <span className="font-bold text-[10px] text-white/70">Python V2</span>
                </div>
                <span className="text-[9px] text-emerald-500 font-bold">Finished 0.4s</span>
            </div>
            {/* Python code */}
            <div className="p-4 bg-black/10 border-b border-white/5 whitespace-pre overflow-x-auto text-[#6EE7B7]">
                {code}
            </div>
            {/* Python console output */}
            <div className="bg-[#1A1A1A] p-3 text-[11px] text-white/60">
                <div className="text-[10px] uppercase font-bold text-white/40 mb-1.5">Console Output</div>
                <div>&gt; loaded model parameters successfully.</div>
                <div>&gt; analysis complete: cohort overlap index is 0.74.</div>
            </div>
        </div>
    )
}

// ── 4. Feature Flag Node ───────────────────────────────────────────────────
export function FeatureFlagNode({ name = 'ai-generation-beta', status = 'active' }: { name?: string; status?: string }) {
    const isActive = status === 'active'

    return (
        <div className="my-5 border border-black/10 dark:border-white/10 rounded-lg p-4 bg-white dark:bg-[#1C1C1E] shadow-sm font-sans flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isActive ? 'bg-emerald-400' : 'bg-neutral-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isActive ? 'bg-emerald-500' : 'bg-neutral-500'}`}></span>
                </div>
                <div>
                    <h5 className="font-bold text-sm text-primary tracking-tight m-0">{name}</h5>
                    <p className="text-[10px] text-muted m-0 mt-0.5 opacity-60">Feature Flag Key</p>
                </div>
            </div>
            <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded border border-black/5 dark:border-white/5 opacity-75">
                    100% of users
                </span>
                {/* Toggle switch visual */}
                <div className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-not-allowed ${isActive ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-800'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${isActive ? 'translate-x-4' : ''}`} />
                </div>
            </div>
        </div>
    )
}

// ── 5. Experiment Node ─────────────────────────────────────────────────────
export function ExperimentNode({ name = 'onboarding-optimisation', status = 'running' }: { name?: string; status?: string }) {
    return (
        <div className="my-6 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-[#1C1C1E] shadow-sm font-sans text-xs">
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <div className="flex items-center gap-2">
                    <IconSparkles className="size-4 text-purple-500" />
                    <span className="font-bold text-xs text-primary">{name}</span>
                </div>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold uppercase">
                    {status}
                </span>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-3 text-left font-bold text-muted opacity-60 pb-2 border-b border-black/5 dark:border-white/5">
                    <div>variant</div>
                    <div className="text-right">distribution</div>
                    <div className="text-right">conversion</div>
                </div>
                <div className="grid grid-cols-3 py-2.5 border-b border-black/5 dark:border-white/5 items-center">
                    <div className="font-semibold text-primary">control</div>
                    <div className="text-right text-muted">50%</div>
                    <div className="text-right font-bold text-primary">12.4%</div>
                </div>
                <div className="grid grid-cols-3 py-2.5 items-center">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        test_variant <IconSparkles className="size-3 text-amber-500" />
                    </div>
                    <div className="text-right text-muted">50%</div>
                    <div className="text-right font-bold text-emerald-600 dark:text-emerald-400">14.8% <span className="text-[10px] font-normal opacity-70">(significant)</span></div>
                </div>
            </div>
        </div>
    )
}

// ── 6. Cohort Node ─────────────────────────────────────────────────────────
export function CohortNode({ name = 'Power Users', count = '4,520' }: { name?: string; count?: string }) {
    return (
        <div className="my-5 border border-black/10 dark:border-white/10 rounded-lg p-4 bg-white dark:bg-[#1C1C1E] shadow-sm font-sans flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <IconPeople className="size-4.5" />
                </div>
                <div>
                    <h5 className="font-bold text-sm text-primary tracking-tight m-0">{name}</h5>
                    <p className="text-[10px] text-muted m-0 mt-0.5 opacity-60">Static Cohort definition</p>
                </div>
            </div>
            <div className="text-right">
                <div className="font-bold text-sm text-primary">{count}</div>
                <div className="text-[9px] text-muted opacity-60">matching users</div>
            </div>
        </div>
    )
}
