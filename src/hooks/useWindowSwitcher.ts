import { useMemo } from 'react'
import type { AppWindow } from '../context/Window'
import { ACTIVE_WINDOWS_PANEL_RESERVE, layoutMissionControlWindow } from '../lib/mission-control-layout'

export function useWindowSwitcher({
    item,
    windows,
    isActiveWindowsPanelOpen,
    isMobile,
    compact,
    size,
    taskbarHeight,
}: {
    item: AppWindow
    windows: AppWindow[]
    isActiveWindowsPanelOpen: boolean
    isMobile: boolean
    compact: boolean
    size: { width: number; height: number }
    taskbarHeight: number
}) {
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
            size,
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
        size.width,
        size.height,
        taskbarHeight,
    ])
    const inSwitcher = !!missionControlLayout

    return { visibleWindows, switcherIndex, missionControlLayout, inSwitcher }
}
