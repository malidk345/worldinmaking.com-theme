import React from 'react'
import type { NotebookPerson } from '../../../lib/notebook-actor'
import type { NotebookPresencePerson } from './notebookPresence'
import type { NotebookChromeSyncStatus } from './NotebookMeta'
import { CollaboratorsBanner } from './CollaboratorsBanner'

export function NotebookEditorToolbar({
    syncStatus,
    cloudMessage,
    onRetrySync,
    person,
    createdBy,
    markdown,
    updatedAt,
    notebookId,
    livePeople,
    onOpenAskAi,
    canGoBack,
    canGoForward,
    onBack,
    onForward,
}: {
    syncStatus: NotebookChromeSyncStatus
    cloudMessage?: string
    onRetrySync?: () => void
    person?: NotebookPerson | null
    createdBy?: NotebookPerson | null
    markdown?: string
    updatedAt?: string
    notebookId?: string
    livePeople?: NotebookPresencePerson[]
    onOpenAskAi?: () => void
    canGoBack?: boolean
    canGoForward?: boolean
    onBack?: () => void
    onForward?: () => void
}): JSX.Element {
    return (
        <CollaboratorsBanner
            person={person}
            createdBy={createdBy}
            markdown={markdown}
            updatedAt={updatedAt}
            syncStatus={syncStatus}
            cloudMessage={cloudMessage}
            onRetrySync={onRetrySync}
            notebookId={notebookId}
            livePeople={livePeople}
            onOpenAskAi={onOpenAskAi}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onBack={onBack}
            onForward={onForward}
        />
    )
}
