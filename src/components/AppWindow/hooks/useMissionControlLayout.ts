import { useMemo } from 'react'

export function useMissionControlLayout(
    isActiveWindowsPanelOpen: boolean,
    activePanelIndex: number,
    totalWindows: number,
    size: { width: number; height: number }
) {
    return useMemo(() => {
        if (!isActiveWindowsPanelOpen || activePanelIndex === -1 || typeof window === 'undefined') return null

        const screenWidth = window.innerWidth
        const screenHeight = window.innerHeight
        const padding = 80

        const availableW = screenWidth - padding * 2
        const availableH = screenHeight - padding * 2 - 80

        const cols = Math.ceil(Math.sqrt(totalWindows))
        const rows = Math.ceil(totalWindows / cols)

        const cellW = availableW / cols
        const cellH = availableH / rows

        const col = activePanelIndex % cols
        const row = Math.floor(activePanelIndex / cols)

        const cx = padding + col * cellW + cellW / 2
        const cy = padding + row * cellH + cellH / 2

        const maxW = cellW * 0.85
        const maxH = cellH * 0.85

        const scaleX = maxW / size.width
        const scaleY = maxH / size.height
        let scale = Math.min(scaleX, scaleY, 0.45)
        if (scale < 0.1) scale = 0.1

        const targetX = cx - size.width / 2
        const targetY = cy - size.height / 2

        return { x: targetX, y: targetY, scale }
    }, [isActiveWindowsPanelOpen, activePanelIndex, totalWindows, size.width, size.height])
}
