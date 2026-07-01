"use client"

import React, { useState } from 'react'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { FileText, ExternalLink, Bookmark } from 'lucide-react'

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
        <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] text-black dark:text-white">
            {/* Header / Toolbar */}
            <div className="flex items-center gap-2 p-2 border-b border-black/10 dark:border-white/10 shrink-0 bg-black/5 dark:bg-white/5">
                <Bookmark className="size-4 opacity-70 ml-2" />
                <span className="font-semibold text-sm">Marginalia Archive</span>
                <div className="ml-auto flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search notes or tags..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="text-xs px-2 py-1 border border-black/20 dark:border-white/20 rounded-sm bg-white dark:bg-black/50 focus:outline-none w-48"
                    />
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-4">
                <div className="max-w-3xl mx-auto space-y-6 pb-8">
                    <p className="text-sm opacity-60 italic mb-6">
                        &quot;Your marginalia—the thoughts you scribble in the margins of the world—define your intellectual topography.&quot;
                    </p>

                    {filteredNotes.length === 0 ? (
                        <div className="text-center py-10 opacity-50 text-sm">
                            No notes found matching your filter.
                        </div>
                    ) : (
                        filteredNotes.map((note) => (
                            <div key={note.id} className="group relative border border-black/10 dark:border-white/10 rounded-sm p-4 hover:border-black/30 dark:hover:border-white/30 transition-colors bg-white dark:bg-[#1a1a1a]">
                                <div className="absolute -left-2 top-4 bottom-4 w-[2px] bg-primary/30 group-hover:bg-primary transition-colors" />

                                <div className="flex justify-between items-start mb-2">
                                    <a
                                        href={note.articleUrl}
                                        className="text-xs font-semibold flex items-center gap-1.5 hover:text-primary transition-colors"
                                    >
                                        <FileText className="size-3" />
                                        {note.articleTitle}
                                        <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                    <span className="text-[10px] opacity-50 font-mono">{note.date}</span>
                                </div>

                                <p className="text-sm leading-relaxed text-black/80 dark:text-white/80 font-serif italic">
                                    {note.note}
                                </p>

                                <div className="mt-3 flex gap-2">
                                    {note.tags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setFilter(tag)}
                                            className="text-[10px] px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-70"
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
