"use client"

import React, { useState } from 'react'
import ForumQuestionCard from './ForumQuestionCard'
import ForumQuestionsTable from './ForumQuestionsTable'
import ForumQuestionForm from './ForumQuestionForm'
import ForumTopicSidebar from './ForumTopicSidebar'
import { ForumQuestion } from './types'
import OSButton from 'components/OSButton'

interface ForumPageLayoutProps {
    questions: ForumQuestion[]
    activeTopicSlug?: string
    title?: string
    loading?: boolean
    activeChannelId?: number | null
    onChannelChange?: (id: number | null) => void
    onSubmit?: (data: { subject: string; body: string; topicId?: number }) => void
}

export default function ForumPageLayout({
    questions,
    activeTopicSlug,
    title = 'community discussions',
    loading = false,
    activeChannelId,
    onChannelChange,
    onSubmit
}: ForumPageLayoutProps) {
    const [sortBy, setSortBy] = useState<'newest' | 'activity' | 'popular'>('newest')

    const sortedQuestions = [...questions].sort((a, b) => {
        if (sortBy === 'newest') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        if (sortBy === 'activity') {
            const aLatest = a.replies.length > 0
                ? new Date(a.replies[a.replies.length - 1].createdAt).getTime()
                : new Date(a.createdAt).getTime()
            const bLatest = b.replies.length > 0
                ? new Date(b.replies[b.replies.length - 1].createdAt).getTime()
                : new Date(b.createdAt).getTime()
            return bLatest - aLatest
        }
        // popular
        const aVotes = a.replies.reduce((sum, r) => sum + r.upvotes, 0)
        const bVotes = b.replies.reduce((sum, r) => sum + r.upvotes, 0)
        return bVotes - aVotes
    })

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 bg-[#fdfdf8] min-h-screen">
            <div className="flex gap-12">
                {/* Sidebar */}
                <div className="hidden lg:block w-60 flex-shrink-0">
                    <ForumTopicSidebar
                        activeTopicSlug={activeTopicSlug}
                        activeChannelId={activeChannelId}
                        onChannelChange={onChannelChange}
                    />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                    {/* Header: Just Sorting & Loading */}
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-black/[0.03]">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/10">
                                {questions.length} entries
                            </span>
                            {loading && (
                                <span className="text-[10px] font-bold italic text-burnt-orange animate-pulse lowercase">
                                    / syncing...
                                </span>
                            )}
                        </div>
                        <div className="flex items-center bg-black/5 p-1 rounded-lg">
                            {(['newest', 'activity', 'popular'] as const).map((sort) => (
                                <button
                                    key={sort}
                                    onClick={() => setSortBy(sort)}
                                    className={`px-3 py-1 text-[10px] font-black tracking-tight transition-all rounded-md lowercase ${sortBy === sort
                                        ? 'bg-black text-white shadow-lg'
                                        : 'text-black/40 hover:text-black'
                                        }`}
                                >
                                    {sort}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* New question form */}
                    <div className="mb-12">
                        <div className="bg-[#fbfcfa] rounded-xl border border-[#e5e7e0] p-1 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                            <ForumQuestionForm onSubmit={onSubmit} className="!mb-0" isInForum={true} />
                        </div>
                    </div>

                    {/* Questions list */}
                    <div className="relative">
                        {loading && questions.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="text-[11px] font-bold lowercase opacity-20 tracking-widest">polling...</div>
                            </div>
                        ) : (
                            <ForumQuestionsTable
                                questions={sortedQuestions}
                                sortBy={sortBy}
                                showTopic
                                showBody
                                showAuthor
                                showStatus
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
