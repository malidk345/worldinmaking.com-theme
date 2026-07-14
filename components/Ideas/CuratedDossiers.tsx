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
        <div className="flex h-full bg-white dark:bg-[#1a1a1a] text-black dark:text-white overflow-hidden">
            {/* Sidebar (Dossier List) */}
            <div className="w-64 border-r border-black/10 dark:border-white/10 flex flex-col bg-black/5 dark:bg-white/5 shrink-0">
                <div className="p-3 border-b border-black/10 dark:border-white/10 flex items-center gap-2">
                    <IconFolder className="size-4" />
                    <span className="font-semibold text-sm">My Dossiers</span>
                </div>
                <ScrollArea className="flex-1 p-2">
                    <div className="space-y-1">
                        {MOCK_DOSSIERS.map(dossier => (
                            <button
                                key={dossier.id}
                                onClick={() => setActiveDossier(dossier.id)}
                                className={`w-full text-left px-3 py-2 rounded-sm flex items-center gap-2 text-sm transition-colors ${
                                    activeDossier === dossier.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                            >
                                {activeDossier === dossier.id ? (
                                    <IconFolderOpen className="size-4 shrink-0" />
                                ) : (
                                    <IconFolder className="size-4 shrink-0 opacity-70" />
                                )}
                                <span className="truncate flex-1">{dossier.title}</span>
                                <span className="text-[10px] opacity-50 px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded-full">
                                    {dossier.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-[#141414]">
                {activeDossier ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeDossier}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col h-full"
                        >
                            {/* Dossier Header */}
                            <div className="p-6 border-b border-black/10 dark:border-white/10">
                                <h2 className="text-2xl font-bold font-serif mb-2 flex items-center gap-3">
                                    <IconFolderOpen className="size-6 text-primary" />
                                    {MOCK_DOSSIERS.find(d => d.id === activeDossier)?.title}
                                </h2>
                                <p className="text-sm opacity-70">
                                    {MOCK_DOSSIERS.find(d => d.id === activeDossier)?.description}
                                </p>
                            </div>

                            {/* Dossier Files */}
                            <ScrollArea className="flex-1 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {MOCK_DOSSIERS.find(d => d.id === activeDossier)?.files.map(file => (
                                        <div
                                            key={file.id}
                                            className="group border border-black/10 dark:border-white/10 p-4 rounded-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer bg-black/[0.02] dark:bg-white/[0.02]"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <IconDocument className="size-5 opacity-60 group-hover:text-primary transition-colors" />
                                                <span className="text-[10px] opacity-40 font-mono">{file.date}</span>
                                            </div>
                                            <h3 className="text-sm font-medium line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                                {file.title}
                                            </h3>
                                        </div>
                                    ))}

                                    {/* Empty Slot for "Add New" */}
                                    <div className="border border-dashed border-black/20 dark:border-white/20 p-4 rounded-sm flex flex-col items-center justify-center text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer opacity-50 hover:opacity-100 min-h-[120px]">
                                        <div className="size-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                                            <span className="text-xl leading-none">+</span>
                                        </div>
                                        <span className="text-xs font-medium">Curate New Item</span>
                                    </div>
                                </div>
                            </ScrollArea>
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-8">
                        <IconFolder className="size-16 mb-4 opacity-20" />
                        <h3 className="text-lg font-medium mb-2">No Dossier Selected</h3>
                        <p className="text-sm max-w-sm">Select a dossier from the sidebar to view your curated collections, or create a new one to start organizing.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
