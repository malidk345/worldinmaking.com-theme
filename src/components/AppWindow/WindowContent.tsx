import React from 'react'
import type { AppWindow } from '../../context/Window'
import { isArtifactWindowPath, isAssistantWindowPath, isNotebookWindowPath, isScratchpadWindowPath, isTrashWindowPath } from '../../lib/window-path'
import { isProfilePath } from '../../lib/profile-path'
import WindowErrorBoundary from './WindowErrorBoundary'
import { cn } from '../../notebook-app/lib/utils/css-classes'

interface WindowContentProps {
    item: AppWindow
    chrome: boolean
    hasToolbar: boolean
    children: React.ReactNode
}

export default function WindowContent({ item, chrome, hasToolbar, children }: WindowContentProps) {
    const path = item.path || item.props?.path || ''
    // Forum (Inbox) is a fixed split layout (list + thread panel) like wimpos — needs
    // overflow-hidden + h-full chain. Blog + notebooks keep sidebar chrome window-tall.
    const isForumShell =
        /^\/questions/.test(path) ||
        /^\/forum/.test(path) ||
        (/^\/community/.test(path) &&
            !path.startsWith('/community/profiles') &&
            !path.startsWith('/community/achievements'))
    const isBlogShell = /^\/(blog|posts)(\/|$)/.test(path)
    const lockToWindow =
        isForumShell ||
        isBlogShell ||
        isArtifactWindowPath(path) ||
        isNotebookWindowPath(path) ||
        isScratchpadWindowPath(path) ||
        isTrashWindowPath(path) ||
        isAssistantWindowPath(path) ||
        isProfilePath(path) ||
        path === '/display-options'

    return (
        <div
            data-window-content
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            className={cn(
                'size-full flex-grow relative z-[1] min-h-0 overflow-x-hidden overscroll-contain',
                lockToWindow ? 'overflow-hidden flex flex-col' : 'overflow-y-auto',
                chrome && 'rounded-lg',
                chrome && hasToolbar && 'rounded-t-none',
                chrome && item.expanded && 'rounded-tr-none rounded-tl-none',
                chrome && item.snapped === 'left' && 'rounded-tl-none rounded-tr-none rounded-br-none',
                chrome && item.snapped === 'right' && 'rounded-tl-none rounded-tr-none rounded-bl-none'
            )}
        >
            <WindowErrorBoundary>{children}</WindowErrorBoundary>
        </div>
    )
}
