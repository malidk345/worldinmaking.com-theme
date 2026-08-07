import React from 'react'
import type { AppWindow } from '../../context/Window'
import WindowErrorBoundary from './WindowErrorBoundary'

interface WindowContentProps {
    item: AppWindow
    chrome: boolean
    hasToolbar: boolean
    children: React.ReactNode
}

export default function WindowContent({ item, chrome, hasToolbar, children }: WindowContentProps) {
    const path = item.path || item.props?.path || ''
    // Forum (Inbox) is a fixed split layout (list + thread panel) like wimpos — needs
    // overflow-hidden + h-full chain. Notebooks/docs still need overflow-y-auto to scroll.
    const isForumShell =
        /^\/questions/.test(path) ||
        /^\/forum/.test(path) ||
        (/^\/community/.test(path) &&
            !path.startsWith('/community/profiles') &&
            !path.startsWith('/community/achievements'))

    return (
        <div
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            className={`size-full flex-grow relative z-[1] min-h-0 overflow-x-hidden overscroll-contain ${
                isForumShell ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
            } ${
                chrome
                    ? `rounded-[24px] ${hasToolbar ? 'rounded-t-none' : ''} ${
                          item.expanded
                              ? 'rounded-tr-none rounded-tl-none'
                              : item.snapped === 'left'
                              ? 'rounded-tl-none rounded-tr-none rounded-br-none'
                              : item.snapped === 'right'
                              ? 'rounded-tl-none rounded-tr-none rounded-bl-none'
                              : ''
                      }`
                    : ''
            }`}
        >
            <WindowErrorBoundary>{children}</WindowErrorBoundary>
        </div>
    )
}
