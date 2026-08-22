/**
 * Desktop window switcher layout (Active windows / Mission Control).
 * Mobile does not use this — the list in the side panel is the switcher.
 */

/** Matches ActiveWindowsPanel `w-80` + SidePanel `right-4` + a gap. */
export const ACTIVE_WINDOWS_PANEL_RESERVE = 320 + 16 + 16

export type MissionControlCell = {
    x: number
    y: number
    scale: number
}

export function missionControlGrid(count: number): { cols: number; rows: number } {
    if (count <= 0) return { cols: 1, rows: 1 }
    if (count <= 3) return { cols: count, rows: 1 }
    if (count === 4) return { cols: 2, rows: 2 }
    const cols = count <= 9 ? 3 : Math.min(4, Math.ceil(Math.sqrt(count)))
    return { cols, rows: Math.ceil(count / cols) }
}

function scaleCap(count: number): number {
    if (count <= 1) return 0.82
    if (count <= 3) return 0.72
    if (count <= 6) return 0.58
    return 0.48
}

export function layoutMissionControlWindow(args: {
    index: number
    count: number
    size: { width: number; height: number }
    viewport: { width: number; height: number }
    insets: { top: number; right: number; bottom: number; left: number }
}): MissionControlCell | null {
    const { index, count, size, viewport, insets } = args
    if (count <= 0 || index < 0 || index >= count) return null
    if (size.width <= 0 || size.height <= 0) return null

    const { cols, rows } = missionControlGrid(count)
    const availableW = Math.max(160, viewport.width - insets.left - insets.right)
    const availableH = Math.max(120, viewport.height - insets.top - insets.bottom)
    const cellW = availableW / cols
    const cellH = availableH / rows

    const row = Math.floor(index / cols)
    const indexInRow = index % cols
    const itemsInRow = row === rows - 1 ? count - row * cols : cols
    const visualCol = indexInRow + (cols - itemsInRow) / 2

    const cx = insets.left + (visualCol + 0.5) * cellW
    const cy = insets.top + (row + 0.5) * cellH

    const maxW = cellW * 0.88
    const maxH = cellH * 0.86
    let scale = Math.min(maxW / size.width, maxH / size.height, scaleCap(count))
    if (scale < 0.12) scale = 0.12

    return {
        x: cx - size.width / 2,
        y: cy - size.height / 2,
        scale,
    }
}
