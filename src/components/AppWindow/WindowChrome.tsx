import type { PointerEvent } from 'react'
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
    onDragHandlePointerDown?: (event: PointerEvent<HTMLDivElement>) => void
}

export default function WindowChrome({
    item,
    hasToolbar,
    hideTitle,
    onMinimize,
    onToggleExpanded,
    onClose,
    onDoubleClick,
    onDragHandlePointerDown,
}: WindowChromeProps) {
    const canDrag = !item.fixedSize

    return (
        <div
            className={`relative ${hasToolbar ? 'bg-transparent flex items-center py-2 px-3' : ''}`}
            onPointerDown={hasToolbar && canDrag ? onDragHandlePointerDown : undefined}
            onDoubleClick={onDoubleClick}
        >
            {hasToolbar && (
                <>
                    {!hideTitle && (
                        <p className="text-primary text-left text-sm font-semibold ml-1 my-0 line-clamp-1 pointer-events-none">
                            {(item.meta?.title || item.title || '').replace(/ - PostHog$/, '')}
                        </p>
                    )}
                    <div className="flex-1" />
                </>
            )}
            {!hasToolbar && canDrag && (
                <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 z-10 h-4 cursor-grab active:cursor-grabbing"
                    onPointerDown={onDragHandlePointerDown}
                />
            )}
            <div
                data-scheme="tertiary"
                onPointerDown={(event) => event.stopPropagation()}
                className={`inline-flex gap-2 items-center py-1 pl-2 pr-1 opacity-60 hover:opacity-100 transition-opacity duration-200 ${
                    hasToolbar ? 'flex-1 justify-end' : 'absolute z-20 right-2 top-2'
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
