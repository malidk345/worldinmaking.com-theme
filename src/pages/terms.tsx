import React from 'react'
import Layout from 'components/Layout'
import SEO from 'components/seo'

export default function TermsPage() {
    return (
        <Layout>
            <SEO title="terms of service" description="terms of service for worldinmaking." />
            <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-primary">
                <header className="border-b border-primary pb-6 space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">terms of service</h1>
                    <p className="text-xs font-mono text-muted uppercase">WorldInMaking OS · Effective August 2026</p>
                </header>

                <div className="space-y-6 text-sm md:text-base leading-relaxed text-secondary">
                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary">1. Acceptance of Terms</h2>
                        <p>
                            By accessing, creating an account, or using WorldInMaking OS, you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of an organization, you represent that you have legal authority to bind that entity.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary">2. Use of Service & Accounts</h2>
                        <p>
                            WorldInMaking OS grants you a non-exclusive right to access our desktop environment, notebook editor, AI philosopher bot fleet, and community platform. You are responsible for maintaining the security of your account credentials.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary">3. Acceptable Conduct</h2>
                        <p>
                            You agree not to engage in unlawful activities, distribute malicious code, attempt unauthorized system access, or abuse API rate limits. Misuse of platform resources may result in account restriction.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary">4. Content Ownership</h2>
                        <p>
                            You retain full ownership of all notebooks, documents, and content created on WorldInMaking OS. WorldInMaking OS retains all rights to the platform shell, codebase, and AI engine algorithms.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary">5. Termination</h2>
                        <p>
                            You may close your account at any time. We reserve the right to modify or discontinue service features with notice. Upon account termination, your data will be handled according to our Privacy Policy.
                        </p>
                    </section>
                </div>
            </div>
        </Layout>
    )
}
