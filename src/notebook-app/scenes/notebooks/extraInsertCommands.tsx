import { IconDocument } from '@posthog/icons'

import { COMMON_INSERT_COMMAND_CATEGORY, InsertCommand } from '../../lib/components/MarkdownNotebook/InsertMenu'
import { NotebookComponentProps } from '../../lib/components/MarkdownNotebook/types'
import { createNotebook } from './notebookStorage'

export type MarkdownNotebookInsertMenuApi = {
    insertComponent: (targetNodeId: string, tagName: string, props: NotebookComponentProps) => void
    openAIPrompt?: () => void
}

/** Slash already ships WIM AI (inline editor). Page creates a real child notebook. */
export function buildExtraInsertCommands(api?: MarkdownNotebookInsertMenuApi): InsertCommand[] {
    if (!api) return []
    return [
        {
            key: 'page-subpage',
            label: 'Page',
            category: COMMON_INSERT_COMMAND_CATEGORY,
            description: 'Open a linked sub-document',
            aliases: ['subpage', 'card', 'nested', 'page'],
            icon: <IconDocument />,
            run: (targetNodeId) => {
                const notebook = createNotebook('Untitled page', '')
                api.insertComponent(targetNodeId, 'SubPage', {
                    notebookId: notebook.id,
                    title: notebook.title,
                })
            },
        },
    ]
}
