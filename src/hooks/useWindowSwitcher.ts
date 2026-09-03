import { useMemo } from 'react'
import { AppWindow } from '../context/Window'
import { ACTIVE_WINDOWS_PANEL_RESERVE, layoutMissionControlWindow } from '../lib/mission-control-layout'

interface UseWindowSwitcherOptions {
    item: AppWindow
    windows: AppWindow[]
    isActiveWindowsPanelOpen: boolean
    isMobile: boolean
    compact: boolean
    taskbarHeight: number
}

export function useWindowSwitcher({
    item,
    windows,
    isActiveWindowsPanelOpen,
    isMobile,
    compact,
    taskbarHeight,
}: UseWindowSwitcherOptions) {
    const visibleWindows = useMemo(() => windows.filter((w) => !w.minimized), [windows])

    const switcherIndex = useMemo(
        () => visibleWindows.findIndex((w) => w.key === item.key),
        [visibleWindows, item.key]
    )

    const missionControlLayout = useMemo(() => {
        if (
            !isActiveWindowsPanelOpen ||
            isMobile ||
            compact ||
            item.minimized ||
            switcherIndex === -1 ||
            typeof window === 'undefined'
        ) {
            return null
        }

        return layoutMissionControlWindow({
            index: switcherIndex,
            count: visibleWindows.length,
            size: item.size,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            insets: {
                top: Math.max(taskbarHeight, 48) + 12,
                right: ACTIVE_WINDOWS_PANEL_RESERVE,
                bottom: 24,
                left: 24,
            },
        })
    }, [
        isActiveWindowsPanelOpen,
        isMobile,
        compact,
        item.minimized,
        switcherIndex,
        visibleWindows.length,
        item.size.width,
        item.size.height,
        taskbarHeight,
    ])

    return {
        switcherIndex,
        missionControlLayout,
        inSwitcher: !!missionControlLayout,
    }
}
