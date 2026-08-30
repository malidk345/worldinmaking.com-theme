import React, { useState } from 'react'
import SEO from 'components/seo'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { useUser } from 'hooks/useUser'
import { useToast } from 'context/Toast'
import { isUserPro, BILLING_PLANS } from 'lib/wim-billing'
import { IconCheck, IconSparkles, IconSpinner, IconShield } from '@posthog/icons'

export default function PricingWindow() {
    const { user } = useUser()
    const { addToast } = useToast()
    const isPro = isUserPro(user as any)

    const [interval, setInterval] = useState<'month' | 'year'>('month')
    const [loading, setLoading] = useState(false)

    const handleUpgrade = async () => {
        if (!user) {
            addToast({
                type: 'warning',
                message: 'Please sign in first to upgrade to Pro.',
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

            // Open checkout
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
        <>
            <SEO title="Pricing & Pro Membership | WorldInMaking" />
            <ScrollArea className="h-full w-full bg-primary text-primary">
                <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider border border-amber-500/20">
                            <IconSparkles className="size-3.5" />
                            WorldInMaking Pro
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
                            Deepen Your Mind, Expand Unfinished Thought
                        </h1>
                        <p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
                            Elevate your thinking with frontier reasoning models, multi-agent dialectical inquiries, and persistent memory across your notebooks and workspace.
                        </p>

                        {/* Interval Toggle */}
                        <div className="flex items-center justify-center pt-2">
                            <div className="inline-flex p-1 rounded-xl bg-surface-secondary border border-[var(--color-border-primary)] shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setInterval('month')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        interval === 'month'
                                            ? 'bg-primary text-primary shadow-xs'
                                            : 'text-muted hover:text-primary'
                                    }`}
                                >
                                    Monthly Billing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInterval('year')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                                        interval === 'year'
                                            ? 'bg-primary text-primary shadow-xs'
                                            : 'text-muted hover:text-primary'
                                    }`}
                                >
                                    Annual Billing
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                        Save 20%
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pricing Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        {/* Free Tier */}
                        <div className="rounded-2xl p-6 sm:p-7 bg-surface-primary border border-[var(--color-border-primary)] shadow-xs flex flex-col justify-between space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-primary">{BILLING_PLANS.free.name}</h3>
                                        <p className="text-xs text-muted mt-0.5">Essential exploration and note-taking</p>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-secondary text-muted">
                                        Free
                                    </span>
                                </div>

                                <div className="pt-2">
                                    <span className="text-3xl font-extrabold text-primary">$0</span>
                                    <span className="text-xs text-muted"> / forever</span>
                                </div>

                                <ul className="space-y-2.5 pt-4 text-xs text-secondary border-t border-[var(--color-border-primary)]">
                                    {BILLING_PLANS.free.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2.5">
                                            <IconCheck className="size-4 text-muted shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                disabled
                                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-surface-secondary text-muted border border-[var(--color-border-primary)] cursor-default"
                            >
                                {isPro ? 'Included Base Tier' : 'Current Plan'}
                            </button>
                        </div>

                        {/* Pro Tier (Featured) */}
                        <div className="relative rounded-2xl p-6 sm:p-7 bg-surface-primary border-2 border-amber-500/80 shadow-md flex flex-col justify-between space-y-6 [box-shadow:0_0_24px_rgba(245,158,11,0.12)]">
                            {/* Popular badge */}
                            <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold shadow-xs">
                                Recommended
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-primary flex items-center gap-1.5">
                                            {BILLING_PLANS.pro.name}
                                            <IconSparkles className="size-4 text-amber-500" />
                                        </h3>
                                        <p className="text-xs text-muted mt-0.5">Unbounded deep cognition & philosophical co-authoring</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <span className="text-3xl font-extrabold text-primary">
                                        {interval === 'month' ? '$9.99' : '$8.25'}
                                    </span>
                                    <span className="text-xs text-muted"> / month {interval === 'year' ? '(billed annually at $99)' : ''}</span>
                                </div>

                                <ul className="space-y-2.5 pt-4 text-xs text-primary border-t border-[var(--color-border-primary)]">
                                    {BILLING_PLANS.pro.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2.5">
                                            <IconCheck className="size-4 text-amber-500 shrink-0 mt-0.5" />
                                            <span className="font-medium">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {isPro ? (
                                <div className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-center flex items-center justify-center gap-2">
                                    <IconCheck className="size-4" />
                                    Pro Membership Active
                                </div>
                            ) : (
                                <button
                                    onClick={handleUpgrade}
                                    disabled={loading}
                                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <IconSpinner className="size-4 animate-spin" />
                                            Redirecting…
                                        </>
                                    ) : (
                                        <>
                                            <IconSparkles className="size-4" />
                                            Upgrade to Pro
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Security & Guarantee Note */}
                    <div className="p-4 rounded-xl bg-surface-secondary/60 border border-[var(--color-border-primary)] flex items-center justify-center gap-3 text-xs text-muted text-center">
                        <IconShield className="size-4 text-emerald-600 shrink-0" />
                        <span>
                            Secure checkout via Merchant of Record. Manage or cancel your subscription anytime with one click.
                        </span>
                    </div>
                </div>
            </ScrollArea>
        </>
    )
}
