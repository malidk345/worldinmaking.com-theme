import { InsertCommand } from '../../lib/components/MarkdownNotebook/InsertMenu'
import { NotebookComponentProps } from '../../lib/components/MarkdownNotebook/types'

export type MarkdownNotebookInsertMenuApi = {
    insertComponent: (targetNodeId: string, tagName: string, props: NotebookComponentProps) => void
    openAIPrompt?: () => void
}

/** Slash already ships Ask AI (inline). No second entry. */
export function buildExtraInsertCommands(_api?: MarkdownNotebookInsertMenuApi): InsertCommand[] {
    return []
}
