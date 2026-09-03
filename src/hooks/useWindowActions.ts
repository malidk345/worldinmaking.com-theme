import { useCallback } from 'react'
import type { AppWindow } from '../context/Window'
import type { NextRouter } from 'next/router'
import { isMaximizedWindow, transitionWindowMode, windowModeFlags, type WindowUpdate } from '../lib/windowState'

interface UseWindowActionsOptions {
    item: AppWindow
    router: NextRouter
    isMobile: boolean
    taskbarHeight: number
    constraintsRef: React.RefObject<HTMLDivElement>
    focusedWindow?: AppWindow | null
    bringToFront: (item: AppWindow) => void
    updateWindow: (item: AppWindow, update: WindowUpdate) => void
    setClosing: (closing: boolean) => void
}

export function useWindowActions({
    item,
    router,
    isMobile,
    taskbarHeight,
    constraintsRef,
    focusedWindow,
    bringToFront,
    updateWindow,
    setClosing,
}: UseWindowActionsOptions) {
    const toggleExpanded = useCallback(() => {
        if (item.fixedSize) return
        const bounds = constraintsRef.current?.getBoundingClientRect()
        const fullW = bounds ? bounds.width : (typeof window !== 'undefined' ? window.innerWidth - 16 : 1200)
        const fullH = bounds ? bounds.height : (typeof window !== 'undefined' ? window.innerHeight - taskbarHeight : 800)

        const isMax = isMaximizedWindow(item) || (item.size.width >= fullW - 10 && item.size.height >= fullH - 10)

        if (isMax) {
            const prevSize = isMobile
                ? {
                      width: Math.min(item.previousSize?.width || fullW * 0.9, fullW * 0.92),
                      height: Math.min(item.previousSize?.height || fullH * 0.78, fullH * 0.78),
                  }
                : item.previousSize || {
                      width: Math.min(900, fullW * 0.8),
                      height: Math.min(650, fullH * 0.8),
                  }
            const prevPos = isMobile
                ? { x: Math.max(0, (fullW - prevSize.width) / 2), y: Math.max(0, (fullH - prevSize.height) / 2) }
                : item.previousPosition || {
                      x: Math.max(0, (fullW - prevSize.width) / 2),
                      y: Math.max(0, (fullH - prevSize.height) / 2),
                  }
            updateWindow(item, {
                size: prevSize,
                position: prevPos,
                ...windowModeFlags(transitionWindowMode('maximized', { type: 'toggle-maximize' })),
            })
        } else {
            updateWindow(item, {
                previousSize: item.size,
                previousPosition: item.position,
                size: { width: fullW, height: fullH },
                position: { x: 0, y: 0 },
                ...windowModeFlags(transitionWindowMode('normal', { type: 'toggle-maximize' })),
            })
        }
    }, [item, constraintsRef, taskbarHeight, isMobile, updateWindow])

    const handleDoubleClick = useCallback(() => {
        toggleExpanded()
    }, [toggleExpanded])

    const handleMouseDown = useCallback(() => {
        if (focusedWindow === item) return
        if (isMobile) {
            bringToFront(item)
            return
        }
        try {
            const browserPath = typeof window !== 'undefined' ? window.location.pathname : ''
            const windowPath = item.path || ''
            if (
                windowPath.startsWith('/') &&
                browserPath.startsWith(windowPath) &&
                browserPath.length > windowPath.length
            ) {
                bringToFront(item)
                return
            }
            if (windowPath === '/questions' && browserPath.startsWith('/questions/')) {
                bringToFront(item)
                return
            }
        } catch {
            /* ignore */
        }
        if (item.path.startsWith('/')) {
            let next = `${item.path}${item.location?.search || ''}`
            if (/\[[^\]]+\]/.test(next)) {
                if (
                    typeof window !== 'undefined' &&
                    window.location.pathname &&
                    !/\[[^\]]+\]/.test(window.location.pathname)
                ) {
                    next = `${window.location.pathname}${window.location.search || ''}`
                } else {
                    bringToFront(item)
                    return
                }
            }
            const current = `${router.asPath.split('#')[0]}`
            if (current !== next) {
                void router.push(next)
            } else {
                bringToFront(item)
            }
        } else {
            bringToFront(item)
        }
    }, [focusedWindow, item, isMobile, bringToFront, router])

    const handleClose = useCallback(() => {
        setClosing(true)
    }, [setClosing])

    return { toggleExpanded, handleDoubleClick, handleMouseDown, handleClose }
}
