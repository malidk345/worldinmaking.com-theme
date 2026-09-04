import { IconComment, IconDocument, IconPeople } from '@posthog/icons'

import type { InsertCommand, MarkdownNotebookInsertMenuApi } from '../../lib/components/MarkdownNotebook/editorTypes'
import { COMMON_INSERT_COMMAND_CATEGORY } from '../../lib/components/MarkdownNotebook/InsertMenu'
import { createNotebook } from './notebookStorage'

/**
 * Slash extras that are not a registry `insertCommand`.
 * Page creates a notebook then inserts `<SubPage />`.
 * Comment / Philosopher / Invite open pickers instead of dropping a tag.
 */
export function buildExtraInsertCommands(api?: MarkdownNotebookInsertMenuApi): InsertCommand[] {
    if (!api) return []
    const commands: InsertCommand[] = [

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
    if (api.openInlineComment) {
        commands.unshift({
            key: 'inline-comment',
            label: 'Comment',
            category: COMMON_INSERT_COMMAND_CATEGORY,
            description: 'Discussion thread on this block',
            aliases: ['comment', 'yorum', 'thread', 'discussion'],
            icon: <IconComment />,
            closeOnRun: false,
            run: (targetNodeId) => api.openInlineComment?.(targetNodeId),
        })
    }
    if (api.openPhilosopherInvite) {
        commands.unshift({
            key: 'invite-philosophers',
            label: 'Philosopher',
            category: COMMON_INSERT_COMMAND_CATEGORY,
            description: 'Invite philosophers to leave notes on this page',
            aliases: ['filozof', 'philosopher'],
            icon: <IconPeople />,
            closeOnRun: false,
            run: (targetNodeId) => api.openPhilosopherInvite?.(targetNodeId),
        })
    }
    if (api.openPeopleInvite) {
        commands.unshift({
            key: 'invite-people',
            label: 'Invite',
            category: COMMON_INSERT_COMMAND_CATEGORY,
            description: 'Invite a person to write on this notebook',
            aliases: ['invite', 'davet', 'share', 'people', 'kisi', 'kişi'],
            icon: <IconPeople />,
            closeOnRun: true,
            run: (_targetNodeId) => api.openPeopleInvite?.(),
        })
    }
    return commands
}
