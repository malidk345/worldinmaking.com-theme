import { IconDocument } from '@posthog/icons'

import type { InsertCommand, MarkdownNotebookInsertMenuApi } from '../../lib/components/MarkdownNotebook/editorTypes'
import { COMMON_INSERT_COMMAND_CATEGORY } from '../../lib/components/MarkdownNotebook/InsertMenu'
import { createNotebook } from './notebookStorage'

/**
 * Slash extras that are not a registry `insertCommand`.
 * Page creates a notebook then inserts `<SubPage />`.
 * Comment, invite, and philosopher stay on the block/share chrome — not in `/`.
 */
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
