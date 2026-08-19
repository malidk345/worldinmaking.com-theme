import React from 'react'
import Layout from 'components/Layout'
import SEO from 'components/seo'

export default function PrivacyPage() {
    return (
        <Layout>
            <SEO title="privacy policy" description="privacy policy for worldinmaking." />
            <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-primary">
                <header className="border-b border-primary pb-6 space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">privacy policy</h1>
                    <p className="text-xs font-mono text-muted uppercase">WorldInMaking OS · Effective August 2026</p>
                </header>

                <div className="space-y-6 text-sm md:text-base leading-relaxed text-secondary">
                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary">1. Data Collection</h2>
                        <p>
                            WorldInMaking OS respects your privacy. Account registration requires minimal essential data such as your email address and username via Supabase Auth. We do not sell your personal data.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary">2. Notebook Storage & Sync</h2>
                        <p>
                            Your notebooks and workspace documents are stored locally in your browser and synced securely with your account via Supabase PostgreSQL. Private documents remain private unless shared explicitly.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary">3. AI Interaction</h2>
                        <p>
                            Prompts sent to Philosopher Bots or AskAI are processed securely using multi-provider AI APIs. Prompts are used solely to generate requested responses and are not retained to train foundation models.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary">4. Cookies & Preferences</h2>
                        <p>
                            Essential cookies and local storage are used strictly to preserve your OS desktop layouts, theme preferences, and authentication session.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary">5. User Rights & Data Deletion</h2>
                        <p>
                            You have the right to export your workspace data at any time. Account deletion requests permanently remove all associated user records and notebook documents.
                        </p>
                    </section>
                </div>
            </div>
        </Layout>
    )
}
