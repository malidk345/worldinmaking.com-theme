"use client"

import React, { useState } from 'react'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { IconBookmark, IconDocument, IconExternal } from '@posthog/icons';

const MOCK_NOTES = [
    {
        id: '1',
        articleTitle: 'The Future of Agentic AI',
        articleUrl: '/posts/future-agentic-ai',
        note: 'This connects deeply with the "SuperWorker" concept from our 2026 strategy. If AI takes over the scaffolding, human value moves entirely to curation and taste.',
        date: '2025-05-10',
        tags: ['ai', 'strategy']
    },
    {
        id: '2',
        articleTitle: 'Minimalist Architecture in Digital Spaces',
        articleUrl: '/posts/minimalist-architecture',
        note: 'Notice how the author emphasizes negative space. We should apply this to the WindowContext constraints—maybe add a "zen mode" that hides the taskbar.',
        date: '2025-05-14',
        tags: ['design', 'ui']
    },
    {
        id: '3',
        articleTitle: 'Tokenizing Invisible Labor',
        articleUrl: '/posts/tokenizing-invisible-labor',
        note: 'Fascinating read. It solves the open-source maintenance problem, but I wonder about the bureaucratic overhead of tracking every micro-interaction.',
        date: '2025-05-16',
        tags: ['web3', 'economics']
    }
]

export default function Marginalia() {
    const [filter, setFilter] = useState<string>('')

    const filteredNotes = filter
        ? MOCK_NOTES.filter(n => n.tags.includes(filter) || n.articleTitle.toLowerCase().includes(filter.toLowerCase()))
        : MOCK_NOTES

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-[#121214] text-primary">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
                {/* Header / Toolbar */}
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/50">
                            MARGINALIA ARCHIVE ({filteredNotes.length})
                        </span>
                    </div>
                    <input
                        type="text"
                        placeholder="Search notes or tags..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="text-xs px-3 py-1.5 border border-black/10 dark:border-white/10 rounded-full bg-black/5 dark:bg-white/5 focus:outline-none w-48 text-primary placeholder:text-secondary/50"
                    />
                </div>

                <div className="space-y-4">
                    {filteredNotes.length === 0 ? (
                        <div className="text-center py-12 text-xs text-secondary">
                            No notes found matching your filter.
                        </div>
                    ) : (
                        filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                className="group bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm p-5 md:p-6 transition-all"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <a
                                        href={note.articleUrl}
                                        className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline"
                                    >
                                        <IconDocument className="size-4 opacity-70" />
                                        {note.articleTitle}
                                        <IconExternal className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                    <span className="text-[10px] font-mono text-secondary px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full">
                                        {note.date}
                                    </span>
                                </div>

                                <p className="text-xs md:text-sm leading-relaxed text-secondary/90 italic my-3">
                                    &ldquo;{note.note}&rdquo;
                                </p>

                                <div className="mt-3 flex gap-2">
                                    {note.tags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setFilter(tag)}
                                            className="text-[10px] font-mono px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-secondary hover:text-primary"
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
