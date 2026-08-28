import { LemonButton } from '~nb-lib/lemon-ui/index'
import { IconSparkles, IconPlus, IconCheck } from '@posthog/icons'
import type { OSActionCard as OSActionCardType } from '../types'

interface OSActionCardProps {
    action: OSActionCardType
    onExecute: () => void
}

/**
 * Renders an executable OS action card below an AI reply.
 * Supports create_notebook, insert_notebook_block, create_forum_topic, open_window.
 */
export function OSActionCard({ action, onExecute }: OSActionCardProps): JSX.Element {
    return (
        <div className="mt-2.5 p-2.5 rounded-xl bg-surface-primary border border-[var(--color-border-primary)] shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <IconSparkles className="size-4 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                        <span className="font-semibold text-xs text-primary block truncate">
                            {action.title}
                        </span>
                        <span className="text-[10px] text-muted block truncate">
                            {action.description}
                        </span>
                    </div>
                </div>
                {action.executed ? (
                    <span className="inline-flex items-center gap-1 shrink-0 text-[11px] font-medium text-emerald-700">
                        <IconCheck className="size-3.5" />
                        Done
                    </span>
                ) : (
                    <LemonButton
                        size="xsmall"
                        type="primary"
                        icon={<IconPlus />}
                        onClick={(e) => {
                            e.stopPropagation()
                            onExecute()
                        }}
                    >
                        Run
                    </LemonButton>
                )}
            </div>
        </div>
    )
}
