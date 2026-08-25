import WimLogo from 'components/WimLogo'
import React from 'react'
import Link from 'components/Link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

import { MakingTicker } from "./shared"

// ──────────────────────────────────────────────────────────────────
// Hero
// ──────────────────────────────────────────────────────────────────

export default function HeroSection() {
    return (
        <header className="px-4 @xl:px-10 py-12 @xl:py-16 border-b border-primary relative overflow-hidden">
            {/* subtle grid bg */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(0deg,currentColor 0,currentColor 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,currentColor 0,currentColor 1px,transparent 1px,transparent 40px)',
                }}
            />
            <div className="relative max-w-3xl">
                <div className="flex items-center gap-2 mb-6">
                    <WimLogo className="size-7 text-primary" />
                    <span className="text-[11px] font-bold tracking-widest uppercase text-muted">
                        worldinmaking
                    </span>
                    <span className="ml-2 text-[10px] bg-accent/60 border border-primary text-primary font-bold px-2 py-0.5 rounded-full">
                        BETA
                    </span>
                </div>

                <h1 className="text-3xl @xl:text-5xl font-bold leading-tight mb-5 tracking-tight">
                    a world always{' '}
                    <MakingTicker />
                </h1>

                <p className="text-base @xl:text-lg text-secondary leading-relaxed max-w-xl mb-8">
                    An open platform for ideas and intellectual work — long-form essays, live community discussion,
                    a markdown notebook, and AI philosopher bots that actually argue back.
                </p>

                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/posts"
                        className="inline-flex items-center gap-1.5 bg-primary text-bg-primary text-sm font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Explore writing →
                    </Link>
                    <Link
                        href="/notebooks"
                        className="inline-flex items-center gap-1.5 border border-primary text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-accent/30 transition-colors"
                    >
                        Open a notebook
                    </Link>
                    <Link
                        href="/community"
                        className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary px-3 py-2.5 transition-colors"
                    >
                        Join the forum ↗
                    </Link>
                </div>
            </div>
        </header>
    )
}
