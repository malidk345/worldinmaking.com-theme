import React from 'react'
import { LemonButton } from '~nb-lib/lemon-ui/index'
import { IconPlus, IconSparkles, IconList, IconPencil } from '@posthog/icons'

export interface NotebookFloatingToolbarProps {
    onOpenAI: () => void
    onInsertCommand: (commandKey: string) => void
    isEditable?: boolean
}

/** Writing-focused quick tools — no Insights / Data / SQL. */
export function NotebookFloatingToolbar({
    onOpenAI,
    onInsertCommand,
    isEditable = true,
}: NotebookFloatingToolbarProps): JSX.Element | null {
    if (!isEditable) return null

    return (
        <div className="sticky top-2 z-30 flex items-center justify-center w-full my-2 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-1 px-3 py-1.5 bg-[var(--color-bg-surface-primary,#ffffff)]/95 backdrop-blur-md border border-border rounded-full shadow-lg transition-all duration-200 hover:shadow-xl hover:border-accent/40">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider px-1.5 border-r border-border mr-1">
                    Quick Tools
                </span>

                <LemonButton
                    size="small"
                    type="secondary"
                    icon={<IconPlus className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('text-paragraph')}
                    tooltip="Add text block or press '/'"
                >
                    <span className="text-xs">Add block</span>
                </LemonButton>

                <LemonButton
                    size="small"
                    type="secondary"
                    icon={<IconSparkles className="w-3.5 h-3.5" />}
                    onClick={onOpenAI}
                    tooltip="Ask AI to write or edit"
                >
                    <span className="text-xs font-medium">Ask AI</span>
                </LemonButton>

                <div className="h-4 w-px bg-border mx-1" />

                <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconPencil className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('text-heading-1')}
                    tooltip="Insert heading"
                >
                    <span className="text-xs hidden sm:inline">Heading</span>
                </LemonButton>

                <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconList className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('media-table')}
                    tooltip="Insert table"
                >
                    <span className="text-xs hidden sm:inline">Table</span>
                </LemonButton>
            </div>
        </div>
    )
}
