import React, { useState } from 'react'
import SEO from 'components/seo'
import ScrollArea from 'components/RadixUI/ScrollArea'
import WimLogo from 'components/WimLogo'
import { useUser } from 'hooks/useUser'
import { useToast } from 'context/Toast'
import { useAppActions } from 'context/App'
import { isUserPro, BILLING_PLANS } from 'lib/wim-billing'
import { IconCheck, IconSparkles, IconSpinner, IconShield, IconArrowRight } from '@posthog/icons'

interface FeatureRowProps {
    title: string
    explorer: string | boolean
    thinker: string | boolean
    highlight?: boolean
}

function FeatureRow({ title, explorer, thinker, highlight }: FeatureRowProps) {
    const renderVal = (val: string | boolean) => {
        if (typeof val === 'boolean') {
            return val ? (
                <IconCheck className="size-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
            ) : (
                <span className="text-muted text-xs">—</span>
            )
        }
        return <span className="text-xs text-secondary">{val}</span>
    }

    return (
        <tr className={`border-b border-primary/10 transition-colors ${highlight ? 'bg-blue-500/5' : ''}`}>
            <td className="py-3 px-4 text-xs font-medium text-primary">{title}</td>
            <td className="py-3 px-4 text-center text-xs text-muted">{renderVal(explorer)}</td>
            <td className="py-3 px-4 text-center text-xs font-semibold text-blue-600 dark:text-blue-400">{renderVal(thinker)}</td>
        </tr>
    )
}

export default function PricingWindow() {
    const { user } = useUser()
    const { addToast } = useToast()
    const { openSignIn } = useAppActions()
    const isPro = isUserPro(user as any)

    const [interval, setInterval] = useState<'month' | 'year'>('month')
    const [loading, setLoading] = useState(false)

    const handleUpgrade = async () => {
        if (!user) {
            openSignIn()
            addToast({
                type: 'info',
                message: 'Please sign in to your WorldInMaking account first.',
            })
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interval }),
            })

            const data = await res.json()
            if (!res.ok || !data.checkoutUrl) {
                throw new Error(data.error || 'Unable to initiate checkout session.')
            }

            if (data.isTestMode) {
                addToast({
                    type: 'info',
                    message: 'Demo Mode: Lemon Squeezy API keys are not configured yet.',
                })
            }

            window.location.href = data.checkoutUrl
        } catch (err: any) {
            addToast({
                type: 'error',
                message: err?.message || 'An error occurred. Please try again.',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div data-scheme="primary" className="bg-transparent text-primary h-full min-h-0 flex flex-col font-sans select-text">
            <SEO
                title="Pro Membership & Plans | WorldInMaking"
                description="Upgrade to WorldInMaking Pro for frontier reasoning models, multi-mind dialectical debate, and persistent notebook memory."
            />
            <ScrollArea className="flex-1 min-h-0">
                <div className="px-5 @md:px-8 py-7 @md:py-10 max-w-5xl mx-auto space-y-10">
                    {/* Header */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <WimLogo className="size-5 text-primary" />
                            <span className="text-[11px] font-bold tracking-widest uppercase text-muted">
                                worldinmaking / plans
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                Pro
                            </span>
                        </div>

                        <h1 className="text-3xl @md:text-[2.2rem] font-bold tracking-tight leading-tight m-0 text-primary">
                            expand the unfinished thought.
                        </h1>
                        <p className="text-[15px] text-secondary leading-relaxed m-0 max-w-2xl">
                            Unlock frontier reasoning models, multi-agent dialectical inquiries, and persistent memory across your notebooks and workspace tools.
                        </p>

                        {/* Interval Toggle */}
                        <div className="pt-2 flex items-center gap-3">
                            <div className="inline-flex p-1 rounded-xl bg-accent/40 border border-primary/15">
                                <button
                                    type="button"
                                    onClick={() => setInterval('month')}
                                    className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                        interval === 'month'
                                            ? 'bg-primary text-primary shadow-xs'
                                            : 'text-muted hover:text-primary'
                                    }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInterval('year')}
                                    className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        interval === 'year'
                                            ? 'bg-primary text-primary shadow-xs'
                                            : 'text-muted hover:text-primary'
                                    }`}
                                >
                                    Annual
                                    <span className="px-1.5 py-0.2 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                                        Save 20%
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pricing Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        {/* Free Tier */}
                        <div className="rounded-2xl p-6 bg-surface-primary/60 border border-primary/15 backdrop-blur-sm flex flex-col justify-between space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-primary m-0">Explorer</h3>
                                        <p className="text-xs text-muted m-0 mt-0.5">Essential workspace & note exploration</p>
                                    </div>
                                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent/50 text-secondary border border-primary/10">
                                        Free
                                    </span>
                                </div>

                                <div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-primary">$0</span>
                                        <span className="text-xs text-muted">/ forever</span>
                                    </div>
                                </div>

                                <ul className="space-y-2.5 pt-4 text-xs text-secondary border-t border-primary/10 m-0 p-0 list-none">
                                    {BILLING_PLANS.free.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <IconCheck className="size-4 text-muted shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <button
                                    disabled
                                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-accent/40 text-muted border border-primary/15 cursor-default text-center"
                                >
                                    {isPro ? 'Included Base Tier' : 'Current Active Plan'}
                                </button>
                            </div>
                        </div>

                        {/* Pro Tier (Navy Blue Theme) */}
                        <div className="relative rounded-2xl p-6 bg-surface-primary/90 border-[1.5px] border-blue-600/70 dark:border-blue-500/70 shadow-lg flex flex-col justify-between space-y-6 [box-shadow:0_0_28px_rgba(30,58,138,0.18)]">
                            <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white text-[10.5px] font-bold shadow-xs flex items-center gap-1">
                                <IconSparkles className="size-3" />
                                Recommended
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-primary m-0 flex items-center gap-1.5">
                                            Thinker (Pro)
                                        </h3>
                                        <p className="text-xs text-muted m-0 mt-0.5">Unbounded cognition & philosophical inquiry</p>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-primary">
                                            {interval === 'month' ? '$9.99' : '$8.25'}
                                        </span>
                                        <span className="text-xs text-muted">
                                            / month {interval === 'year' ? '(billed $99 annually)' : ''}
                                        </span>
                                    </div>
                                </div>

                                <ul className="space-y-2.5 pt-4 text-xs text-primary border-t border-primary/10 m-0 p-0 list-none">
                                    {BILLING_PLANS.pro.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <IconCheck className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                            <span className="font-medium text-secondary hover:text-primary transition-colors">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                {isPro ? (
                                    <div className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-center flex items-center justify-center gap-2">
                                        <IconCheck className="size-4" />
                                        Pro Active on Your Account
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleUpgrade}
                                        disabled={loading}
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#1E3A8A] hover:bg-[#1E40AF] dark:bg-[#1E3A8A] dark:hover:bg-[#2563EB] text-white shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <IconSpinner className="size-4 animate-spin" />
                                                Opening Checkout…
                                            </>
                                        ) : (
                                            <>
                                                <IconSparkles className="size-4" />
                                                Upgrade to Pro
                                                <IconArrowRight className="size-3.5 opacity-80" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Comparison Table */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Feature Comparison</span>
                        </div>
                        <div className="rounded-2xl border border-primary/15 overflow-hidden bg-surface-primary/40 backdrop-blur-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-primary/15 bg-accent/30 text-[11px] uppercase tracking-wider text-muted">
                                        <th className="py-3 px-4 font-semibold">Capability</th>
                                        <th className="py-3 px-4 font-semibold text-center w-36">Explorer (Free)</th>
                                        <th className="py-3 px-4 font-semibold text-center w-36 text-blue-600 dark:text-blue-400">Thinker (Pro)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <FeatureRow
                                        title="AI Models"
                                        explorer="Standard Models"
                                        thinker="Frontier Reasoning & Thinking"
                                        highlight
                                    />
                                    <FeatureRow
                                        title="Multi-Mind Philosophical Inquiries"
                                        explorer={false}
                                        thinker={true}
                                        highlight
                                    />
                                    <FeatureRow
                                        title="Long-Term Semantic Memory"
                                        explorer={false}
                                        thinker="Cross-Notebook Persistent"
                                        highlight
                                    />
                                    <FeatureRow
                                        title="Notebook Rewrites & Margin Notes"
                                        explorer="Standard Editing"
                                        thinker="Full Structural Restructuring"
                                    />
                                    <FeatureRow
                                        title="Live Artifact Previews (React / Charts)"
                                        explorer={true}
                                        thinker="Unrestricted & High Speed"
                                    />
                                    <FeatureRow
                                        title="Daily Request Capacity"
                                        explorer="400 msgs / day"
                                        thinker="3,000 msgs / day"
                                    />
                                    <FeatureRow
                                        title="Pro Thinker Profile Badge"
                                        explorer={false}
                                        thinker={true}
                                    />
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Philosophical Epigraph / Footnote */}
                    <div className="pt-2 pb-6 border-t border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
                        <div className="flex items-center gap-2">
                            <IconShield className="size-4 text-emerald-600 shrink-0" />
                            <span>Global Merchant of Record payment protection. Cancel subscription anytime with 1-click.</span>
                        </div>
                        <span className="font-mono text-[11px] opacity-70">
                            "The unexamined life is not worth living."
                        </span>
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
