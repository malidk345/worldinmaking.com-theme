import { IconCollapse45Chevrons, IconMinus, IconSquare, IconX } from '@posthog/icons'
import Tooltip from 'components/RadixUI/Tooltip'
import OSButton from 'components/OSButton'
import KeyboardShortcut from 'components/KeyboardShortcut'
import type { AppWindow } from '../../context/Window'

interface WindowChromeProps {
    item: AppWindow
    hasToolbar: boolean
    hideTitle?: boolean
    onMinimize: () => void
    onToggleExpanded: () => void
    onClose: () => void
    onDoubleClick: () => void
}

export default function WindowChrome({
    item,
    hasToolbar,
    hideTitle,
    onMinimize,
    onToggleExpanded,
    onClose,
    onDoubleClick,
}: WindowChromeProps) {
    return (
        <div className={`relative ${hasToolbar ? 'flex items-center py-1.5 px-2 bg-transparent justify-center' : ''}`}>
            {hasToolbar && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {!hideTitle && (
                        <p className="text-primary text-center text-[13px] font-semibold m-0 px-2 line-clamp-1 opacity-70">
                            {item.meta?.title?.replace(/ - PostHog$/, '')}
                        </p>
                    )}
                </div>
            )}
            <div
                data-scheme="tertiary"
                onDoubleClick={onDoubleClick}
                className={`inline-flex gap-1.5 items-center pl-1.5 pr-1 opacity-50 hover:opacity-100 transition-opacity duration-200 ${
                    hasToolbar ? 'w-full justify-end relative z-10' : 'absolute z-20 right-1.5 top-1.5'
                }`}
            >
                <div className="window-minimize-control flex justify-end">
                    <Tooltip
                        trigger={
                            <OSButton
                                windowButton
                                size="md"
                                onClick={onMinimize}
                                icon={<IconMinus />}
                                aria-label="Minimize window"
                            />
                        }
                    >
                        <div className="flex flex-col items-center gap-2">
                            <span>Minimize window</span>
                        </div>
                    </Tooltip>
                </div>
                {!item.fixedSize && (
                    <div className="window-expand-control flex justify-end">
                        <Tooltip
                            trigger={
                                <OSButton
                                    windowButton
                                    size="md"
                                    onClick={onToggleExpanded}
                                    aria-label={item.expanded ? 'Restore window size' : 'Maximize window'}
                                    title={item.expanded ? 'Restore window size' : 'Maximize window'}
                                    icon={
                                        item.expanded ? (
                                            <IconCollapse45Chevrons />
                                        ) : (
                                            <IconSquare className="scale-110" />
                                        )
                                    }
                                />
                            }
                        >
                            <div className="flex flex-col items-center gap-2">
                                <span>{item.expanded ? 'Restore window' : 'Expand window'}</span>
                                <div>
                                    <KeyboardShortcut text="Shift" size="xs" />
                                    &nbsp;
                                    <KeyboardShortcut text="↑" size="xs" />
                                </div>
                            </div>
                        </Tooltip>
                    </div>
                )}
                <div className="flex justify-end">
                    <Tooltip
                        trigger={<OSButton windowButton size="md" onClick={onClose} icon={<IconX />} />}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <span>Close window</span>
                            <div>
                                <KeyboardShortcut text="Shift" size="xs" />
                                &nbsp;
                                <KeyboardShortcut text="W" size="xs" />
                            </div>
                        </div>
                    </Tooltip>
                </div>
            </div>
        </div>
    )
}
