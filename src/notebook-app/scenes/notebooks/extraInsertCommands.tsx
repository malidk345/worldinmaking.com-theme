import { IconDocument, IconPeople } from '@posthog/icons'

import { COMMON_INSERT_COMMAND_CATEGORY, InsertCommand } from '../../lib/components/MarkdownNotebook/InsertMenu'
import { NotebookComponentProps } from '../../lib/components/MarkdownNotebook/types'
import { createNotebook } from './notebookStorage'

export type MarkdownNotebookInsertMenuApi = {
    insertComponent: (targetNodeId: string, tagName: string, props: NotebookComponentProps) => void
    openAIPrompt?: () => void
    openPhilosopherInvite?: (targetNodeId: string) => void
}

/** Slash already ships WIM AI (inline editor). Page creates a real child notebook. */
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
    if (api.openPhilosopherInvite) {
        commands.unshift({
            key: 'invite-philosophers',
            label: 'Invite',
            category: COMMON_INSERT_COMMAND_CATEGORY,
            description: 'Invite philosophers to leave their own notes',
            aliases: ['invite', 'filozof', 'philosopher', 'davet', 'yorum', 'comment'],
            icon: <IconPeople />,
            closeOnRun: false,
            run: (targetNodeId) => api.openPhilosopherInvite?.(targetNodeId),
        })
    }
    return commands
}
