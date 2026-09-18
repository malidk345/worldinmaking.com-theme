import React, { useState } from 'react'
import SEO from 'components/seo'
import ScrollArea from 'components/RadixUI/ScrollArea'
import OSButton from 'components/OSButton'
import WimLogo from 'components/WimLogo'
import { Fieldset } from 'components/OSFieldset'
import { useUser } from 'hooks/useUser'
import { useToast } from 'context/Toast'
import { useAppActions } from 'context/App'
import { isUserPro, BILLING_PLANS, BILLING_DISCOUNT, discountedUsd } from 'lib/wim-billing'
import { IconCheck, IconSpinner } from '@posthog/icons'

const COMPARISON: Array<{ label: string; desk: string; study: string }> = [
    { label: 'WIM AI models', desk: 'fast, everyday', study: 'deeper when it has to think' },
    {
        label: 'weekly token budget',
        desk: BILLING_PLANS.free.weeklyTokenBudget,
        study: BILLING_PLANS.pro.weeklyTokenBudget,
    },
    { label: 'philosopher conversations', desk: 'included', study: 'included' },
    { label: 'AI memory', desk: 'local device', study: 'local device' },
    { label: 'artifacts (charts, mermaid, sandboxes)', desk: 'yes', study: 'more, faster' },
]

function money(n: number) {
    return `$${n.toFixed(2)}`
}

function PlanCard({
    title,
    badge,
    blurb,
    price,
    priceNote,
    features,
    mutedChecks,
    cta,
    emphasized,
}: {
    title: string
    badge: string
    blurb: string
    price: React.ReactNode
    priceNote?: React.ReactNode
    features: string[]
    mutedChecks?: boolean
    cta: React.ReactNode
    emphasized?: boolean
}) {
    return (
        <section
            data-scheme="secondary"
            className={`min-w-0 flex-1 flex flex-col gap-3 p-4 rounded border bg-primary ${
                emphasized ? 'border-2 border-primary' : 'border-primary'
            }`}
        >
            <header>
                <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold m-0 capitalize">{title}</h2>
                    <span className={`text-[10px] font-semibold ${emphasized ? '' : 'text-muted'}`}>{badge}</span>
                </div>
                <p className="text-xs text-secondary m-0 mt-1">{blurb}</p>
            </header>
            <div>
                <div className="m-0">{price}</div>
                {priceNote}
            </div>
            <ul className="m-0 p-0 list-none space-y-2 text-xs text-secondary flex-1">
                {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                        <IconCheck
                            className={`size-4 shrink-0 mt-0.5 ${mutedChecks ? 'text-muted' : ''}`}
                        />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-auto pt-1">{cta}</div>
        </section>
    )
}

export default function PricingWindow({ checkoutAvailable = true }: { checkoutAvailable?: boolean }) {
    const { user, getJwt } = useUser()
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
            const token = await getJwt()
            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
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

    const studyCta = isStudy ? (
        <OSButton size="md" asLink to="/account" width="full">
            Manage membership
        </OSButton>
    ) : !checkoutAvailable ? (
        <div className="flex w-full flex-col gap-1.5 text-center">
            <OSButton size="md" variant="default" width="full" disabled>
                payments opening soon
            </OSButton>
            <span className="text-[11px] text-muted">check back shortly</span>
        </div>
    ) : (
        <OSButton size="md" variant="primary" width="full" onClick={handleUpgrade} disabled={loading}>
            {loading ? (
                <span className="inline-flex items-center gap-2">
                    <IconSpinner className="size-4 animate-spin" />
                    opening checkout
                </span>
            ) : (
                'open study'
            )}
        </OSButton>
    )

    return (
        <div
            data-scheme="primary"
            className="@container bg-transparent text-primary h-full min-h-0 flex flex-col select-text"
        >
            <SEO
                title="study"
                description="the desk is already yours. study is extra heat for WIM AI, a larger AI budget, and longer days of inquiry."
            />
            <ScrollArea className="flex-1 min-h-0">
                <div className="px-5 py-6 max-w-3xl mx-auto w-full">
                    <div className="flex items-center gap-2 mb-5 flex-wrap">
                        <WimLogo className="size-5 text-primary" />
                        <span className="text-xs font-semibold tracking-wide text-muted">worldinmaking</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-primary">
                            Study
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-primary">
                            {BILLING_DISCOUNT.code} · {BILLING_DISCOUNT.percent}% first invoice
                        </span>
                    </div>

                    <h1 className="text-xl font-bold m-0 mb-2 tracking-tight">More room on the desk</h1>
                    <p className="text-sm text-secondary leading-relaxed m-0 mb-4 max-w-2xl">
                        The desk is already running: notebooks, forum, WIM AI. Study is not another product — it is the
                        same windows, with a much larger AI budget, deeper models, and richer tools for inquiry.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mb-5">
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
                        <span className="text-xs text-muted">
                            first invoice {BILLING_DISCOUNT.percent}% off, then the list price
                        </span>
                    </div>

                    <Fieldset legend="Plans" className="mb-4">
                        {/*
                          Side-by-side when the viewport OR the OS window container is wide enough.
                          Viewport md covers /pricing; @sm covers AppWindow (@container) peers.
                        */}
                        <div className="flex flex-col sm:flex-row @sm:flex-row gap-3">
                            <PlanCard
                                title={BILLING_PLANS.free.name}
                                badge="included"
                                blurb="the OS you already opened."
                                price={<p className="text-xl font-bold m-0">$0</p>}
                                features={BILLING_PLANS.free.features}
                                mutedChecks
                                cta={
                                    <OSButton size="md" width="full" disabled>
                                        {isStudy ? 'still included' : 'this desk'}
                                    </OSButton>
                                }
                            />
                            <PlanCard
                                title={BILLING_PLANS.pro.name}
                                badge={BILLING_DISCOUNT.code}
                                blurb="same windows. more heat."
                                emphasized
                                price={
                                    <p className="m-0 flex items-baseline gap-2 flex-wrap">
                                        <span className="text-sm text-muted line-through">{money(listPrice)}</span>
                                        <span className="text-xl font-bold">{money(firstPrice)}</span>
                                        <span className="text-xs text-muted">first {cadence}</span>
                                    </p>
                                }
                                priceNote={
                                    <p className="text-[11px] text-muted m-0 mt-1">
                                        then {money(listPrice)} / {cadence}
                                    </p>
                                }
                                features={BILLING_PLANS.pro.features}
                                cta={studyCta}
                            />
                        </div>
                    </Fieldset>

                    <Fieldset legend="What actually changes" className="mb-4">
                        <div className="border border-primary overflow-hidden rounded -mx-0.5">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-accent border-b border-primary">
                                        <th className="py-2 px-3 font-semibold"> </th>
                                        <th className="py-2 px-3 font-semibold w-28 sm:w-36">
                                            {BILLING_PLANS.free.name}
                                        </th>
                                        <th className="py-2 px-3 font-semibold w-32 sm:w-40">
                                            {BILLING_PLANS.pro.name}
                                        </th>
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
                    </Fieldset>

                    <p className="text-xs text-muted m-0 pb-4">
                        Payments go through Lemon Squeezy (merchant of record). Cancel from the receipt, any time. The
                        desk stays if study lapses.
                    </p>
                </div>
            </ScrollArea>
        </div>
    )
}
