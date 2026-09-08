import { useMemo } from 'react'
import { isScratchpadWindowPath, isTrashWindowPath } from '../lib/window-path'
import { MOTION_LAYER } from '../constants/frostedSurfaces'
import type { AppWindow } from '../context/Window'

interface WindowStylesProps {
    item: AppWindow
    focusedWindow?: AppWindow | null
    isCompositorActive: boolean
}

export function useWindowStyles({ item, focusedWindow, isCompositorActive }: WindowStylesProps) {
    return useMemo(() => {
        const isFocused = focusedWindow?.key === item.key
        const isSpecialPath = isScratchpadWindowPath(item.path) || isTrashWindowPath(item.path)

        // Base iOS 26 aesthetics
        const baseBg = isSpecialPath
            ? 'bg-primary'
            : 'bg-white/70 dark:bg-[#18191c]/70 backdrop-blur-2xl'

        const borderClass = isFocused
            ? 'border-white/80 dark:border-white/15'
            : 'border-white/50 dark:border-white/10'

        const shadowClass = isFocused
            ? 'shadow-[0_25px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)]'
            : 'shadow-[0_20px_50px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]'

        const opacityClass = isSpecialPath ? '' : (isFocused ? '' : 'opacity-[0.985]')
        const motionClass = isCompositorActive ? MOTION_LAYER : ''

        let shapeClass = 'rounded-[32px]' // iOS 26 style standard window corners
        if (item.expanded) {
            shapeClass = 'border-t-0 rounded-t-none rounded-b-lg !shadow-none'
        } else if (item.snapped) {
            shapeClass = `border-t-0 !shadow-none ${
                item.snapped === 'left'
                    ? 'rounded-tl-none rounded-tr-none rounded-br-none rounded-bl-lg'
                    : 'rounded-tl-none rounded-tr-none rounded-bl-none rounded-br-lg'
            }`
        }

        const className = `group @container absolute overflow-hidden pointer-events-auto !select-auto flex flex-col border transition-shadow duration-300 ${borderClass} ${shadowClass} ${opacityClass} ${baseBg} ${motionClass} ${shapeClass}`

        return { className }
    }, [item, focusedWindow?.key, isCompositorActive])
}
