import { useMemo } from 'react'
import { IconSparkles } from '@posthog/icons'
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
        <div className="flex items-center gap-2 w-full min-w-0 flex-wrap pb-2 mb-3 border-b border-primary">
            <Popover
                trigger={
                    <button
                        type="button"
                        className="flex items-center min-w-0 relative !no-underline hover:!underline"
                        title={updatedAt ? `Last edited ${new Date(updatedAt).toLocaleString()}` : 'Edit history'}
                    >
                        <div className="size-10 shrink-0 rounded-full mr-2.5 overflow-hidden">
                            <Avatar className="size-10" image={actor.avatar_url || null} />
                        </div>
                        <strong>{displayName}</strong>
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
            <span suppressHydrationWarning className="text-sm text-muted">
                {when}
            </span>
            {livePeople.length ? (
                <>
                    <span className="text-muted opacity-40">•</span>
                    <span className="flex items-center -space-x-1.5" aria-label="People editing now">
                        {livePeople.slice(0, 4).map((peer) => (
                            <span
                                key={peer.clientId}
                                title={peer.name}
                                className="size-6 rounded-full overflow-hidden border border-primary bg-primary inline-flex"
                            >
                                <Avatar className="size-6" image={peer.avatarUrl || null} />
                            </span>
                        ))}
                    </span>
                </>
            ) : null}
            <div className="!ml-auto flex items-center space-x-px shrink-0">
                <NotebookSyncInfo syncStatus={syncStatus} message={cloudMessage} onRetry={onRetrySync} />
                {onOpenAskAi ? (
                    <OSButton
                        size="md"
                        icon={<IconSparkles className="text-navy fill-current" />}
                        iconClassName="text-navy"
                        tooltip="Ask AI"
                        onClick={onOpenAskAi}
                    >
                        Ask AI
                    </OSButton>
                ) : null}
            </div>
        </div>
    )
}
