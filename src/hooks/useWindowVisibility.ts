import { useMemo } from 'react'
import { AppWindow } from '../context/Window'

interface UseWindowVisibilityOptions {
    item: AppWindow
    windows: AppWindow[]
}

export function useWindowVisibility({ item, windows }: UseWindowVisibilityOptions) {
    const inView = useMemo(() => {
        if (item.expanded) return true

        const windowsAbove = windows.filter(
            (window) => window !== item && window.zIndex > item.zIndex && !window.minimized
        )

        let coveredArea = 0
        const currentArea = item.size.width * item.size.height

        for (const windowAbove of windowsAbove) {
            const left = Math.max(item.position.x, windowAbove.position.x)
            const right = Math.min(item.position.x + item.size.width, windowAbove.position.x + windowAbove.size.width)
            const top = Math.max(item.position.y, windowAbove.position.y)
            const bottom = Math.min(item.position.y + item.size.height, windowAbove.position.y + windowAbove.size.height)

            if (left < right && top < bottom) {
                coveredArea += (right - left) * (bottom - top)
            }
        }

        return coveredArea / currentArea < 0.8
    }, [windows, item, item.position, item.size])

    return { inView }
}
