import React from 'react'
import { LemonButton, LemonTag } from '@posthog/lemon-ui'
import {
    IconPlus,
    IconSparkles,
    IconDatabase,
    IconRewindPlay,
    IconToggle,
    IconCode,
    IconList,
    IconPencil,
    IconFlask,
} from '@posthog/icons'

export interface NotebookFloatingToolbarProps {
    onOpenAI: () => void
    onInsertCommand: (commandKey: string) => void
    isEditable?: boolean
}

export function NotebookFloatingToolbar({
    onOpenAI,
    onInsertCommand,
    isEditable = true,
}: NotebookFloatingToolbarProps): JSX.Element | null {
    if (!isEditable) return null

    return (
        <div className="sticky top-2 z-30 flex items-center justify-center w-full my-2 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-1 px-3 py-1.5 bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md border border-border rounded-full shadow-lg transition-all duration-200 hover:shadow-xl hover:border-accent/40">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider px-1.5 border-r border-border mr-1">
                    Quick Tools
                </span>

                <LemonButton
                    size="small"
                    type="secondary"
                    icon={<IconPlus className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('ask-ai')}
                    tooltip="Add new block or press '/'"
                >
                    <span className="text-xs">Add block</span>
                </LemonButton>

                <LemonButton
                    size="small"
                    type="secondary"
                    icon={<IconSparkles className="w-3.5 h-3.5 text-amber-500" />}
                    onClick={onOpenAI}
                    tooltip="Ask PostHog AI to write or generate queries"
                >
                    <span className="text-xs font-medium">Ask AI</span>
                </LemonButton>

                <div className="h-4 w-px bg-border mx-1" />

                <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconDatabase className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('query-sql')}
                    tooltip="Insert HogQL SQL query table"
                >
                    <span className="text-xs hidden sm:inline">SQL</span>
                </LemonButton>

                <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconRewindPlay className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('data-session-recordings')}
                    tooltip="Insert session recordings playlist"
                >
                    <span className="text-xs hidden sm:inline">Replays</span>
                </LemonButton>

                <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconToggle className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('product-feature-flag')}
                    tooltip="Insert feature flag"
                >
                    <span className="text-xs hidden sm:inline">Flag</span>
                </LemonButton>

                <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconFlask className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('experiment')}
                    tooltip="Insert experiment block"
                >
                    <span className="text-xs hidden md:inline">Experiment</span>
                </LemonButton>

                <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconList className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('media-table')}
                    tooltip="Insert table"
                >
                    <span className="text-xs hidden lg:inline">Table</span>
                </LemonButton>
            </div>
        </div>
    )
}
