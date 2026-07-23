"use client"

import React, { useState } from 'react'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { IconDocument, IconFolder, IconFolderOpen } from '@posthog/icons';
import { motion, AnimatePresence } from 'framer-motion'

const MOCK_DOSSIERS = [
    {
        id: 'd1',
        title: 'Cybernetics & Society',
        description: 'Exploring the feedback loops between human behavior and algorithmic structures.',
        count: 12,
        files: [
            { id: 'f1', title: 'The Algorithm as an Architect', date: '2025-01-12' },
            { id: 'f2', title: 'Feedback Loops in Social Media', date: '2024-11-05' },
            { id: 'f3', title: 'Norbert Wiener Revisited', date: '2024-10-22' },
        ]
    },
    {
        id: 'd2',
        title: 'Modern Minimums',
        description: 'A study on digital minimalism and brutalist web design.',
        count: 8,
        files: [
            { id: 'f4', title: 'Why Everything Looks the Same', date: '2025-03-01' },
            { id: 'f5', title: 'Brutalism is Back', date: '2025-02-14' },
        ]
    },
    {
        id: 'd3',
        title: 'The AI Apprenticeship',
        description: 'How knowledge workers are adapting to Agentic AI.',
        count: 5,
        files: [
            { id: 'f6', title: 'Pair Programming with Ghosts', date: '2025-05-10' },
            { id: 'f7', title: 'The End of the Junior Developer?', date: '2025-04-20' },
        ]
    }
]

export default function CuratedDossiers() {
    const [activeDossier, setActiveDossier] = useState<string | null>(null)

    return (
        <div className="flex h-full bg-white dark:bg-[#121214] text-primary overflow-hidden">
            {/* Sidebar (Dossier List) */}
            <div className="w-64 border-r border-black/5 dark:border-white/5 flex flex-col bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
                <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/50">
                        DOSSIERS ({MOCK_DOSSIERS.length})
                    </span>
                </div>
                <ScrollArea className="flex-1 p-3 custom-scrollbar">
                    <div className="space-y-1.5">
                        {MOCK_DOSSIERS.map(dossier => (
                            <button
                                key={dossier.id}
                                onClick={() => setActiveDossier(dossier.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-[14px] flex items-center gap-2 text-xs font-semibold transition-all ${
                                    activeDossier === dossier.id
                                    ? 'bg-black/10 dark:bg-white/10 text-primary border border-black/10 dark:border-white/10'
                                    : 'hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-primary'
                                }`}
                            >
                                {activeDossier === dossier.id ? (
                                    <IconFolderOpen className="size-4 shrink-0 text-primary" />
                                ) : (
                                    <IconFolder className="size-4 shrink-0 opacity-70" />
                                )}
                                <span className="truncate flex-1">{dossier.title}</span>
                                <span className="text-[10px] opacity-60 px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full font-mono">
                                    {dossier.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-[#121214] overflow-y-auto custom-scrollbar">
                {activeDossier ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeDossier}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col p-6 md:p-8 max-w-5xl mx-auto w-full"
                        >
                            {/* Detail Header */}
                            <div className="mb-6 pb-4 border-b border-black/5 dark:border-white/5">
                                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-primary mb-2 flex items-center gap-3">
                                    <IconFolderOpen className="size-6 text-primary" />
                                    {MOCK_DOSSIERS.find(d => d.id === activeDossier)?.title}
                                </h2>
                                <p className="text-xs md:text-sm text-secondary/80 leading-relaxed">
                                    {MOCK_DOSSIERS.find(d => d.id === activeDossier)?.description}
                                </p>
                            </div>

                            {/* Dossier Files */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {MOCK_DOSSIERS.find(d => d.id === activeDossier)?.files.map(file => (
                                    <div
                                        key={file.id}
                                        className="group bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm p-5 hover:border-black/15 dark:hover:border-white/15 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <IconDocument className="size-5 opacity-60 group-hover:text-primary transition-colors" />
                                            <span className="text-[10px] font-mono text-secondary">{file.date}</span>
                                        </div>
                                        <h3 className="text-sm font-semibold line-clamp-2 leading-snug text-primary group-hover:underline">
                                            {file.title}
                                        </h3>
                                    </div>
                                ))}

                                {/* Empty Slot for "Add New" */}
                                <div className="border border-dashed border-black/15 dark:border-white/15 p-5 rounded-[24px] flex flex-col items-center justify-center text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer opacity-60 hover:opacity-100 min-h-[120px]">
                                    <div className="size-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                                        <span className="text-lg leading-none">+</span>
                                    </div>
                                    <span className="text-xs font-semibold text-secondary">Curate New Item</span>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <IconFolder className="size-12 mb-3 text-secondary/30" />
                        <h3 className="text-sm font-bold text-primary mb-1">No Dossier Selected</h3>
                        <p className="text-xs text-secondary/70 max-w-sm leading-relaxed">Select a dossier from the sidebar to view your curated collections.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
