import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconBrain } from '@posthog/icons'

interface ForumThoughtsProps {
    thoughts: string
}

export default function ForumThoughts({ thoughts }: ForumThoughtsProps) {
    const [isOpen, setIsOpen] = useState(false)

    if (!thoughts) return null

    return (
        <div className="mb-2 w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 text-[11px] font-mono lowercase tracking-wide text-primary/40 hover:text-primary/70 transition-colors duration-200"
                aria-expanded={isOpen}
            >
                <IconBrain className="w-3.5 h-3.5" />
                <span>{isOpen ? 'hide thoughts' : 'show thoughts'}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -5 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -5 }}
                        transition={{
                            duration: 0.25,
                            ease: [0.16, 1, 0.3, 1] // Micro-Kinetic Spring
                        }}
                        className="overflow-hidden"
                    >
                        <div className="mt-1.5 p-3 rounded-[18px] bg-white/40 dark:bg-[#121214]/40 backdrop-blur-[20px] saturate-[180%] border border-black/5 dark:border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] text-[11px] leading-relaxed italic text-primary/70 mb-2">
                            {thoughts}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
