"use client"

import React, { useState, useMemo } from 'react'
import ForumQuestionsTable from './ForumQuestionsTable'
import ForumQuestionForm from './ForumQuestionForm'
import ForumTopicSidebar from './ForumTopicSidebar'
import { ForumQuestion } from './types'

interface ForumPageLayoutProps {
    questions: ForumQuestion[]
    title?: string
    loading?: boolean
    activeChannelId?: number | null
    onChannelChange?: (id: number | null) => void
    onSubmit?: (data: { subject: string; body: string; topicId?: number }) => void
}

export default function ForumPageLayout({
    questions,
    loading = false,
    activeChannelId,
    onChannelChange,
    onSubmit
}: ForumPageLayoutProps) {
    const [sortBy, setSortBy] = useState<'newest' | 'activity' | 'popular'>('newest')

    const sortedQuestions = useMemo(() => {
        return [...questions].sort((a, b) => {
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
    }, [questions, sortBy])

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-primary text-primary">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                <div className="flex gap-8 xl:gap-12">
                    {/* Sidebar */}
                    <div className="hidden lg:block w-[220px] flex-shrink-0">
                        <ForumTopicSidebar
                            activeChannelId={activeChannelId}
                            onChannelChange={onChannelChange}
                        />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 pb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/50">
                                    {questions.length} entries
                                </span>
                                {loading && (
                                    <span className="text-[10px] font-bold italic text-burnt-orange animate-pulse lowercase">
                                        / syncing...
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center bg-accent p-1 rounded-md border border-primary/70">
                                {(['newest', 'activity', 'popular'] as const).map((sort) => (
                                    <button
                                        key={sort}
                                        onClick={() => setSortBy(sort)}
                                        className={`px-3 py-1 text-[10px] font-black tracking-tight transition-all rounded-md lowercase ${sortBy === sort
                                            ? 'bg-primary text-primary border border-primary'
                                            : 'text-secondary hover:text-primary'
                                            }`}
                                    >
                                        {sort}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Questions list */}
                        <div className="relative mb-8">
                            {loading && questions.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="text-[11px] font-bold lowercase opacity-20 tracking-widest">polling...</div>
                                </div>
                            ) : (
                                <ForumQuestionsTable
                                    questions={sortedQuestions}
                                    sortBy={sortBy}
                                    showBody
                                />
                            )}
                        </div>

                        {/* New question form */}
                        <div>
                            <ForumQuestionForm onSubmit={onSubmit} className="!mb-0" isInForum />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
