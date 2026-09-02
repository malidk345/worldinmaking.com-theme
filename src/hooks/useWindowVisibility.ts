import { useMemo } from 'react'
import type { AppWindow } from '../context/Window'

interface UseWindowVisibilityOptions {
    item: AppWindow
    windows: AppWindow[]
    position: { x: number; y: number }
    size: { width: number; height: number }
}

export function useWindowVisibility({ item, windows, position, size }: UseWindowVisibilityOptions) {
    const inView = useMemo(() => {
        if (item.expanded) return true

        const windowsAbove = windows.filter(
            (window) => window !== item && window.zIndex > item.zIndex && !window.minimized
        )

        let coveredArea = 0
        const currentArea = size.width * size.height

        for (const windowAbove of windowsAbove) {
            const left = Math.max(position.x, windowAbove.position.x)
            const right = Math.min(position.x + size.width, windowAbove.position.x + windowAbove.size.width)
            const top = Math.max(position.y, windowAbove.position.y)
            const bottom = Math.min(position.y + size.height, windowAbove.position.y + windowAbove.size.height)

            if (left < right && top < bottom) {
                coveredArea += (right - left) * (bottom - top)
            }
        }

        return coveredArea / currentArea < 0.8
    }, [windows, item, position, size])

    return { inView }
}
