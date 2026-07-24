import React from 'react'
import OSButton from 'components/OSButton'
import SEO from 'components/seo'
// Import product data to get competitor lists
import { productAnalytics } from 'hooks/productData/product_analytics'
import { webAnalytics } from 'hooks/productData/web_analytics'
import { sessionReplay } from 'hooks/productData/session_replay'
import { featureFlags } from 'hooks/productData/feature_flags'
import { experiments } from 'hooks/productData/experiments'
import { surveys } from 'hooks/productData/surveys'
import { errorTracking } from 'hooks/productData/error_tracking'
import { workflows } from 'hooks/productData/workflows'
import { logs } from 'hooks/productData/logs'
import { endpoints } from 'hooks/productData/endpoints'
import ReaderView from 'components/ReaderView'
import { TreeMenu } from 'components/TreeMenu'
import { internalToolsNav } from '../../navs/internalTools'

// Create table of contents for right sidebar
const tableOfContents = [
    {
        value: 'All products',
        url: 'all-products',
        depth: 0,
    },
    {
        value: 'Product Analytics',
        url: 'product-analytics',
        depth: 0,
    },
    {
        value: 'Web Analytics',
        url: 'web-analytics',
        depth: 0,
    },
    {
        value: 'Session Replay',
        url: 'session-replay',
        depth: 0,
    },
    {
        value: 'Feature Flags',
        url: 'feature-flags',
        depth: 0,
    },
    {
        value: 'Experiments',
        url: 'experiments',
        depth: 0,
    },
    {
        value: 'Surveys',
        url: 'surveys',
        depth: 0,
    },
    {
        value: 'Error Tracking',
        url: 'error-tracking',
        depth: 0,
    },
    {
        value: 'Heatmaps',
        url: 'heatmaps',
        depth: 0,
    },
    {
        value: 'Workflows',
        url: 'workflows',
        depth: 0,
    },
    {
        value: 'Customer Data Platform',
        url: 'cdp',
        depth: 0,
    },
    {
        value: 'Data Warehouse',
        url: 'data-warehouse',
        depth: 0,
    },
    {
        value: 'Dashboards',
        url: 'dashboards',
        depth: 0,
    },
    {
        value: 'Logs',
        url: 'logs',
        depth: 0,
    },
    {
        value: 'Endpoints',
        url: 'endpoints',
        depth: 0,
    },
    {
        value: 'Platform',
        url: 'platform',
        depth: 0,
    },
]

export default function FeatureMatrix(): JSX.Element {
    // Helper function to sort competitors with PostHog first
    const sortCompetitors = (competitors: string[]) => {
        return competitors.sort((a, b) => {
            if (a === 'posthog') return -1
            if (b === 'posthog') return 1
            return a.localeCompare(b)
        })
    }

    // Extract competitor keys from each product's companies list
    const productAnalyticsCompetitors = sortCompetitors(productAnalytics.comparison.companies.map((c: any) => c.key))
    const webAnalyticsCompetitors = sortCompetitors(webAnalytics.comparison.companies.map((c: any) => c.key))
    const sessionReplayCompetitors = sortCompetitors(sessionReplay.comparison.companies.map((c: any) => c.key))
    const featureFlagsCompetitors = sortCompetitors(featureFlags.comparison.companies.map((c: any) => c.key))
    const experimentsCompetitors = sortCompetitors(experiments.comparison.companies.map((c: any) => c.key))
    const surveysCompetitors = sortCompetitors(surveys.comparison.companies.map((c: any) => c.key))
    const errorTrackingCompetitors = sortCompetitors(errorTracking.comparison.companies.map((c: any) => c.key))
    const workflowsCompetitors = sortCompetitors(workflows.comparison.companies.map((c: any) => c.key))
    const logsCompetitors = sortCompetitors(logs.comparison.companies.map((c: any) => c.key))
    const endpointsCompetitors = sortCompetitors(endpoints.comparison.companies.map((c: any) => c.key))
    // Get all unique competitors for platform sections (union of all product competitors)
    const allCompetitors = Array.from(
        new Set([
            ...productAnalyticsCompetitors,
            ...webAnalyticsCompetitors,
            ...sessionReplayCompetitors,
            ...featureFlagsCompetitors,
            ...experimentsCompetitors,
            ...surveysCompetitors,
            ...errorTrackingCompetitors,
            ...workflowsCompetitors,
            ...logsCompetitors,
            ...endpointsCompetitors,
        ])
    ).sort((a, b) => {
        // Keep posthog first
        if (a === 'posthog') return -1
        if (b === 'posthog') return 1
        return a.localeCompare(b)
    })

    return (
        <>
            <SEO
                title="Feature matrix - PostHog vs the world"
                description="Complete comparison matrix of PostHog against all competitors across all products and features"
                image={`/images/og/default.png`}
            />
            <ReaderView
                title="Feature matrix"
                leftSidebar={<TreeMenu items={internalToolsNav} />}
                tableOfContents={tableOfContents}
                showQuestions={false}
            >
                <div className="@container text-primary">
                    <div className="space-y-8">
                        <section>
                            <div className="bg-accent p-4 rounded border border-primary mt-4">
                                <p className="mt-0">
                                    This is an internal playground for the <code>&lt;ProductComparisonTable /&gt;</code>{' '}
                                    component used on competitor comparison pages.
                                </p>
                                <p className="mb-0">
                                    <OSButton
                                        asLink
                                        to="/handbook/engineering/posthog-com/product-comparisons"
                                        variant="secondary"
                                        size="md"
                                        state={{ newWindow: true }}
                                    >
                                        Visit the documentation
                                    </OSButton>
                                </p>
                            </div>
                        </section>
                        {/* Products Overview */}
                        <section id="all-products">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">All products</h2>
                            null
                        </section>

                        {/* Product Analytics */}
                        <section id="product-analytics">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">
                                Product Analytics
                            </h2>
                            null
                        </section>

                        {/* Web Analytics */}
                        <section id="web-analytics">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Web Analytics</h2>
                            null
                        </section>

                        {/* Session Replay */}
                        <section id="session-replay">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Session Replay</h2>
                            null
                        </section>

                        {/* Feature Flags */}
                        <section id="feature-flags">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Feature Flags</h2>
                            null
                        </section>

                        {/* Experiments */}
                        <section id="experiments">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Experiments</h2>
                            null
                        </section>

                        {/* Surveys */}
                        <section id="surveys">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Surveys</h2>
                            null
                        </section>

                        {/* Error Tracking */}
                        <section id="error-tracking">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Error Tracking</h2>
                            null
                        </section>

                        {/* Heatmaps */}
                        <section id="heatmaps">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Heatmaps</h2>
                            null
                        </section>

                        {/* CDP */}
                        <section id="cdp">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">
                                Customer Data Platform
                            </h2>
                            null
                        </section>

                        {/* Data Warehouse */}
                        <section id="data-warehouse">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Data Warehouse</h2>
                            null
                        </section>

                        {/* Dashboards */}
                        <section id="dashboards">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Dashboards</h2>
                            null
                        </section>

                        {/* Logs */}
                        <section id="logs">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Logs</h2>
                            null
                        </section>

                        {/* Endpoints */}
                        <section id="endpoints">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Endpoints</h2>
                            null
                        </section>

                        {/* Platform */}
                        <section id="platform">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">Platform</h2>
                            null
                        </section>
                    </div>
                </div>
            </ReaderView>
        </>
    )
}
