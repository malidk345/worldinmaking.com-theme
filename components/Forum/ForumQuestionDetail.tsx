"use client"

import React from 'react'
import ForumQuestionCard from './ForumQuestionCard'
import ForumTopicSidebar from './ForumTopicSidebar'
import { ForumQuestion } from './types'
import Link from 'components/Link'
import { ArrowLeft } from 'lucide-react'
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
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex gap-8">
                    {/* Sidebar */}
                    <div className="hidden lg:block w-[220px] flex-shrink-0">
                        <ForumTopicSidebar
                            activeTopicSlug={question.topics[0]?.slug}
                        />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                        {/* Breadcrumb */}
                        <div className="mb-6">
                            <Link
                                to="/questions"
                                className="flex items-center text-[11px] font-black text-black/40 hover:text-burnt-orange transition-colors !no-underline lowercase tracking-tight"
                            >
                                <ArrowLeft className="size-3 mr-1.5" />
                                back to transmissions
                            </Link>
                        </div>

                        {/* Question detail card */}
                        <div className="bg-[#fbfcfa] rounded-xl border border-black/[0.03] shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                            <ForumQuestionCard
                                question={question}
                                isInForum
                                showSlug
                                expanded
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
