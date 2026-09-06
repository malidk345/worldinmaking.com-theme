import { useMemo } from 'react'
import { IconChevronLeft, IconChevronRight, IconSparkles } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { Popover } from 'components/RadixUI/Popover'
import Avatar from 'components/Squeak/components/Avatar'
import type { NotebookPerson } from '../../../lib/notebook-actor'
import { formatEditedAgo, getNotebookActor } from '../../../lib/notebook-actor'
import { getNotebookHistory } from './notebookStorage'
import type { NotebookPresencePerson } from './notebookPresence'
import { NotebookSyncInfo, type NotebookChromeSyncStatus } from './NotebookMeta'

interface CollaboratorsBannerProps {
    person?: NotebookPerson | null
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
    const actor = person || getNotebookActor()
    const displayName = [actor.first_name, actor.last_name].filter(Boolean).join(' ') || actor.username || 'You'
    const when = formatEditedAgo(updatedAt)
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
            }))
    }, [notebookId, updatedAt])

    const overlay = (
        <div className="w-80 p-1 text-xs">
            <div className="space-y-1 max-h-64 overflow-y-auto">
                {activities.length === 0 ? (
                    <p className="text-muted m-0 px-1">No saved versions yet.</p>
                ) : (
                    activities.map((act) => (
                        <div
                            key={act.id}
                            className="flex gap-2.5 items-start p-1.5 rounded hover:bg-accent transition-colors"
                        >
                            <div className="size-6 shrink-0 rounded-full overflow-hidden">
                                <Avatar className="size-6" image={actor.avatar_url || null} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex justify-between items-center gap-2">
                                    <span className="font-semibold text-primary truncate">{displayName}</span>
                                    <span className="text-[10px] text-muted shrink-0">{act.time}</span>
                                </div>
                                <p className="text-secondary leading-tight m-0">{act.label}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )

    return (
        <div
            data-scheme="primary"
            className="flex w-full items-center gap-px px-1.5 py-1 min-h-9"
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
                        title={updatedAt ? `Last edited ${new Date(updatedAt).toLocaleString()}` : 'Edit history'}
                    >
                        <div className="size-6 shrink-0 rounded-full overflow-hidden">
                            <Avatar className="size-6" image={actor.avatar_url || null} />
                        </div>
                        <strong className="text-sm truncate">{displayName}</strong>
                        <span suppressHydrationWarning className="text-xs text-muted shrink-0">
                            {when}
                        </span>
                    </button>
                }
                title="Edit history"
                header
                dataScheme="primary"
                side="bottom"
                align="start"
                contentClassName="z-[80]"
            >
                {overlay}
            </Popover>
            {livePeople.length ? (
                <span className="flex items-center -space-x-1.5 px-1" aria-label="People editing now">
                    {livePeople.slice(0, 4).map((peer) => (
                        <span
                            key={peer.clientId}
                            title={peer.name}
                            className="size-5 rounded-full overflow-hidden border border-primary bg-primary inline-flex"
                        >
                            <Avatar className="size-5" image={peer.avatarUrl || null} />
                        </span>
                    ))}
                </span>
            ) : null}
            <div className="ml-auto flex items-center gap-px shrink-0">
                <NotebookSyncInfo syncStatus={syncStatus} message={cloudMessage} onRetry={onRetrySync} />
                {onOpenAskAi ? (
                    <OSButton
                        size="md"
                        icon={<IconSparkles className="text-navy fill-current" />}
                        iconClassName="text-navy"
                        tooltip="Ask AI"
                        onClick={onOpenAskAi}
                    />
                ) : null}
            </div>
        </div>
    )
}
