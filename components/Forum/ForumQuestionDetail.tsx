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
            {/* iOS 26 Aesthetic Updates: Removing solid bg colors here to allow outer wrapper/window to style the background or handle translucent styling if needed, matching modern minimalistic aesthetics */}
            <div className="h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900 text-primary">
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
                            <div className="w-full">
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
