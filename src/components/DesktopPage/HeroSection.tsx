import React, { useEffect, useState } from 'react'
import { IconArrowUpRight, IconCheck } from '@posthog/icons'
import { RoughAnnotation } from 'components/Code/RoughAnnotation'
import { DownloadContent } from 'components/Code/DownloadContent'
import { usePrefersReducedMotion } from 'components/Code/usePrefersReducedMotion'
import Link from 'components/Link'
import { IconDiscord } from 'components/OSIcons/Icons'
import { WaitlistForm } from 'components/WaitlistForm'
import WistiaEmbed from 'components/WistiaEmbed'
import { LetPostHogScroller } from './shared'

export function HeroSection() {
    const [showDownload, setShowDownload] = useState(false)
    const [contentVisible, setContentVisible] = useState(true)
    const prefersReducedMotion = usePrefersReducedMotion()

    // Read the #download hash after mount so SSR and first client render agree (no hydration mismatch).
    useEffect(() => {
        if (window.location.hash === '#download') setShowDownload(true)
    }, [])

    const swapToDownload = () => {
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '#download')
        }
        if (showDownload) return
        if (prefersReducedMotion) {
            setShowDownload(true)
            return
        }
        setContentVisible(false)
        setTimeout(() => {
            setShowDownload(true)
            setContentVisible(true)
        }, 300)
    }

    return (
        <section className="w-full tracking-[-0.0125em]">
            {/* Top header bar: the page's own title strip (scroller + Discord) with a divider line */}
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-primary pb-3">
                <LetPostHogScroller className="text-xl @xl:text-2xl font-bold tracking-tight" />
                <Link
                    className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-secondary hover:text-primary"
                    to="https://discord.com/invite/E9xV2WnR98"
                    externalNoIcon
                >
                    <IconDiscord className="size-6 text-secondary group-hover:text-primary" />
                    <span className="group-hover:underline">Discord</span>
                    <IconArrowUpRight className="size-4 inline-block text-secondary invisible group-hover:visible" />
                </Link>
            </div>

            <div
                style={{
                    opacity: contentVisible ? 1 : 0,
                    transition: prefersReducedMotion ? undefined : 'opacity 0.3s ease',
                }}
            >
                {showDownload ? (
                    <DownloadContent className="w-full mx-auto py-8 text-center" />
                ) : (
                    <>
                        <h1 className="!mt-0 mb-4 text-xl font-bold leading-tight @xl:mb-8 @xl:text-3xl">
                            The{' '}
                            <RoughAnnotation
                                type="highlight"
                                color="rgba(48, 164, 108, 0.2)"
                                strokeWidth={1}
                                padding={2}
                                delay={300}
                            >
                                product editor
                            </RoughAnnotation>
                            {' for '}
                            <RoughAnnotation type="underline" color="#F54E00" strokeWidth={2} delay={600}>
                                <span className="font-bold">product builders</span>
                            </RoughAnnotation>
                        </h1>

                        <div className="flex flex-col items-start @4xl/editor:flex-row @4xl/editor:gap-8">
                            <div className="@4xl/editor:flex-[0_0_280px]">
                                <p>
                                    All the PostHog you already use, plus a coding agent that can act on your data. Real
                                    usage in, pull requests out.
                                </p>
                                <ul className="mb-4 list-none space-y-0.5 p-0 text-[15px]">
                                    {[
                                        'Build and edit your product',
                                        'Run a fleet of agents',
                                        'Turn product signals into PRs',
                                    ].map((item) => (
                                        <li key={item} className="relative pl-5">
                                            <IconCheck className="absolute left-0 top-1 size-4 text-green" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                <div className="@container max-w-sm">
                                    <WaitlistForm />
                                    <p className="mt-4 text-sm text-secondary">
                                        Have an invite code?{' '}
                                        <Link
                                            to="/desktop#download"
                                            className="font-bold underline"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                swapToDownload()
                                            }}
                                        >
                                            Get started
                                        </Link>
                                    </p>
                                </div>
                            </div>

                            <div className="w-full min-w-0 @4xl/editor:flex-1">
                                <div className="overflow-hidden rounded-md shadow-xl not-prose">
                                    <WistiaEmbed mediaId="vm9mn1m4dv" />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </section>
    )
}
