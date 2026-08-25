import React from 'react'
import Link from 'components/Link'
import WimLogo from 'components/WimLogo'

// ──────────────────────────────────────────────────────────────────
// Manifesto / closing
// ──────────────────────────────────────────────────────────────────

export default function ManifestoStrip() {
    return (
        <section className="px-4 @xl:px-10 py-12 @xl:py-16">
            <div className="max-w-xl mx-auto text-center">
                <WimLogo className="size-9 text-primary mx-auto mb-5 opacity-70" />
                <blockquote className="text-xl @xl:text-2xl font-bold leading-snug mb-4 text-primary">
                    "The world is always in the process of being made."
                </blockquote>
                <p className="text-sm text-secondary leading-relaxed">
                    This is a place for that process — the thinking, the unfinished ideas, and the things
                    that haven't been named yet.{' '}
                    <Link href="/about" className="underline hover:text-primary transition-colors">
                        About this site →
                    </Link>
                </p>
            </div>
        </section>
    )
}
