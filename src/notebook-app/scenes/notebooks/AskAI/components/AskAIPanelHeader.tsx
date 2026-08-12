import { LemonButton, LemonTag, ProfilePicture } from '~nb-lib/lemon-ui/index'
import { IconTrash, IconX } from '@posthog/icons'
import { philosopherAsUser, type PhilosopherBot } from '~nb-lib/philosophers'

interface AskAIPanelHeaderProps {
    activeBot: PhilosopherBot
    contentLength: number
    hasThread: boolean
    onClear: () => void
    onClose: () => void
}

export function AskAIPanelHeader({
    activeBot,
    contentLength,
    hasThread,
    onClear,
    onClose,
}: AskAIPanelHeaderProps): JSX.Element {
    return (
        <div className="flex items-center justify-between px-4 py-2 border-b border-primary flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
                <ProfilePicture user={philosopherAsUser(activeBot)} size="sm" />
                <div className="min-w-0 flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-primary truncate">
                        {activeBot.displayName}
                    </span>
                    {contentLength > 0 && (
                        <LemonTag type="completion" size="small" className="text-[9px] shrink-0">
                            Context ({contentLength})
                        </LemonTag>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                {hasThread && (
                    <LemonButton
                        size="xsmall"
                        type="tertiary"
                        icon={<IconTrash />}
                        onClick={onClear}
                        tooltip="Clear conversation"
                    >
                        Clear
                    </LemonButton>
                )}
                <button
                    onClick={onClose}
                    className="text-sm text-secondary hover:text-primary p-1"
                    title="Close AI Panel"
                >
                    <IconX className="size-4" />
                </button>
            </div>
        </div>
    )
}
