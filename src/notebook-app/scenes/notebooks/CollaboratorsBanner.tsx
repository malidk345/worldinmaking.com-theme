import { useState } from 'react'
import { LemonDropdown, LemonTag } from '~nb-lib/lemon-ui/index'
import { ProfilePicture } from '../../lib/lemon-ui/ProfilePicture'
import { IconClock } from '@posthog/icons'

interface CollaboratorsBannerProps {
    editedByText?: string
    updatedAt?: string
}

interface ActivityItem {
    id: string
    user: string
    action: string
    time: string
    avatarName: string
}

const RECENT_ACTIVITIES: ActivityItem[] = [
    {
        id: '1',
        user: 'Mustafa (You)',
        action: 'Edited title & added HogQL query block',
        time: 'Just now',
        avatarName: 'Mustafa',
    },
    {
        id: '2',
        user: 'Lottie',
        action: 'Inserted RCA Feature Release section',
        time: '12 minutes ago',
        avatarName: 'Lottie (Designer)',
    },
    {
        id: '3',
        user: 'Michael',
        action: 'Added Session Replay recording embed',
        time: '1 hour ago',
        avatarName: 'Michael (Data Lead)',
    },
    {
        id: '4',
        user: 'PostHog AI',
        action: 'Generated summary report & insights',
        time: '3 hours ago',
        avatarName: 'PostHog AI',
    },
]

export function CollaboratorsBanner({ editedByText = 'Mustafa' }: CollaboratorsBannerProps) {
    const [isOpen, setIsOpen] = useState(false)

    const overlay = (
        <div className="w-80 p-3 space-y-3 bg-surface-primary border border-border rounded-lg shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                    <IconClock className="w-4 h-4 text-muted" />
                    <span>Recent Activity & Collaborators</span>
                </div>
                <LemonTag type="completion">Synced</LemonTag>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {RECENT_ACTIVITIES.map((act) => (
                    <div key={act.id} className="flex gap-2.5 items-start p-1.5 rounded hover:bg-surface-secondary transition-colors">
                        <ProfilePicture name={act.avatarName} size="sm" />
                        <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-primary truncate">{act.user}</span>
                                <span className="text-[10px] text-muted">{act.time}</span>
                            </div>
                            <p className="text-secondary leading-tight">{act.action}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t border-border pt-2 flex items-center justify-between text-[11px] text-muted">
                <span>Real-time co-editing active</span>
                <span className="text-green-600 font-medium">â— Live</span>
            </div>
        </div>
    )

    return (
        <LemonDropdown
            overlay={overlay}
            visible={isOpen}
            onClickOutside={() => setIsOpen(false)}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="UserActivityIndicator flex items-center gap-1.5 text-xs text-muted whitespace-nowrap p-1 rounded hover:bg-surface-secondary transition-all cursor-pointer border border-transparent hover:border-border"
                title="Click to view edit activity history"
            >
                <span>Edited just now by</span>
                <ProfilePicture name={editedByText} showName size="md" />
            </button>
        </LemonDropdown>
    )
}
