import React from 'react'
import ReaderView from 'components/ReaderView'
import Link from 'components/Link'
import { motion } from 'framer-motion'
import CommunityQuestions from 'components/CommunityQuestions'

export default function WorldInMakingHome() {
    return (
        <ReaderView
            title="World in Making"
            location={{ pathname: '/' }}
        >
            <div className="max-w-4xl mx-auto py-8 px-4 font-sans text-primary">
                {/* Hero Header */}
                <header className="mb-12 border-b border-border pb-8">
                    <motion.h1 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4"
                    >
                        World in Making
                    </motion.h1>
                    <p className="text-xl md:text-2xl text-secondary font-medium leading-relaxed">
                        A collaborative canvas for human agency, artificial intelligence, and open creation.
                    </p>
                </header>

                {/* Manifesto Body / Content */}
                <article className="prose dark:prose-invert max-w-none text-base md:text-lg leading-relaxed space-y-8">
                    <section className="bg-accent/30 p-6 rounded-xl border border-border">
                        <h2 className="text-2xl font-bold mb-3 mt-0">The Vision</h2>
                        <p className="m-0 text-secondary">
                            We believe technology should expand human intelligence, not replace human intentionality. 
                            World in Making is an open system designed for deep inquiry, computational creativity, 
                            and meaningful human-AI interaction.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold">Core Pillars</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose">
                            <div className="p-6 rounded-xl border border-border bg-primary/40">
                                <div className="text-2xl mb-2">⚡</div>
                                <h3 className="text-lg font-bold mb-2">Agency Over Automation</h3>
                                <p className="text-sm text-secondary m-0">
                                    Tools should empower individuals to think, build, and express themselves with clarity.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl border border-border bg-primary/40">
                                <div className="text-2xl mb-2">🌐</div>
                                <h3 className="text-lg font-bold mb-2">Open Discourse</h3>
                                <p className="text-sm text-secondary m-0">
                                    A community-driven space where philosophy, engineering, and art intersect naturally.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl border border-border bg-primary/40">
                                <div className="text-2xl mb-2">🔮</div>
                                <h3 className="text-lg font-bold mb-2">Symbiotic AI</h3>
                                <p className="text-sm text-secondary m-0">
                                    AI models configured as dialogue partners and creative collaborators, not black boxes.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl border border-border bg-primary/40">
                                <div className="text-2xl mb-2">🎨</div>
                                <h3 className="text-lg font-bold mb-2">OS Design System</h3>
                                <p className="text-sm text-secondary m-0">
                                    A desktop-inspired interface where every article, notebook, and topic is an open window.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Community Discussions */}
                    <section className="pt-8 border-t border-border not-prose">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold m-0">Recent Discussions</h2>
                                <p className="text-sm text-secondary m-0">Engage with the community on topics of agency, tech, and intelligence.</p>
                            </div>
                            <Link to="/questions" className="text-sm font-semibold text-accent hover:underline">
                                View all →
                            </Link>
                        </div>
                        <CommunityQuestions />
                    </section>
                </article>
            </div>
        </ReaderView>
    )
}
