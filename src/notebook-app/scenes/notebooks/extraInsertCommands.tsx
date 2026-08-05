import React from 'react'
import { IconSparkles } from '@posthog/icons'
import { InsertCommand, COMMON_INSERT_COMMAND_CATEGORY } from '../../lib/components/MarkdownNotebook/InsertMenu'
import { NotebookComponentProps } from '../../lib/components/MarkdownNotebook/types'

export type MarkdownNotebookInsertMenuApi = {
    insertComponent: (targetNodeId: string, tagName: string, props: NotebookComponentProps) => void
    openAIPrompt?: () => void
}

/**
 * WorldInMaking slash extras: writing / AI only.
 * Insights, Data, SQL, and PostHog product analytics blocks are intentionally omitted.
 */
export function buildExtraInsertCommands(api?: MarkdownNotebookInsertMenuApi): InsertCommand[] {
    return [
        {
            key: 'ask-ai',
            label: 'Ask AI...',
            category: COMMON_INSERT_COMMAND_CATEGORY || 'Common',
            description: 'Ask a philosopher bot to write or edit this notebook',
            aliases: ['ai', 'ask', 'generate', 'write', 'sparkles', 'philosopher'],
            icon: <IconSparkles />,
            run: (_targetNodeId) => {
                if (api?.openAIPrompt) {
                    api.openAIPrompt()
                } else if (api?.insertComponent) {
                    api.insertComponent(_targetNodeId, 'Prompt', { question: '' } as NotebookComponentProps)
                }
            },
        },
    ]
}
