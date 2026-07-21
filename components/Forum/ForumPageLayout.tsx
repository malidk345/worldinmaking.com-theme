"use client"

import React, { useState, useMemo } from 'react'
import { LemonSelect } from '@/components/LemonUI'
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
        // ⚡ Bolt: Pre-calculate sorting values to prevent $O(N \log N)$ repeated Date parsing during sort.
        // O(N) map reduces expensive Date instantiations.
        const mappedQuestions = questions.map((q) => {
            const createdAtTime = new Date(q.createdAt).getTime()
            const latestActivityTime = q.replies.length > 0
                ? new Date(q.replies[q.replies.length - 1].createdAt).getTime()
                : createdAtTime
            const totalVotes = q.replies.reduce((sum, r) => sum + r.upvotes, 0)

            return {
                question: q,
                createdAtTime,
                latestActivityTime,
                totalVotes
            }
        })

        return mappedQuestions.sort((a, b) => {
            if (sortBy === 'newest') {
                return b.createdAtTime - a.createdAtTime
            }
            if (sortBy === 'activity') {
                return b.latestActivityTime - a.latestActivityTime
            }
            // popular
            return b.totalVotes - a.totalVotes
        }).map(m => m.question)
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
                            <div className="w-auto">
                                <LemonSelect<'newest' | 'activity' | 'popular'>
                                    value={sortBy}
                                    onChange={(val) => setSortBy(val)}
                                    options={[
                                        { value: 'newest', label: 'newest' },
                                        { value: 'activity', label: 'activity' },
                                        { value: 'popular', label: 'popular' },
                                    ]}
                                    size="small"
                                />
                            </div>
                        </div>

                        {/* Questions list */}
                        <div className="relative mb-8 lg:bg-white lg:dark:bg-[#121214] lg:border lg:border-primary/10 lg:shadow-sm lg:rounded-[24px] lg:p-6">
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
