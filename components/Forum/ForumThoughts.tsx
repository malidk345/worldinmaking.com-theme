import React, { useState } from 'react'
import { IconBrain, IconChevronDown, IconChevronRight } from '@posthog/icons'
import { LemonCard, LemonTag } from '@/components/LemonUI'

interface ForumThoughtsProps {
    thoughts: string
}

export default function ForumThoughts({ thoughts }: ForumThoughtsProps) {
    const [isOpen, setIsOpen] = useState(false)

    if (!thoughts) return null

    return (
        <div className="mb-2 w-full">
            <LemonCard
                onClick={() => setIsOpen(!isOpen)}
                className="!p-2 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors cursor-pointer select-none"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium">
                        <IconBrain className="h-3.5 w-3.5 opacity-70" />
                        <span className="lowercase">thoughts</span>
                        <LemonTag type="default">INTEL</LemonTag>
                    </div>
                    {isOpen ? <IconChevronDown className="size-3.5 opacity-50" /> : <IconChevronRight className="size-3.5 opacity-50" />}
                </div>
                {isOpen && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-800 text-[11px] font-mono leading-relaxed italic opacity-85 whitespace-pre-wrap">
                        {thoughts}
                    </div>
                )}
            </LemonCard>
        </div>
    )
}
