import React, { useState } from 'react'
import SEO from 'components/seo'
import ScrollArea from 'components/RadixUI/ScrollArea'
import OSButton from 'components/OSButton'
import WimLogo from 'components/WimLogo'
import { useUser } from 'hooks/useUser'
import { useToast } from 'context/Toast'
import { useAppActions } from 'context/App'
import { isUserPro, BILLING_PLANS, BILLING_DISCOUNT, discountedUsd } from 'lib/wim-billing'
import { IconCheck, IconSpinner } from '@posthog/icons'

const COMPARISON: Array<{ label: string; desk: string; study: string }> = [
    { label: 'WIM AI models', desk: 'fast, everyday', study: 'deeper when it has to think' },
    { label: 'daily inquiry budget', desk: 'standard', study: 'expanded' },
    { label: 'philosopher panel', desk: '—', study: 'several voices at once' },
    { label: 'memory across notebooks', desk: 'session', study: 'persistent' },
    { label: 'artifacts (charts, mermaid, sandboxes)', desk: 'yes', study: 'more, faster' },
    { label: 'profile mark', desk: '—', study: 'study' },
]

function money(n: number) {
    return `$${n.toFixed(2)}`
}

export default function PricingWindow() {
    const { user } = useUser()
    const { addToast } = useToast()
    const { openSignIn } = useAppActions()
    const isStudy = isUserPro(user as any)

    const [interval, setInterval] = useState<'month' | 'year'>('month')
    const [loading, setLoading] = useState(false)

    const listPrice = interval === 'month' ? BILLING_PLANS.pro.priceMonthlyUsd : BILLING_PLANS.pro.priceYearlyUsd
    const firstPrice = discountedUsd(listPrice)
    const cadence = interval === 'month' ? 'month' : 'year'

    const handleUpgrade = async () => {
        if (!user) {
            openSignIn()
            addToast({
                description: 'sign in first — study is tied to your account.',
            })
            return
        }

        setLoading(true)
        try {
            const { chatAuthHeadersFresh } = await import('lib/chat-remote')
            const authHeaders = await chatAuthHeadersFresh(true)
            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ interval }),
            })

            const data = await res.json()
            if (!res.ok || !data.checkoutUrl) {
                throw new Error(data.error || 'could not open checkout.')
            }

            window.location.href = data.checkoutUrl
        } catch (err: any) {
            addToast({
                error: true,
                description: err?.message || 'checkout failed.',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div data-scheme="primary" className="bg-transparent text-primary h-full min-h-0 flex flex-col select-text">
            <SEO
                title="study"
                description="the desk is already yours. study is extra heat for WIM AI, notebook memory, and longer days of inquiry."
            />
            <ScrollArea className="flex-1 min-h-0">
                <div className="px-5 @md:px-8 py-7 @md:py-8 max-w-5xl">
                    <div className="flex items-center gap-2 mb-4">
                        <WimLogo className="size-6 text-primary" />
                        <span className="text-[11px] font-bold tracking-widest uppercase text-muted">
                            worldinmaking / study
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary bg-accent/50">
                            {BILLING_DISCOUNT.code} · {BILLING_DISCOUNT.percent}% first invoice
                        </span>
                    </div>

                    <h1 className="text-3xl @md:text-[2.05rem] font-bold tracking-tight leading-tight m-0 mb-2">
                        more room on the desk.
                    </h1>
                    <p className="text-[15px] text-secondary leading-relaxed m-0 mb-5 max-w-2xl">
                        the desk is already running: notebooks, forum, WIM AI. study is not another product — it is the
                        same windows, with more inquiry, memory that lasts, and philosophers who can argue in a panel.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <OSButton
                            size="sm"
                            variant={interval === 'month' ? 'primary' : 'default'}
                            onClick={() => setInterval('month')}
                        >
                            monthly
                        </OSButton>
                        <OSButton
                            size="sm"
                            variant={interval === 'year' ? 'primary' : 'default'}
                            onClick={() => setInterval('year')}
                        >
                            yearly
                        </OSButton>
                        <span className="text-[11px] text-muted">
                            first invoice {BILLING_DISCOUNT.percent}% off, then the list price
                        </span>
                    </div>

                    <div className="grid grid-cols-1 @md:grid-cols-2 gap-3 mb-8">
                        <section
                            data-scheme="secondary"
                            className="border border-primary bg-primary p-4 flex flex-col gap-4"
                        >
                            <header>
                                <div className="flex items-baseline justify-between gap-2">
                                    <h2 className="text-lg font-bold m-0">{BILLING_PLANS.free.name}</h2>
                                    <span className="text-[11px] text-muted">included</span>
                                </div>
                                <p className="text-xs text-secondary m-0 mt-1">the OS you already opened.</p>
                            </header>
                            <p className="text-2xl font-bold m-0">$0</p>
                            <ul className="m-0 p-0 list-none space-y-2 text-[13px] text-secondary">
                                {BILLING_PLANS.free.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2">
                                        <IconCheck className="size-4 text-muted shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-auto">
                                <OSButton size="md" disabled>
                                    {isStudy ? 'still included' : 'this desk'}
                                </OSButton>
                            </div>
                        </section>

                        <section
                            data-scheme="secondary"
                            className="border-2 border-primary bg-primary p-4 flex flex-col gap-4"
                        >
                            <header>
                                <div className="flex items-baseline justify-between gap-2">
                                    <h2 className="text-lg font-bold m-0">{BILLING_PLANS.pro.name}</h2>
                                    <span className="text-[11px] font-bold">{BILLING_DISCOUNT.code}</span>
                                </div>
                                <p className="text-xs text-secondary m-0 mt-1">same windows. more heat.</p>
                            </header>
                            <div>
                                <p className="m-0 flex items-baseline gap-2 flex-wrap">
                                    <span className="text-sm text-muted line-through">{money(listPrice)}</span>
                                    <span className="text-2xl font-bold">{money(firstPrice)}</span>
                                    <span className="text-xs text-muted">first {cadence}</span>
                                </p>
                                <p className="text-[11px] text-muted m-0 mt-1">
                                    then {money(listPrice)} / {cadence}
                                </p>
                            </div>
                            <ul className="m-0 p-0 list-none space-y-2 text-[13px] text-secondary">
                                {BILLING_PLANS.pro.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2">
                                        <IconCheck className="size-4 shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-auto">
                                {isStudy ? (
                                    <OSButton size="md" asLink to="/account">
                                        Account
                                    </OSButton>
                                ) : (
                                    <OSButton size="md" variant="primary" onClick={handleUpgrade} disabled={loading}>
                                        {loading ? (
                                            <span className="inline-flex items-center gap-2">
                                                <IconSpinner className="size-4 animate-spin" />
                                                opening checkout
                                            </span>
                                        ) : (
                                            'open study'
                                        )}
                                    </OSButton>
                                )}
                            </div>
                        </section>
                    </div>

                    <h2 className="text-sm font-bold m-0 mb-2">what actually changes</h2>
                    <div className="border border-primary overflow-hidden mb-8">
                        <table className="w-full text-left border-collapse text-[13px]">
                            <thead>
                                <tr className="bg-accent border-b border-primary">
                                    <th className="py-2 px-3 font-semibold"> </th>
                                    <th className="py-2 px-3 font-semibold w-40">{BILLING_PLANS.free.name}</th>
                                    <th className="py-2 px-3 font-semibold w-48">{BILLING_PLANS.pro.name}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON.map((row) => (
                                    <tr key={row.label} className="border-b border-primary last:border-b-0">
                                        <td className="py-2 px-3 text-secondary">{row.label}</td>
                                        <td className="py-2 px-3 text-muted">{row.desk}</td>
                                        <td className="py-2 px-3">{row.study}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs text-muted m-0 pb-6">
                        payments go through Lemon Squeezy (merchant of record). cancel from the receipt, any time. the
                        desk stays if study lapses.
                    </p>
                </div>
            </ScrollArea>
        </div>
    )
}
