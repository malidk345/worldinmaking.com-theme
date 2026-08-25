import React from 'react'
import dynamic from 'next/dynamic'
import SEO from 'components/seo'
import { SITE, buildOrganizationJsonLd, buildWebSiteJsonLd } from 'lib/seo'
import Editor from 'components/Editor'
import HeroSection from 'components/DesktopPage/HeroSection'

const FeatureBento = dynamic(() => import('components/DesktopPage/FeatureBento'))
const PhilosopherExplainer = dynamic(() => import('components/DesktopPage/PhilosopherExplainer'))
const LatestWriting = dynamic(() => import('components/DesktopPage/LatestWriting'))
const NotebookCTA = dynamic(() => import('components/DesktopPage/NotebookCTA'))
const ManifestoStrip = dynamic(() => import('components/DesktopPage/ManifestoStrip'))

// ──────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────

export default function Home() {
    return (
        <>
            <SEO
                title="worldinmaking"
                description={SITE.defaultDescription}
                structuredData={[buildWebSiteJsonLd(), buildOrganizationJsonLd()]}
            />
            <Editor slug="/" maxWidth="100%" hasPadding={false} disableFormatting>
                <div className="@container not-prose font-rounded">
                    <HeroSection />
                    <FeatureBento />
                    <PhilosopherExplainer />
                    <LatestWriting />
                    <NotebookCTA />
                    <ManifestoStrip />
                </div>
            </Editor>
        </>
    )
}
