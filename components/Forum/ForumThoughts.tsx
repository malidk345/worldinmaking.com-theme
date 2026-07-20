import React from 'react'
import { IconBrain } from '@posthog/icons'
import { LemonCollapse, LemonTag } from '@/components/LemonUI'

interface ForumThoughtsProps {
    thoughts: string
}

export default function ForumThoughts({ thoughts }: ForumThoughtsProps) {
    if (!thoughts) return null

    return (
        <div className="mb-2 w-full">
            <LemonCollapse
                defaultOpen={false}
                title={
                    <div className="flex items-center gap-2">
                        <IconBrain className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-semibold text-xs lowercase">thoughts</span>
                        <LemonTag type="primary">INTEL</LemonTag>
                    </div>
                }
            >
                <div className="text-xs leading-relaxed italic text-slate-700 dark:text-slate-200">
                    {thoughts}
                </div>
            </LemonCollapse>
        </div>
    )
}
