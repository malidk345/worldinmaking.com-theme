import { useCallback, type RefObject } from 'react'
import type { PanInfo } from 'framer-motion'
import type { AppWindow } from '../context/Window'

const SNAP_THRESHOLD = -50

interface UseWindowManagerOptions {
    item: AppWindow
    position: AppWindow['position']
    size: AppWindow['size']
    constraintsRef: RefObject<HTMLDivElement>
    windowRef: RefObject<HTMLDivElement>
    isDragging: boolean
    snapIndicator: 'left' | 'right' | null
    setDragging: (value: boolean) => void
    setSnapIndicator: (value: 'left' | 'right' | null) => void
    handleSnapToSide: (side: 'left' | 'right') => void
    updateWindow: (window: AppWindow, updates: any) => void
}

export function useWindowManager({
    item,
    position,
    size,
    constraintsRef,
    windowRef,
    isDragging,
    snapIndicator,
    setDragging,
    setSnapIndicator,
    handleSnapToSide,
    updateWindow,
}: UseWindowManagerOptions) {
    const handleDrag = useCallback(
        (_event: unknown, info: PanInfo) => {
            if (!isDragging) setDragging(true)
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
            if (item.fixedSize || !constraintsRef.current) return

            const bounds = constraintsRef.current.getBoundingClientRect()
            const newX = position.x + info.offset.x
            if (newX < SNAP_THRESHOLD) {
                setSnapIndicator('left')
            } else if (newX > bounds.width - size.width - SNAP_THRESHOLD) {
                setSnapIndicator('right')
            } else {
                setSnapIndicator(null)
            }
        },
        [constraintsRef, isDragging, item, position.x, setDragging, setSnapIndicator, size.width, updateWindow, windowRef]
    )

    const handleDragEnd = useCallback(
        (_event: unknown, info: PanInfo) => {
            if (isDragging) setDragging(false)
            if (!item.fixedSize && snapIndicator !== null) {
                handleSnapToSide(snapIndicator)
                setSnapIndicator(null)
                return
            }
            if (!constraintsRef.current) return

            const bounds = constraintsRef.current.getBoundingClientRect()
            const newX = position.x + info.offset.x
            const newY = position.y + info.offset.y
            if (newX >= 0 && newY >= 0 && newX + size.width <= bounds.width && newY + size.height <= bounds.height) {
                updateWindow(item, { position: { x: newX, y: newY } })
            }
        },
        [constraintsRef, handleSnapToSide, isDragging, item, position, setDragging, setSnapIndicator, size, snapIndicator, updateWindow]
    )

    const handleDragTransitionEnd = useCallback(() => {
        if (!isDragging) setDragging(false)
        if (!constraintsRef.current || !item.ref?.current) return

        const containerBounds = constraintsRef.current.getBoundingClientRect()
        const windowBounds = item.ref.current.getBoundingClientRect()
        updateWindow(item, {
            position: {
                x: windowBounds.left - containerBounds.left,
                y: windowBounds.top - containerBounds.top,
            },
        })
    }, [constraintsRef, isDragging, item, setDragging, updateWindow])

    return { handleDrag, handleDragEnd, handleDragTransitionEnd }
}
