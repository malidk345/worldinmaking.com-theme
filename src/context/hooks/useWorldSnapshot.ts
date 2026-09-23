import React, { useCallback } from 'react'
import { buildSnapOverrides } from 'lib/windowState'
import { useWorldAccountSync } from 'hooks/useWorldAccountSync'
import {
    buildWorldSnapshot,
    collectWorldWindows,
    isVisitingRoom,
    readPinnedItems,
    readVisitingRoomToken,
    restoreAppWindowFromWorld,
    type WorldSnapshot,
} from 'lib/world-snapshot'
import type { ColorMode } from 'lib/wallpaperChrome'
import type { AppWindow } from '../Window'

type SnapSide = 'left' | 'right'

/** Appearance fields world snapshots read/write; full SiteSettings stays in App. */
export type WorldSnapshotSettings = {
    wallpaper: string
    colorMode: ColorMode
    reduceTransparency?: boolean
    clickBehavior?: 'single' | 'double'
}

export type UseWorldSnapshotOptions<TSettings extends WorldSnapshotSettings = WorldSnapshotSettings> = {
    windows: AppWindow[]
    setWindows: React.Dispatch<React.SetStateAction<AppWindow[]>>
    siteSettings: TSettings
    setSiteSettings: React.Dispatch<React.SetStateAction<TSettings>>
    taskbarHeight: number
    constraintsRef: React.RefObject<HTMLDivElement>
    layoutRestoredRef: React.MutableRefObject<boolean>
    getSnapDimensions: (side: SnapSide) => {
        size: { width: number; height: number }
        position: { x: number; y: number }
    }
    setVisitingRoomToken: (token: string | null) => void
    desktopParams?: string | null
    pinEpoch: number
}

/**
 * Collect/apply world snapshots + account sync. Extracted from App.tsx so
 * window registry and snapshot persistence stay adjacent without changing behavior.
 */
export function useWorldSnapshot<TSettings extends WorldSnapshotSettings>({
    windows,
    setWindows,
    siteSettings,
    setSiteSettings,
    taskbarHeight,
    constraintsRef,
    layoutRestoredRef,
    getSnapDimensions,
    setVisitingRoomToken,
    desktopParams: _desktopParams,
    pinEpoch,
}: UseWorldSnapshotOptions<TSettings>) {
    void _desktopParams
    const collectSnapshot = useCallback((): WorldSnapshot => {
        const innerWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
        const innerHeight = typeof window !== 'undefined' ? window.innerHeight : 800
        return buildWorldSnapshot({
            wallpaper: siteSettings.wallpaper,
            colorMode: siteSettings.colorMode,
            reduceTransparency: siteSettings.reduceTransparency,
            clickBehavior: siteSettings.clickBehavior,
            windows: collectWorldWindows(windows, { innerWidth, innerHeight, taskbarHeight }),
            pinnedItems: readPinnedItems(),
        })
    }, [windows, siteSettings, taskbarHeight])

    const applySnapshot = useCallback(
        (snapshot: WorldSnapshot, opts?: { reopenWindows?: boolean }) => {
            const visiting = isVisitingRoom()
            // Functional update so we never spread a stale DEFAULT_WALLPAPER /
            // missing siteDefaultsVersion from the mount-time closure.
            setSiteSettings((prev) => {
                const next = {
                    ...prev,
                    wallpaper: snapshot.wallpaper,
                    colorMode: snapshot.colorMode,
                    reduceTransparency: !!snapshot.reduceTransparency,
                    clickBehavior: snapshot.clickBehavior,
                } as TSettings
                if (!visiting) {
                    try {
                        localStorage.setItem('siteSettings', JSON.stringify(next))
                    } catch {
                        /* ignore */
                    }
                }
                return next
            })
            if (snapshot.colorMode === 'dark' || snapshot.colorMode === 'light') {
                try {
                    window.__setPreferredTheme?.(snapshot.colorMode)
                } catch {
                    /* ignore */
                }
            }
            if (visiting) {
                setVisitingRoomToken(readVisitingRoomToken() || null)
            }
            if (!opts?.reopenWindows || snapshot.windows.length === 0) return

            const innerWidth = window.innerWidth
            const innerHeight = window.innerHeight
            const isMobileClient =
                innerWidth < 768 ||
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const bounds = constraintsRef.current?.getBoundingClientRect()
            const fullW = bounds ? bounds.width : innerWidth - 16
            const fullH = bounds ? bounds.height : innerHeight - taskbarHeight - 16
            layoutRestoredRef.current = true
            setWindows(
                snapshot.windows.map((win, i) =>
                    restoreAppWindowFromWorld(win, i, {
                        innerWidth,
                        innerHeight,
                        taskbarHeight,
                        fullW,
                        fullH,
                        isMobileClient,
                        applySnapOverrides: buildSnapOverrides,
                        getSnapRect: getSnapDimensions,
                    }) as unknown as AppWindow
                )
            )
        },
        [
            taskbarHeight,
            constraintsRef,
            layoutRestoredRef,
            getSnapDimensions,
            setSiteSettings,
            setWindows,
            setVisitingRoomToken,
        ]
    )

    // Positions live in desktopParams and change on every drag frame. Syncing on
    // that string re-enters account save/apply for the whole shell. Open windows
    // and appearance are enough.
    const windowEpoch = windows
        .map((win) => `${win.path}:${win.minimized ? 1 : 0}`)
        .sort()
        .join(',')
    const worldEpoch = `${siteSettings.wallpaper}|${siteSettings.colorMode}|${
        siteSettings.reduceTransparency ? '1' : '0'
    }|${siteSettings.clickBehavior || 'double'}|${windowEpoch}|${pinEpoch}`

    useWorldAccountSync({
        worldEpoch,
        collectSnapshot,
        applySnapshot,
    })

    return { collectSnapshot, applySnapshot }
}
