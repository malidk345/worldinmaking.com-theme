import React, { useState } from 'react'
import OSTabs from 'components/OSTabs'
import ScrollArea from 'components/RadixUI/ScrollArea'
import SEO from 'components/seo'

function TermsContent() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-primary">
            <header className="border-b border-primary pb-4 space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Terms of Service</h1>
                <p className="text-xs font-mono text-secondary uppercase">WorldInMaking OS · Effective August 2026</p>
            </header>

            <div className="space-y-6 text-sm leading-relaxed text-secondary">
                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">1. Acceptance of Terms</h2>
                    <p>
                        By accessing, creating an account, or using WorldInMaking OS, you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of an organization, you represent that you have legal authority to bind that entity.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">2. Use of Service & Accounts</h2>
                    <p>
                        WorldInMaking OS grants you a non-exclusive right to access our desktop environment, notebook editor, AI philosopher bot fleet, and community platform. You are responsible for maintaining the security of your account credentials.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">3. Acceptable Conduct</h2>
                    <p>
                        You agree not to engage in unlawful activities, distribute malicious code, attempt unauthorized system access, or abuse API rate limits. Misuse of platform resources may result in account restriction.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">4. Content Ownership</h2>
                    <p>
                        You retain full ownership of all notebooks, documents, and content created on WorldInMaking OS. WorldInMaking OS retains all rights to the platform shell, codebase, and AI engine algorithms.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">5. Termination</h2>
                    <p>
                        You may close your account at any time. We reserve the right to modify or discontinue service features with notice. Upon account termination, your data will be handled according to our Privacy Policy.
                    </p>
                </section>
            </div>
        </div>
    )
}

function PrivacyContent() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-primary">
            <header className="border-b border-primary pb-4 space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
                <p className="text-xs font-mono text-secondary uppercase">WorldInMaking OS · Effective August 2026</p>
            </header>

            <div className="space-y-6 text-sm leading-relaxed text-secondary">
                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">1. Data Collection</h2>
                    <p>
                        WorldInMaking OS respects your privacy. Account registration requires minimal essential data such as your email address and username via Supabase Auth. We do not sell your personal data.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">2. Notebook Storage & Sync</h2>
                    <p>
                        Your notebooks and workspace documents are stored locally in your browser and synced securely with your account via Supabase PostgreSQL. Private documents remain private unless shared explicitly.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">3. AI Interaction</h2>
                    <p>
                        Prompts sent to Philosopher Bots or AskAI are processed securely using multi-provider AI APIs. Prompts are used solely to generate requested responses and are not retained to train foundation models.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">4. Cookies & Preferences</h2>
                    <p>
                        Essential cookies and local storage are used strictly to preserve your OS desktop layouts, theme preferences, and authentication session.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">5. User Rights & Data Deletion</h2>
                    <p>
                        You have the right to export your workspace data at any time. Account deletion requests permanently remove all associated user records and notebook documents.
                    </p>
                </section>
            </div>
        </div>
    )
}

function DpaContent() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-primary">
            <header className="border-b border-primary pb-4 space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Data Processing Agreement (DPA)</h1>
                <p className="text-xs font-mono text-secondary uppercase">WorldInMaking OS · Standard Contractual Clauses</p>
            </header>

            <div className="space-y-6 text-sm leading-relaxed text-secondary">
                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">1. Overview & Scope</h2>
                    <p>
                        This Data Processing Agreement reflects our commitment to safeguarding personal data in compliance with the General Data Protection Regulation (GDPR) and global data privacy standards.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">2. Data Security & Encryption</h2>
                    <p>
                        All user data in transit is encrypted using modern TLS protocols. Stored data in Supabase PostgreSQL is protected with Row Level Security (RLS) policies and encrypted at rest.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">3. Subprocessors</h2>
                    <p>
                        We engage verified third-party infrastructure providers (e.g. Supabase, Cloudflare, AI LLM providers) under strict data protection terms.
                    </p>
                </section>
            </div>
        </div>
    )
}

function BaaContent() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-primary">
            <header className="border-b border-primary pb-4 space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Business Associate Agreement (BAA)</h1>
                <p className="text-xs font-mono text-secondary uppercase">WorldInMaking OS · Compliance Information</p>
            </header>

            <div className="space-y-6 text-sm leading-relaxed text-secondary">
                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">1. Health Information Security</h2>
                    <p>
                        WorldInMaking OS is designed for philosophical discourse, document editing, and developer productivity. Users should not store unprotected Protected Health Information (PHI) without an enterprise agreement.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-base font-bold text-primary">2. Enterprise Inquiries</h2>
                    <p>
                        For custom enterprise BAA terms or specialized HIPAA-compliant infrastructure configurations, please contact our support team.
                    </p>
                </section>
            </div>
        </div>
    )
}

function SubprocessorsContent() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-primary">
            <header className="border-b border-primary pb-4 space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">List of Subprocessors</h1>
                <p className="text-xs font-mono text-secondary uppercase">WorldInMaking OS · Third-Party Vendors</p>
            </header>

            <div className="space-y-4 text-sm leading-relaxed text-secondary">
                <div className="border border-primary/20 rounded-lg p-4 bg-primary/20 space-y-1">
                    <h3 className="font-bold text-primary">Supabase Inc.</h3>
                    <p className="text-xs text-secondary">Database, authentication, storage, and real-time backend infrastructure.</p>
                </div>
                <div className="border border-primary/20 rounded-lg p-4 bg-primary/20 space-y-1">
                    <h3 className="font-bold text-primary">Cloudflare Inc.</h3>
                    <p className="text-xs text-secondary">Edge compute, CDN caching, DNS, and DDoS security protection.</p>
                </div>
                <div className="border border-primary/20 rounded-lg p-4 bg-primary/20 space-y-1">
                    <h3 className="font-bold text-primary">Google Cloud / DeepMind / Groq</h3>
                    <p className="text-xs text-secondary">AI model execution for Philosopher Bots and notebook writing assistance.</p>
                </div>
            </div>
        </div>
    )
}

export default function Legal({ children, defaultTab = '/terms' }: { children?: React.ReactNode; defaultTab?: string }) {
    const [currentTab, setCurrentTab] = useState(defaultTab)

    return (
        <div className="w-full h-full flex flex-col min-h-0 bg-primary/10">
            <SEO title="Legal Documents" description="Legal documentation, terms, and privacy policy for WorldInMaking." />
            <OSTabs
                padding
                contentPadding={false}
                tabs={[
                    {
                        label: 'Terms',
                        value: '/terms',
                        content: (
                            <ScrollArea className="h-full">
                                {children || <TermsContent />}
                            </ScrollArea>
                        ),
                    },
                    {
                        label: 'Privacy',
                        value: '/privacy',
                        content: (
                            <ScrollArea className="h-full">
                                {children && currentTab === '/privacy' ? children : <PrivacyContent />}
                            </ScrollArea>
                        ),
                    },
                    {
                        label: 'DPA',
                        value: '/dpa',
                        content: (
                            <ScrollArea className="h-full">
                                <DpaContent />
                            </ScrollArea>
                        ),
                    },
                    {
                        label: 'BAA',
                        value: '/baa',
                        content: (
                            <ScrollArea className="h-full">
                                <BaaContent />
                            </ScrollArea>
                        ),
                    },
                    {
                        label: 'Subprocessors',
                        value: '/subprocessors',
                        content: (
                            <ScrollArea className="h-full">
                                <SubprocessorsContent />
                            </ScrollArea>
                        ),
                    },
                ]}
                defaultValue={defaultTab}
                value={currentTab}
                onValueChange={(value) => {
                    setCurrentTab(value)
                }}
                centerTabs
                className="h-full flex flex-col min-h-0"
            />
        </div>
    )
}
