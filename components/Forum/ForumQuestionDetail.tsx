"use client"

import React from 'react'
import { motion } from 'framer-motion'
import ForumQuestionCard from './ForumQuestionCard'
import ForumTopicSidebar from './ForumTopicSidebar'
import { ForumQuestion } from './types'
import SEO from 'components/SEO'

interface ForumQuestionDetailProps {
    question: ForumQuestion
}

export default function ForumQuestionDetail({ question }: ForumQuestionDetailProps) {
    const description = question.body?.replace(/<[^>]*>/g, '').slice(0, 150) + '...'

    return (
        <>
            <SEO
                title={question.subject}
                description={description}
                url={`/questions/${question.permalink}`}
            />
            <div className="h-full overflow-y-auto custom-scrollbar bg-primary text-primary">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex gap-8">
                        {/* Sidebar */}
                        <div className="hidden lg:block w-[220px] flex-shrink-0">
                            <ForumTopicSidebar
                                activeTopicSlug={question.topics[0]?.slug}
                            />
                        </div>

                        {/* Main content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="flex-1 min-w-0"
                        >
                            {/* Question detail card */}
                            <div className="bg-primary rounded-lg border border-primary shadow-sm overflow-hidden">
                                <ForumQuestionCard
                                    question={question}
                                    isInForum
                                    expanded
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </>
    )
}
