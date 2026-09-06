import { useEffect, useMemo, useState } from 'react'
import { IconChat, IconChevronLeft, IconChevronRight } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { Popover } from 'components/RadixUI/Popover'
import Avatar from 'components/Squeak/components/Avatar'
import type { NotebookPerson } from '../../../lib/notebook-actor'
import { formatEditedAgo, getNotebookActor } from '../../../lib/notebook-actor'
import { fetchNotebookPeople } from '../../../lib/notebook-collaborators-client'
import { getNotebookHistory } from './notebookStorage'
import type { NotebookPresencePerson } from './notebookPresence'
import { NotebookSyncInfo, type NotebookChromeSyncStatus } from './NotebookMeta'
import {
    collectLocalNotebookFaces,
    facesFromCollaborators,
    facesFromPresence,
    mergeNotebookFaces,
    notebookFaceRoleLabel,
    personDisplayName,
    type NotebookFace,
} from './notebookFaces'
import { NotebookFaceStack } from './NotebookFaceStack'

interface CollaboratorsBannerProps {
    person?: NotebookPerson | null
    createdBy?: NotebookPerson | null
    markdown?: string
    updatedAt?: string
    syncStatus?: NotebookChromeSyncStatus
    cloudMessage?: string
    onRetrySync?: () => void
    notebookId?: string
    livePeople?: NotebookPresencePerson[]
    onOpenAskAi?: () => void
    canGoBack?: boolean
    canGoForward?: boolean
    onBack?: () => void
    onForward?: () => void
}

export function CollaboratorsBanner({
    person,
    createdBy,
    markdown,
    updatedAt,
    syncStatus = 'saved',
    cloudMessage,
    onRetrySync,
    notebookId,
    livePeople = [],
    onOpenAskAi,
    canGoBack = false,
    canGoForward = false,
    onBack,
    onForward,
}: CollaboratorsBannerProps) {
    const actor = person || createdBy || getNotebookActor()
    const displayName = personDisplayName(actor)
    const when = formatEditedAgo(updatedAt)
    const [sharedFaces, setSharedFaces] = useState<NotebookFace[]>([])

    const localFaces = useMemo(
        () =>
            collectLocalNotebookFaces({
                createdBy: createdBy || actor,
                lastModifiedBy: person,
                markdown,
            }),
        [createdBy, person, actor, markdown]
    )

    useEffect(() => {
        if (!notebookId) {
            setSharedFaces([])
            return
        }
        let cancelled = false
        const ownerKey = localFaces[0]?.key
        fetchNotebookPeople(notebookId).then((result) => {
            if (cancelled || !result) return
            setSharedFaces(facesFromCollaborators(result.collaborators, ownerKey))
        })
        return () => {
            cancelled = true
        }
    }, [notebookId, localFaces])

    const faces = useMemo(() => {
        const merged = mergeNotebookFaces(localFaces, sharedFaces)
        const skip = new Set(merged.map((face) => face.key))
        return mergeNotebookFaces(merged, facesFromPresence(livePeople, skip))
    }, [localFaces, sharedFaces, livePeople])

    const activities = useMemo(() => {
        if (!notebookId) return []
        return getNotebookHistory(notebookId)
            .slice()
            .reverse()
            .slice(0, 8)
            .map((entry, index) => ({
                id: `${entry.timestamp}-${index}`,
                label: entry.label || 'Edited notebook',
                time: formatEditedAgo(entry.timestamp),
                name: entry.author ? personDisplayName(entry.author) : displayName,
                avatar: entry.author?.avatar_url || actor.avatar_url,
            }))
    }, [notebookId, updatedAt, displayName, actor.avatar_url])

    const overlay = (
        <div className="w-80 p-1 text-xs">
            <div className="space-y-2 max-h-72 overflow-y-auto">
                <div>
                    <p className="m-0 px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        People
                    </p>
                    {faces.length === 0 ? (
                        <p className="text-muted m-0 px-1">Just you on this page.</p>
                    ) : (
                        faces.map((face) => (
                            <div key={face.key} className="flex items-center gap-2 p-1.5 rounded-sm">
                                <div className="size-6 shrink-0 rounded-full overflow-hidden border border-primary">
                                    <Avatar className="size-6" image={face.avatar || null} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 font-semibold text-primary truncate">{face.name}</p>
                                    <p className="m-0 text-[10px] text-muted">{notebookFaceRoleLabel(face.role)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div>
                    <p className="m-0 px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Snapshots
                    </p>
                    {activities.length === 0 ? (
                        <p className="text-muted m-0 px-1">No saved versions yet.</p>
                    ) : (
                        activities.map((act) => (
                            <div
                                key={act.id}
                                className="flex gap-2.5 items-start p-1.5 rounded-sm hover:bg-accent transition-colors"
                            >
                                <div className="size-6 shrink-0 rounded-full overflow-hidden border border-primary">
                                    <Avatar className="size-6" image={act.avatar || null} />
                                </div>
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="font-semibold text-primary truncate">{act.name}</span>
                                        <span className="text-[10px] text-muted shrink-0">{act.time}</span>
                                    </div>
                                    <p className="text-secondary leading-tight m-0">{act.label}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <div
            data-scheme="primary"
            className="flex w-full items-center gap-px px-1 py-1 min-h-9 min-w-0 overflow-hidden"
        >
            <OSButton
                size="md"
                disabled={!canGoBack}
                onClick={onBack}
                icon={<IconChevronLeft />}
                tooltip="Undo"
            />
            <OSButton
                size="md"
                disabled={!canGoForward}
                onClick={onForward}
                icon={<IconChevronRight />}
                tooltip="Redo"
            />
            <Popover
                trigger={
                    <button
                        type="button"
                        className="flex items-center gap-1.5 min-w-0 px-1 relative !no-underline hover:!underline"
                        title={updatedAt ? `Last edited ${new Date(updatedAt).toLocaleString()}` : 'People and history'}
                    >
                        <NotebookFaceStack faces={faces.length ? faces : localFaces} size={24} />
                        <strong className="text-sm truncate max-w-[28vw] @sm:max-w-[10rem] max-[480px]:hidden">
                            {displayName}
                        </strong>
                        <span suppressHydrationWarning className="text-xs text-muted shrink-0 hidden @md:inline">
                            {when}
                        </span>
                    </button>
                }
                title="People & history"
                header
                dataScheme="primary"
                side="bottom"
                align="start"
                contentClassName="z-[80]"
            >
                {overlay}
            </Popover>
            <div className="ml-auto flex items-center gap-px shrink-0">
                <NotebookSyncInfo syncStatus={syncStatus} message={cloudMessage} onRetry={onRetrySync} />
                {onOpenAskAi ? (
                    <OSButton
                        size="md"
                        icon={<IconChat />}
                        tooltip="WIM AI"
                        onClick={onOpenAskAi}
                    />
                ) : null}
            </div>
        </div>
    )
}
