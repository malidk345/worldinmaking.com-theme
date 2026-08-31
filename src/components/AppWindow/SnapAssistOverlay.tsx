import React from 'react'
import { motion } from 'framer-motion'

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
    edge = 32
): SnapZone | null {
    if (clientY - bounds.top < edge) return 'maximize'
    if (clientX - bounds.left < edge) return 'left'
    if (bounds.right - clientX < edge) return 'right'
    return null
}

/** How far the pointer must move before a snap zone can arm. */
export const SNAP_ARM_DISTANCE = 20

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
        <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1, ...box }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-none fixed z-[9990] rounded-xl border border-blue-500/40 bg-blue-500/10 dark:border-blue-400/50 dark:bg-blue-600/15 backdrop-blur-md shadow-[0_16px_48px_rgba(37,99,235,0.22)]"
        />
    )
}
