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
    return (
        <div
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            // overflow-y-auto: long pages (notebooks, forum, etc.) must scroll inside the window.
            // overflow-hidden was clipping content with no scrollbar.
            className={`size-full flex-grow relative z-[1] min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain ${
                chrome
                    ? `rounded-lg ${hasToolbar ? 'rounded-t-none' : ''} ${
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
