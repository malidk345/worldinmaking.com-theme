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
            <div className="pointer-events-auto flex items-center gap-0.5 px-2 py-1 bg-[var(--color-bg-surface-primary,#ffffff)]/92 backdrop-blur-md border border-border rounded-full shadow-md transition-shadow duration-200 hover:shadow-lg">
                <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconPlus className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('text-paragraph')}
                    tooltip="Add a block, or press /"
                >
                    <span className="text-xs">Add</span>
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
