import { useEffect, useMemo, useState } from 'react'
import { IconChat, IconChevronLeft, IconChevronRight } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { Popover } from 'components/RadixUI/Popover'
import type { NotebookPerson } from '../../../lib/notebook-actor'
import { formatEditedAgo, getNotebookActor } from '../../../lib/notebook-actor'
import { fetchNotebookPeople } from '../../../lib/notebook-collaborators-client'
import { getNotebookHistory } from './notebookStorage'
import type { NotebookPresencePerson } from './notebookPresence'
import { NotebookSyncInfo, type NotebookChromeSyncStatus } from './NotebookMeta'
import { getAuthUserId } from '../../../lib/wim-identity'
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
    const [markdownFacesSource, setMarkdownFacesSource] = useState(markdown)

    // Parsing the full notebook on every keystroke resizes the face stack and
    // makes the mobile header jump while typing.
    useEffect(() => {
        const handle = window.setTimeout(() => setMarkdownFacesSource(markdown), 400)
        return () => window.clearTimeout(handle)
    }, [markdown])

    const localFaces = useMemo(
        () =>
            collectLocalNotebookFaces({
                createdBy: createdBy || actor,
                lastModifiedBy: person,
                markdown: markdownFacesSource,
                currentActor: actor,
            }),
        [createdBy, person, actor, markdownFacesSource]
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
        const skip = new Set<string>()
        for (const face of merged) {
            if (face.key) skip.add(face.key.toLowerCase())
            if (face.name) skip.add(face.name.toLowerCase())
        }
        if (actor) {
            const actorName = personDisplayName(actor).toLowerCase()
            skip.add(actorName)
            if (actor.username) skip.add(actor.username.toLowerCase())
            if (actor.email) skip.add(actor.email.toLowerCase())
        }
        const authUserId = getAuthUserId()
        if (authUserId) skip.add(authUserId.toLowerCase())

        return mergeNotebookFaces(merged, facesFromPresence(livePeople, skip, authUserId))
    }, [localFaces, sharedFaces, livePeople, actor])

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
        <div className="w-72 p-1 text-xs">
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                <div>
                    <p className="m-0 px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        People
                    </p>
                    {faces.length === 0 ? (
                        <p className="text-muted m-0 px-1">Just you on this page.</p>
                    ) : (
                        faces.map((face) => (
                            <div key={face.key} className="flex items-center gap-2 p-1 rounded-sm">
                                <span className="size-6 shrink-0 rounded-full overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
                                    {face.avatar ? (
                                        <img src={face.avatar} alt={face.name} className="block w-full h-full object-cover" />
                                    ) : (
                                        <svg className="block w-full h-full bg-accent" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
                                            <path d="M0 0h40v40H0z" /><path fillRule="evenodd" clipRule="evenodd" d="M21.19 6.57c-5.384-.696-9.938 3.89-9.93 10.343.013.1.026.229.042.378.045.443.11 1.067.262 1.67.883 3.445 2.781 6.077 6.305 7.132 3.117.938 5.86.04 8.14-2.242 3.008-3.016 3.805-8.039 1.891-12.047-1.36-2.844-3.484-4.82-6.71-5.234ZM2.5 40c-.64-1.852 1.119-6.454 2.947-7.61 2.48-1.563 5.076-2.942 7.671-4.32.48-.255.96-.51 1.438-.766.313-.164.899.008 1.29.188 2.827 1.242 5.624 1.25 8.468.03.492-.21 1.242-.241 1.695-.015 2.688 1.367 5.352 2.774 7.961 4.281 2.352 1.36 4.35 6.056 3.53 8.212h-35Z" fill="#fff" />
                                        </svg>
                                    )}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 font-semibold text-primary truncate leading-tight">{face.name}</p>
                                    <p className="m-0 text-[10px] text-muted">{notebookFaceRoleLabel(face.role)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div>
                    <p className="m-0 px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Snapshots
                    </p>
                    {activities.length === 0 ? (
                        <p className="text-muted m-0 px-1">No saved versions yet.</p>
                    ) : (
                        activities.map((act) => (
                            <div
                                key={act.id}
                                className="flex gap-2 items-start p-1 rounded-sm hover:bg-accent transition-colors"
                            >
                                <span className="size-6 shrink-0 rounded-full overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
                                    {act.avatar ? (
                                        <img src={act.avatar} alt={act.name} className="block w-full h-full object-cover" />
                                    ) : (
                                        <svg className="block w-full h-full bg-accent" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
                                            <path d="M0 0h40v40H0z" /><path fillRule="evenodd" clipRule="evenodd" d="M21.19 6.57c-5.384-.696-9.938 3.89-9.93 10.343.013.1.026.229.042.378.045.443.11 1.067.262 1.67.883 3.445 2.781 6.077 6.305 7.132 3.117.938 5.86.04 8.14-2.242 3.008-3.016 3.805-8.039 1.891-12.047-1.36-2.844-3.484-4.82-6.71-5.234ZM2.5 40c-.64-1.852 1.119-6.454 2.947-7.61 2.48-1.563 5.076-2.942 7.671-4.32.48-.255.96-.51 1.438-.766.313-.164.899.008 1.29.188 2.827 1.242 5.624 1.25 8.468.03.492-.21 1.242-.241 1.695-.015 2.688 1.367 5.352 2.774 7.961 4.281 2.352 1.36 4.35 6.056 3.53 8.212h-35Z" fill="#fff" />
                                        </svg>
                                    )}
                                </span>
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="font-semibold text-primary truncate leading-tight">{act.name}</span>
                                        <span className="text-[10px] text-muted shrink-0">{act.time}</span>
                                    </div>
                                    <p className="text-secondary leading-tight m-0 text-[11px]">{act.label}</p>
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
