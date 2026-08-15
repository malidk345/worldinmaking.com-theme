import { useCallback, useRef, type RefObject } from 'react'
import type { PanInfo } from 'framer-motion'
import type { AppWindow } from '../context/Window'
import { windowModeFlags } from 'lib/windowState'
import {
    resolveSnapZone,
    snapZoneFromPoint,
    type SnapZone,
} from '../components/AppWindow/SnapAssistOverlay'

interface UseWindowManagerOptions {
    item: AppWindow
    position: AppWindow['position']
    size: AppWindow['size']
    constraintsRef: RefObject<HTMLDivElement>
    windowRef: RefObject<HTMLDivElement>
    isDragging: boolean
    snapIndicator: SnapZone | null
    setDragging: (value: boolean) => void
    setSnapIndicator: (value: SnapZone | null) => void
    handleSnapToSide: (side: 'left' | 'right', target?: AppWindow) => void
    expandWindow: (target?: AppWindow) => void
    updateWindow: (window: AppWindow, updates: any) => void
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function floatingSize(item: AppWindow, bounds: DOMRect) {
    const prev = item.previousSize
    const looksDocked =
        !!prev && prev.width >= bounds.width - 24 && prev.height >= bounds.height - 24
    if (prev && prev.width > 200 && prev.height > 160 && !looksDocked) return prev
    return {
        width: Math.min(900, Math.max(420, bounds.width * 0.48)),
        height: Math.min(650, Math.max(360, bounds.height * 0.7)),
    }
}

export function useWindowManager({
    item,
    position,
    size,
    constraintsRef,
    windowRef,
    isDragging,
    setDragging,
    setSnapIndicator,
    handleSnapToSide,
    expandWindow,
    updateWindow,
}: UseWindowManagerOptions) {
    const snapZoneRef = useRef<SnapZone | null>(null)
    const startZoneRef = useRef<SnapZone | null | undefined>(undefined)
    const releasedLayoutRef = useRef(false)

    const readZone = (info: PanInfo): SnapZone | null => {
        if (!constraintsRef.current) return null
        const bounds = constraintsRef.current.getBoundingClientRect()
        if (startZoneRef.current === undefined) {
            startZoneRef.current = snapZoneFromPoint(info.point.x, info.point.y, bounds)
        }
        const raw = snapZoneFromPoint(info.point.x, info.point.y, bounds)
        if (startZoneRef.current && raw !== startZoneRef.current) {
            startZoneRef.current = null
        }
        return resolveSnapZone(info.point.x, info.point.y, bounds, {
            dragDistance: Math.hypot(info.offset.x, info.offset.y),
            ignoreZone: startZoneRef.current ?? null,
        })
    }

    const releaseDockedLayout = (info: PanInfo) => {
        if (releasedLayoutRef.current) return
        if (!item.snapped && !item.expanded) return
        if (!constraintsRef.current || !windowRef.current) return

        const bounds = constraintsRef.current.getBoundingClientRect()
        const windowRect = windowRef.current.getBoundingClientRect()
        const nextSize = floatingSize(item, bounds)
        const ratioX = windowRect.width > 0 ? (info.point.x - windowRect.left) / windowRect.width : 0.3
        const desiredX = info.point.x - bounds.left - ratioX * nextSize.width
        const desiredY = info.point.y - bounds.top - 14
        const nextPos = {
            x: clamp(desiredX - info.offset.x, 0, Math.max(0, bounds.width - nextSize.width)),
            y: clamp(desiredY - info.offset.y, 0, Math.max(0, bounds.height - nextSize.height)),
        }

        releasedLayoutRef.current = true
        updateWindow(item, {
            position: nextPos,
            size: nextSize,
            ...windowModeFlags('normal'),
        })
    }

    const handleDrag = useCallback(
        (_event: unknown, info: PanInfo) => {
            if (!isDragging) setDragging(true)
            if (item.fixedSize || !constraintsRef.current) return

            releaseDockedLayout(info)

            const zone = readZone(info)
            snapZoneRef.current = zone
            setSnapIndicator(zone)
        },
        [constraintsRef, isDragging, item, setDragging, setSnapIndicator, updateWindow, windowRef]
    )

    const handleDragEnd = useCallback(
        (_event: unknown, info: PanInfo) => {
            // Commit only the zone the cursor is in *now*. A zone we merely
            // passed through must not trap the drop.
            const zone = readZone(info)
            snapZoneRef.current = null
            startZoneRef.current = undefined
            releasedLayoutRef.current = false
            setSnapIndicator(null)

            if (!item.fixedSize && zone) {
                if (zone === 'maximize') expandWindow(item)
                else handleSnapToSide(zone, item)
                setDragging(false)
                return
            }

            if (!constraintsRef.current) {
                setDragging(false)
                return
            }

            const bounds = constraintsRef.current.getBoundingClientRect()
            const visual = windowRef.current?.getBoundingClientRect()
            const width = visual?.width ?? size.width
            const height = visual?.height ?? size.height
            const next = {
                x: clamp((visual?.left ?? bounds.left) - bounds.left, 0, Math.max(0, bounds.width - width)),
                y: clamp((visual?.top ?? bounds.top) - bounds.top, 0, Math.max(0, bounds.height - height)),
            }
            updateWindow(item, { position: next, size: { width, height }, ...windowModeFlags('normal') })
            setDragging(false)
        },
        [constraintsRef, expandWindow, handleSnapToSide, item, setDragging, setSnapIndicator, size, updateWindow, windowRef]
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
