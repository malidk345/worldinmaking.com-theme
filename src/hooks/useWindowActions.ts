import { useCallback } from 'react'
import type { AppWindow } from '../context/Window'
import { isMaximizedWindow, transitionWindowMode, windowModeFlags, WindowUpdate } from '../lib/windowState'

export function useWindowActions({
    item,
    focusedWindow,
    isMobile,
    taskbarHeight,
    constraintsRef,
    updateWindow,
    bringToFront,
    setClosing,
    router,
}: {
    item: AppWindow
    focusedWindow: AppWindow | undefined
    isMobile: boolean
    taskbarHeight: number
    constraintsRef: React.RefObject<HTMLDivElement>
    updateWindow: (appWindow: AppWindow, updates: WindowUpdate) => AppWindow
    bringToFront: (item: AppWindow) => void
    setClosing: (closing: boolean) => void
    router: any
}) {
    const toggleExpanded = () => {
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
    }

    const handleDoubleClick = () => {
        toggleExpanded()
    }

    const handleClose = useCallback(() => {
        setClosing(true)
    }, [setClosing])

    const handleMouseDown = () => {
        if (focusedWindow === item) return
        // Mobile: never router.push on focus — pushState thread URLs would get wiped back
        // to the stale window path (e.g. /questions) and the forum detail panel would close
        // mid-scroll / mid-touch. Just raise z-index.
        if (isMobile) {
            bringToFront(item)
            return
        }
        // Desktop: if the browser is already on a deeper path under this window (forum thread),
        // don't clobber it with a shallower item.path.
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
            // Forum shell always lives at /questions/* — never force-navigate to list root on focus
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
    }

    return { toggleExpanded, handleDoubleClick, handleClose, handleMouseDown }
}
