import React from 'react'
import dynamic from 'next/dynamic'
import SEO from 'components/seo'
import {
    SITE,
    buildOrganizationJsonLd,
    buildSiteNavigationElementJsonLd,
    buildSoftwareApplicationJsonLd,
    buildWebSiteJsonLd,
} from 'lib/seo'
import Editor from 'components/Editor'
import HeroSection from './DesktopPage/HeroSection'

const FeatureBento = dynamic(() => import('./DesktopPage/FeatureBento'))
const PhilosopherExplainer = dynamic(() => import('./DesktopPage/PhilosopherExplainer'))
const LatestWriting = dynamic(() => import('./DesktopPage/LatestWriting'))
const NotebookCTA = dynamic(() => import('./DesktopPage/NotebookCTA'))
const ManifestoStrip = dynamic(() => import('./DesktopPage/ManifestoStrip'))

export default function Home() {
    return (
        <>
            <SEO
                title="worldinmaking"
                description={SITE.defaultDescription}
                structuredData={[
                    buildWebSiteJsonLd(),
                    buildOrganizationJsonLd(),
                    buildSoftwareApplicationJsonLd(),
                    buildSiteNavigationElementJsonLd(),
                ]}
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
