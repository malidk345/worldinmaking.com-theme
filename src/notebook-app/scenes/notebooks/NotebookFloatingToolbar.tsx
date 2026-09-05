import React from 'react'
import OSButton from 'components/OSButton'
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
        <div className="NotebookFloatingToolbar sticky top-2 z-30 flex items-center justify-center w-full my-2 pointer-events-none">
            <div className="NotebookFloatingToolbar__bar pointer-events-auto flex items-center gap-0.5 px-2 py-1 bg-[var(--color-bg-surface-primary,#ffffff)]/92 backdrop-blur-md border border-primary rounded-full shadow-md transition-shadow duration-200 hover:shadow-lg">
                <OSButton
                    zoomHover={false}
                    hover="background"
                    size="sm"
                    variant="default"
                    icon={<IconPlus className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('text-paragraph')}
                    tooltip="Add a block, or press /"
                >
                    <span className="text-xs">Add</span>
                </OSButton>

                <OSButton
                    zoomHover={false}
                    hover="background"
                    size="sm"
                    variant="secondary"
                    icon={<IconSparkles className="w-3.5 h-3.5" />}
                    onClick={onOpenAI}
                    tooltip="Ask AI to write or edit"
                >
                    <span className="text-xs font-medium">Ask AI</span>
                </OSButton>

                <div className="h-4 w-px bg-border mx-1" />

                <OSButton
                    zoomHover={false}
                    hover="background"
                    size="sm"
                    variant="default"
                    icon={<IconPencil className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('text-heading-1')}
                    tooltip="Insert heading"
                >
                    <span className="text-xs hidden sm:inline">Heading</span>
                </OSButton>

                <OSButton
                    zoomHover={false}
                    hover="background"
                    size="sm"
                    variant="default"
                    icon={<IconList className="w-3.5 h-3.5" />}
                    onClick={() => onInsertCommand('media-table')}
                    tooltip="Insert table"
                >
                    <span className="text-xs hidden sm:inline">Table</span>
                </OSButton>
            </div>
        </div>
    )
}