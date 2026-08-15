import React from 'react'

export type SnapZone = 'left' | 'right' | 'maximize'

/** Glass preview inset. Committed snap uses pad 0 so the window flush-aligns with the header. */
export const SNAP_PREVIEW_PAD = 8

type Size = { width: number; height: number }

/** Desktop-local snap box (x/y relative to constraintsRef, not the viewport). */
export function snapLayout(zone: SnapZone, size: Size, pad = 0): { x: number; y: number; width: number; height: number } {
    if (zone === 'left') {
        return {
            x: pad,
            y: pad,
            width: size.width / 2 - pad * 1.5,
            height: size.height - pad * 2,
        }
    }
    if (zone === 'right') {
        return {
            x: size.width / 2 + pad * 0.5,
            y: pad,
            width: size.width / 2 - pad * 1.5,
            height: size.height - pad * 2,
        }
    }
    return {
        x: pad,
        y: pad,
        width: size.width - pad * 2,
        height: size.height - pad * 2,
    }
}

export function snapZoneFromPoint(
    clientX: number,
    clientY: number,
    bounds: DOMRect,
    edge = 20
): SnapZone | null {
    if (clientY - bounds.top < edge) return 'maximize'
    if (clientX - bounds.left < edge) return 'left'
    if (bounds.right - clientX < edge) return 'right'
    return null
}

/** How far the pointer must move before a snap zone can arm. */
export const SNAP_ARM_DISTANCE = 24

export function dragDistance(offset: { x: number; y: number }): number {
    return Math.hypot(offset.x, offset.y)
}

/**
 * Snap is an explicit intent: the cursor is on a desktop edge after the user
 * has actually moved. A large or already-snapped window kissing an edge is not
 * intent — that is just where the window already lives.
 */
export function resolveSnapZone(
    clientX: number,
    clientY: number,
    bounds: DOMRect,
    options: { dragDistance?: number; ignoreZone?: SnapZone | null } = {}
): SnapZone | null {
    if ((options.dragDistance ?? Number.POSITIVE_INFINITY) < SNAP_ARM_DISTANCE) return null
    const zone = snapZoneFromPoint(clientX, clientY, bounds)
    if (!zone) return null
    if (options.ignoreZone && zone === options.ignoreZone) return null
    return zone
}

function zoneBox(zone: SnapZone, bounds: DOMRect) {
    const local = snapLayout(zone, bounds, SNAP_PREVIEW_PAD)
    return {
        left: bounds.left + local.x,
        top: bounds.top + local.y,
        width: local.width,
        height: local.height,
    }
}

export default function SnapAssistOverlay({
    zone,
    bounds,
}: {
    zone: SnapZone
    bounds: DOMRect
}) {
    const box = zoneBox(zone, bounds)
    return (
        <div
            aria-hidden
            className="pointer-events-none fixed z-[9990] rounded-xl border border-white/55 bg-white/18 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-[3px] transition-[left,top,width,height] duration-150 ease-out"
            style={box}
        />
    )
}
