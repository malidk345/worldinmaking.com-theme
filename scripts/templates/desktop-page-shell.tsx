import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import SEO, { buildProductStructuredData } from 'components/seo'
import Editor from 'components/Editor'
import { HeroSection } from 'components/DesktopPage/HeroSection'

/** Lightweight placeholder matching section vertical rhythm while chunks load. */
function SectionSkeleton({ className = 'h-48' }: { className?: string }) {
    return (
        <div
            className={`mx-4 @xl:mx-8 mb-12 @xl:mb-16 animate-pulse rounded-md bg-accent/40 ${className}`}
            aria-hidden
        />
    )
}

// Below-the-fold: separate webpack chunks so the home route ships a smaller first paint.
const OldWaySection = dynamic(
    () => import('components/DesktopPage/NarrativeSections').then((m) => m.OldWaySection),
    { loading: () => <SectionSkeleton className="h-64" /> }
)
const PostHogWaySection = dynamic(
    () => import('components/DesktopPage/NarrativeSections').then((m) => m.PostHogWaySection),
    { loading: () => <SectionSkeleton className="h-56" /> }
)
const Features = dynamic(() => import('components/DesktopPage/FeaturesSection').then((m) => m.Features), {
    loading: () => <SectionSkeleton className="h-96" />,
})
const SkillsCallout = dynamic(
    () => import('components/DesktopPage/IntegrationsSections').then((m) => m.SkillsCallout),
    { loading: () => <SectionSkeleton className="h-40" /> }
)
const SupportedLLMs = dynamic(
    () => import('components/DesktopPage/IntegrationsSections').then((m) => m.SupportedLLMs),
    { loading: () => <SectionSkeleton className="h-48" /> }
)
const MCPMarketplace = dynamic(
    () => import('components/DesktopPage/IntegrationsSections').then((m) => m.MCPMarketplace),
    { loading: () => <SectionSkeleton className="h-48" /> }
)
const InboxCallout = dynamic(
    () => import('components/DesktopPage/ClosingSections').then((m) => m.InboxCallout),
    { loading: () => <SectionSkeleton className="h-64" /> }
)
const AgenticWorkspaceSection = dynamic(
    () => import('components/DesktopPage/WorkspaceSection').then((m) => m.AgenticWorkspaceSection),
    { loading: () => <SectionSkeleton className="h-96" /> }
)
const BiggerPictureSection = dynamic(
    () => import('components/DesktopPage/ClosingSections').then((m) => m.BiggerPictureSection),
    { loading: () => <SectionSkeleton className="h-40" /> }
)
const TLDR = dynamic(() => import('components/DesktopPage/ClosingSections').then((m) => m.TLDR), {
    loading: () => <SectionSkeleton className="h-56" />,
})
const FAQ = dynamic(() => import('components/DesktopPage/ClosingSections').then((m) => m.FAQ), {
    loading: () => <SectionSkeleton className="h-72" />,
})

export { DownloadButton } from 'components/DesktopPage/ClosingSections'

export default function CodePage() {
    const [postHogWayDone, setPostHogWayDone] = useState(false)

    return (
        <>
            <SEO
                title="PostHog Desktop"
                description="The desktop for product builders – run a fleet of agents that build your product, not just your code"
                structuredData={buildProductStructuredData({
                    name: 'PostHog Desktop',
                    description: 'A desktop app for steering coding agents and editing your product',
                    slug: 'desktop',
                    operatingSystem: 'macOS, Windows, Linux',
                })}
            />
            <Editor slug="/desktop" maxWidth="100%" hasPadding={false} disableFormatting>
                <div className="@container not-prose font-rounded">
                    <header className="relative mb-8 border-b border-primary">
                        <div className="max-w-4xl mx-auto px-4 @xl:px-8 pt-6 @xl:pt-8 pb-8">
                            <HeroSection />
                        </div>
                    </header>

                    <div className="max-w-4xl mx-auto">
                        <OldWaySection />

                        <PostHogWaySection onComplete={() => setPostHogWayDone(true)} />

                        <Features />

                        <SkillsCallout />

                        <SupportedLLMs />

                        <MCPMarketplace />

                        {/* Self-driving loop box sits just above the alphas carousel */}
                        <InboxCallout />

                        <AgenticWorkspaceSection />

                        {/* The "promotion" narrative beat lands just before the closing CTA */}
                        <BiggerPictureSection />

                        <TLDR ready={postHogWayDone} />

                        <FAQ />
                    </div>
                </div>
            </Editor>
        </>
    )
}
