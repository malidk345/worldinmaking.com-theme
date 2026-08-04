import React from 'react'
import {
    IconFlask,
    IconGraph,
    IconMessage,
    IconPeople,
    IconRocket,
    IconToggle,
    IconSparkles,
} from '@posthog/icons'
import { COMMON_INSERT_COMMAND_CATEGORY } from '../../lib/components/MarkdownNotebook/InsertMenu'
import { InsertCommand } from '../../lib/components/MarkdownNotebook/editorTypes'
import { NotebookComponentProps } from '../../lib/components/MarkdownNotebook/types'
import { uuid } from '../../lib/utils/dom'

export type MarkdownNotebookInsertMenuApi = {
    insertComponent: (targetNodeId: string, tagName: string, props: NotebookComponentProps) => void
    openAIPrompt?: () => void
}

export function buildExtraInsertCommands(api?: MarkdownNotebookInsertMenuApi): InsertCommand[] {
    const productCommand = (
        key: string,
        label: string,
        icon: JSX.Element,
        tagName: string,
        aliases?: string[],
        defaultProps?: NotebookComponentProps
    ): InsertCommand => ({
        key,
        label,
        category: 'Products',
        icon,
        aliases,
        run: (targetNodeId) => {
            if (api?.insertComponent) {
                api.insertComponent(targetNodeId, tagName, defaultProps || { nodeId: uuid() })
            }
        },
    })

    return [
        {
            key: 'ask-ai',
            label: 'Ask PostHog AI...',
            category: COMMON_INSERT_COMMAND_CATEGORY || 'Common',
            description: 'Ask AI to write or edit this notebook',
            aliases: ['ai', 'ask', 'posthog ai', 'generate', 'write', 'sparkles'],
            icon: <IconSparkles />,
            run: (targetNodeId) => {
                if (api?.insertComponent) {
                    api.insertComponent(targetNodeId, 'Prompt', { question: '' })
                } else if (api?.openAIPrompt) {
                    api.openAIPrompt()
                }
            },
        },
        productCommand('query-saved-insight', 'Saved insight', <IconGraph />, 'Query', ['insight']),
        productCommand('experiment', 'Experiment', <IconFlask />, 'Experiment', ['ab test']),
        productCommand('product-feature-flag', 'Feature flag', <IconToggle />, 'FeatureFlag', ['flag']),
        productCommand('product-survey', 'Survey', <IconMessage />, 'Survey'),
        productCommand('product-early-access-feature', 'Early access feature', <IconRocket />, 'EarlyAccessFeature'),
        productCommand('product-cohort', 'Cohort', <IconPeople />, 'Cohort'),
    ]
}
