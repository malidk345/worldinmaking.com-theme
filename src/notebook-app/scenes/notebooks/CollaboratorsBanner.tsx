import { useMemo, useState } from 'react'
import { LemonDropdown, LemonTag } from '~nb-lib/lemon-ui/index'
import { ProfilePicture } from '../../lib/lemon-ui/ProfilePicture'
import { IconClock } from '@posthog/icons'
import type { NotebookPerson } from '../../../lib/notebook-actor'
import { formatEditedAgo } from '../../../lib/notebook-actor'
import { getNotebookHistory } from './notebookStorage'
import type { NotebookPresencePerson } from './notebookPresence'
import type { NotebookChromeSyncStatus } from './NotebookMeta'

interface CollaboratorsBannerProps {
    person?: NotebookPerson | null
    updatedAt?: string
    syncStatus?: NotebookChromeSyncStatus
    notebookId?: string
    livePeople?: NotebookPresencePerson[]
}

export function CollaboratorsBanner({
    person,
    updatedAt,
    syncStatus = 'saved',
    notebookId,
    livePeople = [],
}: CollaboratorsBannerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const displayName = [person?.first_name, person?.last_name].filter(Boolean).join(' ') || person?.username || 'You'
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
    }, [notebookId, updatedAt, isOpen])

    const overlay = (
        <div className="w-80 p-3 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-primary pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                    <IconClock className="w-4 h-4 text-muted" />
                    <span>Edit history</span>
                </div>
                <LemonTag
                    type={
                        syncStatus === 'saved'
                            ? 'completion'
                            : syncStatus === 'edited' || syncStatus === 'offline'
                              ? 'warning'
                              : syncStatus === 'error'
                                ? 'danger'
                                : 'default'
                    }
                >
                    {syncStatus === 'saved'
                        ? 'Saved'
                        : syncStatus === 'edited'
                          ? 'Saving…'
                          : syncStatus === 'error'
                            ? 'Sync failed'
                            : syncStatus === 'offline'
                              ? 'Offline'
                              : 'Local'}
                </LemonTag>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {activities.length === 0 ? (
                    <p className="text-muted m-0">No saved versions yet.</p>
                ) : (
                    activities.map((act) => (
                        <div key={act.id} className="flex gap-2.5 items-start p-1.5 rounded hover:bg-surface-secondary transition-colors">
                            <ProfilePicture user={person || { first_name: displayName }} size="small" />
                            <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-primary truncate">{displayName}</span>
                                    <span className="text-[10px] text-muted">{act.time}</span>
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
        <LemonDropdown overlay={overlay} visible={isOpen} onClickOutside={() => setIsOpen(false)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="UserActivityIndicator flex items-center gap-1.5 text-xs text-muted whitespace-nowrap p-1 rounded hover:bg-surface-secondary transition-all cursor-pointer border border-transparent hover:border-primary"
                title={updatedAt ? `Last edited ${new Date(updatedAt).toLocaleString()}` : 'Edit history'}
            >
                <span>Edited {when} by</span>
                <ProfilePicture user={person || { first_name: displayName }} showName size="md" />
                {livePeople.length ? (
                    <span className="flex items-center -space-x-1.5 ml-1" aria-label="People editing now">
                        {livePeople.slice(0, 4).map((peer) => (
                            <span key={peer.clientId} title={peer.name} className="inline-flex">
                                <ProfilePicture
                                    user={{ first_name: peer.name, avatar_url: peer.avatarUrl }}
                                    size="sm"
                                />
                            </span>
                        ))}
                    </span>
                ) : null}
            </button>
        </LemonDropdown>
    )
}
