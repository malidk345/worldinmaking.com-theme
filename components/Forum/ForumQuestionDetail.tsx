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
            <div className="h-full overflow-y-auto custom-scrollbar bg-transparent text-primary">
                <div className="max-w-7xl mx-auto px-0 lg:px-4 py-0 lg:py-6">
                    <div className="flex gap-8">
                        {/* Sidebar */}
                        <div className="hidden lg:block w-[220px] flex-shrink-0">
                            <ForumTopicSidebar />
                        </div>

                        {/* Main content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="flex-1 min-w-0"
                        >
                            {/* Question detail card */}
                            <div className="bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-[40px] rounded-[24px] md:rounded-[32px] border border-black/5 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden">
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
