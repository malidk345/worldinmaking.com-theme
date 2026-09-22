import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { PanInfo } from 'framer-motion'
import type { AppWindow } from '../context/Window'
import {
    getViewportMetrics,
    isEditableFocusTarget,
    shouldIgnoreViewportResizeForWindows,
} from './useViewportMetrics'

type ResizeChange = { x: boolean } | { y: boolean } | { x: boolean; y: boolean }

interface UseWindowResizeOptions {
    item: AppWindow
    size: AppWindow['size']
    position: AppWindow['position']
    sizeConstraints: AppWindow['sizeConstraints']
    taskbarHeight: number
    constraintsRef: RefObject<HTMLDivElement>
    windowRef: RefObject<HTMLDivElement>
    isSSR: boolean
    updateWindow: (window: AppWindow, updates: any) => void
}

export function useWindowResize({
    item,
    size,
    position,
    sizeConstraints,
    taskbarHeight,
    constraintsRef,
    windowRef,
    isSSR,
    updateWindow,
}: UseWindowResizeOptions) {
    const [isResizing, setIsResizing] = useState(false)
    /** Last viewport we actually applied to window geometry (stable layout size). */
    const appliedViewportRef = useRef<{ width: number; height: number } | null>(null)

    const handleDragResize = useCallback(
        (info: PanInfo, change: ResizeChange, isLeftResize = false) => {
            setIsResizing(true)

            if (item.expanded && windowRef.current) {
                const rect = windowRef.current.getBoundingClientRect()
                const containerRect = constraintsRef.current?.getBoundingClientRect()
                const measuredPos = {
                    x: rect.left - (containerRect?.left ?? 0),
                    y: rect.top - (containerRect?.top ?? 0),
                }
                const measuredSize = { width: rect.width, height: rect.height }
                updateWindow(item, {
                    position: measuredPos,
                    size: measuredSize,
                    previousSize: measuredSize,
                    previousPosition: measuredPos,
                    expanded: false,
                    snapped: false,
                })
                return
            }

            const update: { size?: { height?: number; width?: number }; position?: { x: number } } = {}
            if ('y' in change) update.size = { height: Math.max(size.height + info.delta.y, sizeConstraints.min.height) }
            if ('x' in change) {
                update.size ||= {}
                const delta = isLeftResize ? -info.delta.x : info.delta.x
                update.size.width = Math.max(size.width + delta, sizeConstraints.min.width)
                if (isLeftResize) update.position = { x: item.position.x + size.width - update.size.width }
            }
            updateWindow(item, update)
        },
        [constraintsRef, item, size, sizeConstraints, updateWindow, windowRef]
    )

    const handleResizeEnd = useCallback(() => setIsResizing(false), [])

    useEffect(() => {
        const handleViewportResize = () => {
            const { width: viewportWidth, height: viewportHeight } = getViewportMetrics()
            const prev = appliedViewportRef.current
            if (prev) {
                const keyboardOpen = document.documentElement.getAttribute('data-keyboard') === 'open'
                const editing = isEditableFocusTarget(document.activeElement)
                const isMobile = viewportWidth < 768
                if (
                    shouldIgnoreViewportResizeForWindows(
                        prev,
                        { width: viewportWidth, height: viewportHeight },
                        { keyboardOpen, editing, isMobile }
                    )
                ) {
                    // Keep appliedViewportRef on the last stable layout size so a
                    // later keyboard/chrome dismiss does not apply a second jump.
                    return
                }
            }

            const containerBounds = constraintsRef.current?.getBoundingClientRect()
            const availableWidth = Math.min(viewportWidth, containerBounds?.width ?? viewportWidth)
            const availableHeight = Math.min(
                Math.max(0, viewportHeight - taskbarHeight),
                containerBounds?.height ?? Math.max(0, viewportHeight - taskbarHeight)
            )
            const constrainedSize = {
                width: Math.min(size.width, availableWidth),
                height: Math.min(size.height, availableHeight),
            }
            const newPosition = {
                x: Math.min(Math.max(0, position.x), Math.max(0, availableWidth - constrainedSize.width)),
                y: Math.min(Math.max(0, position.y), Math.max(0, availableHeight - constrainedSize.height)),
            }
            const newSize = item.expanded ? { width: availableWidth, height: availableHeight } : constrainedSize
            const needsResize = size.width !== newSize.width || size.height !== newSize.height
            const needsReposition = position.x !== newPosition.x || position.y !== newPosition.y

            if (needsResize || needsReposition) {
                updateWindow(item, {
                    size: newSize,
                    position: item.expanded ? { x: 0, y: 0 } : newPosition,
                })
            }
            appliedViewportRef.current = { width: viewportWidth, height: viewportHeight }
        }

        if (isSSR) return
        // Layout resize only (orientation). Soft keyboard + mobile URL-bar chrome
        // also fire window.resize with height-only deltas — those must not move or
        // shrink OS windows (see shouldIgnoreViewportResizeForWindows).
        window.addEventListener('resize', handleViewportResize)
        handleViewportResize()
        return () => {
            window.removeEventListener('resize', handleViewportResize)
        }
    }, [constraintsRef, isSSR, item, position, size, taskbarHeight, updateWindow])

    return { handleDragResize, handleResizeEnd, isResizing }
}
