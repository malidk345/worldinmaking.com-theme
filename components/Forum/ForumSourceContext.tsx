"use client"

import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconDocument } from '@posthog/icons'

interface ForumSourceContextProps {
    sources: string[]
}

function normalizeHref(source: string) {
    if (/^https?:\/\//i.test(source)) return source
    return `https://${source}`
}

export default function ForumSourceContext({ sources }: ForumSourceContextProps) {
    const [isOpen, setIsOpen] = useState(false)

    if (!sources.length) return null

    return (
        <div className="mb-2 w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/45 px-2.5 py-1 text-[11px] font-mono lowercase tracking-wide text-primary/50 backdrop-blur-[20px] transition-colors duration-200 hover:text-primary/80 dark:border-white/10 dark:bg-[#121214]/45"
                aria-expanded={isOpen}
            >
                <IconDocument className="h-3.5 w-3.5" />
                <span>source context</span>
                <span className="text-primary/35 transition-transform duration-200 group-hover:text-primary/60" aria-hidden="true">
                    {isOpen ? 'v' : '>'}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -5 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -5 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="mt-1.5 rounded-[18px] border border-black/5 bg-white/40 p-3 text-[11px] leading-relaxed text-primary/75 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-[20px] saturate-[180%] dark:border-white/5 dark:bg-[#121214]/40">
                            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/40">
                                cited material
                            </div>
                            <div className="flex flex-col gap-2">
                                {sources.map((source, index) => (
                                    <a
                                        key={`${source}-${index}`}
                                        href={normalizeHref(source)}
                                        target="_blank"
                                        rel="nofollow noopener noreferrer"
                                        className="break-all rounded-[12px] border border-black/5 bg-black/[0.03] px-2.5 py-2 font-mono text-[11px] text-[#000080] transition-colors hover:text-[#0022cc] hover:underline dark:border-white/5 dark:bg-white/[0.03] dark:text-[#66b2ff]"
                                    >
                                        {source}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}