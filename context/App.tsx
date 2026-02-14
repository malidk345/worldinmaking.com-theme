"use client"

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { AppWindow } from './Window'
import PostsView from 'components/Posts'

interface AppContextType {
    windows: AppWindow[]
    focusedWindow: AppWindow | null
    bringToFront: (itemOrKey: string | AppWindow) => void
    addWindow: (item: Partial<AppWindow> & { key: string; path: string }) => void
    closeWindow: (itemOrKey: string | AppWindow) => void
    minimizeWindow: (itemOrKey: string | AppWindow) => void
    updateWindow: (itemOrKey: string | AppWindow, updates: Partial<AppWindow>) => AppWindow | null
    updateWindowRef: (itemOrKey: string | AppWindow, ref: React.RefObject<HTMLDivElement | null>) => void
    expandWindow: () => void
    handleSnapToSide: (side: 'left' | 'right') => void
    getDesktopCenterPosition: (size: { width: number; height: number }) => { x: number; y: number }
    constraintsRef: React.RefObject<HTMLDivElement | null>
    taskbarRef: React.RefObject<HTMLDivElement | null>
    siteSettings: {
        theme: string
        experience: string
        colorMode: string
        skinMode: string
        cursor: string
        wallpaper: string
        screensaverDisabled: boolean
        performanceBoost: boolean
    }
    updateSiteSettings: React.Dispatch<React.SetStateAction<AppContextType['siteSettings']>>
    isActiveWindowsPanelOpen: boolean
    setIsActiveWindowsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>
    openSearch: (filter?: string) => void
    closeAllWindows: () => void
    isMobile: boolean
    compact: boolean
    taskbarHeight: number
    menu: unknown[]
}

export const Context = createContext<AppContextType | undefined>(undefined)

const DEFAULT_SIZE = { width: 700, height: 500 }
const MIN_SIZE = { width: 350, height: 250 }

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const [windows, setWindows] = useState<AppWindow[]>([])
    const [focusedWindow, setFocusedWindow] = useState<AppWindow | null>(null)
    const [isActiveWindowsPanelOpen, setIsActiveWindowsPanelOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [compact, setCompact] = useState(false)
    const [siteSettings, setSiteSettings] = useState({
        theme: 'light',
        experience: 'posthog',
        colorMode: 'light',
        skinMode: 'modern',
        cursor: 'default',
        wallpaper: 'keyboard-garden',
        screensaverDisabled: true,
        performanceBoost: false
    })

    const constraintsRef = useRef<HTMLDivElement>(null)
    const taskbarRef = useRef<HTMLDivElement>(null)

    const getDesktopCenterPosition = useCallback((size: { width: number, height: number }) => {
        const inset = 0
        if (constraintsRef.current) {
            const bounds = constraintsRef.current.getBoundingClientRect()
            const maxW = bounds.width - inset * 2
            const maxH = bounds.height - inset * 2
            const w = Math.min(size.width, maxW)
            const h = Math.min(size.height, maxH)
            return {
                x: Math.max(inset, Math.round((bounds.width - w) / 2)),
                y: Math.max(inset, Math.round((bounds.height - h) / 2)),
            }
        }
        if (typeof window === 'undefined') return { x: inset, y: inset }
        return {
            x: Math.max(inset, Math.round(window.innerWidth / 2 - size.width / 2)),
            y: Math.max(inset, Math.round((window.innerHeight - 44) / 2 - size.height / 2)),
        }
    }, [])

    const getPositionDefaults = useCallback((size: { width: number; height: number }, currentWindows: AppWindow[]) => {
        if (typeof window === 'undefined') return { x: 0, y: 0 }

        const inset = 0
        const sortedWindows = [...currentWindows].sort((a, b) => b.zIndex - a.zIndex)
        const previousWindow = sortedWindows[0]

        // If no previous window or it's just the home window, center
        if (!previousWindow || previousWindow.key === 'home') {
            return getDesktopCenterPosition(size)
        }

        // Cascade effect: 10px offset from previous window
        const potentialX = previousWindow.position.x + 10
        const potentialY = previousWindow.position.y + 10

        const bounds = constraintsRef.current?.getBoundingClientRect()
        const maxX = bounds ? bounds.width - size.width - inset : window.innerWidth - size.width - inset
        const maxY = bounds ? bounds.height - size.height - inset : window.innerHeight - 44 - size.height - inset

        if (potentialX > maxX || potentialY > maxY) {
            return getDesktopCenterPosition(size)
        }

        return {
            x: Math.max(inset, Math.min(potentialX, maxX)),
            y: Math.max(inset, Math.min(potentialY, maxY)),
        }
    }, [getDesktopCenterPosition])

    const setFocusedWindowKey = useCallback((key: string | null) => {
        setFocusedWindow(key ? windows.find((w) => w.key === key) || null : null)
    }, [windows])

    const bringToFront = useCallback((itemOrKey: string | AppWindow) => {
        const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.key
        setWindows((prev) => {
            const existing = prev.find((w) => w.key === key)
            if (!existing) return prev
            return prev.map((el) => ({
                ...el,
                zIndex: el.key === key ? prev.length : el.zIndex > existing.zIndex ? el.zIndex - 1 : el.zIndex,
                minimized: el.key === key ? false : el.minimized,
            }))
        })
        setFocusedWindowKey(key)
    }, [setFocusedWindowKey])

    const addWindow = useCallback((item: Partial<AppWindow> & { key: string; path: string }) => {
        setWindows((prev) => {
            const existing = prev.find(w => w.key === item.key)
            if (existing) {
                // If window already exists, bring it to front and unminimize it
                const newWindows = prev.map((el) => ({
                    ...el,
                    zIndex: el.key === item.key ? prev.length : el.zIndex > existing.zIndex ? el.zIndex - 1 : el.zIndex,
                    minimized: el.key === item.key ? false : el.minimized,
                }))
                setFocusedWindowKey(item.key)
                return newWindows
            }

            const size = item.size || DEFAULT_SIZE
            const position = item.position || getPositionDefaults(size, prev)

            const newWindow = {
                ...item,
                size,
                position,
                previousSize: size,
                previousPosition: position,
                zIndex: prev.length + 1,
                minimized: false,
                sizeConstraints: item.sizeConstraints || { min: MIN_SIZE, max: { width: 2000, height: 2000 } },
                fixedSize: item.fixedSize || false,
                minimal: item.minimal || false
            }

            setFocusedWindow(newWindow)
            return [...prev, newWindow]
        })
    }, [getPositionDefaults])

    const closeWindow = useCallback((itemOrKey: string | AppWindow) => {
        const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.key
        setWindows((prev) => {
            const filtered = prev.filter((w) => w.key !== key)
            // Focus the next window in stack (highest zIndex)
            const nextFocus = filtered.reduce((highest, current) =>
                (current.zIndex > (highest?.zIndex ?? -1) ? current : highest), null as AppWindow | null)

            setFocusedWindow(nextFocus)
            return filtered.map(w => ({
                ...w,
                // Re-balance z-indexes after removal
                zIndex: w.zIndex > (prev.find(x => x.key === key)?.zIndex || 0) ? w.zIndex - 1 : w.zIndex
            }))
        })
    }, [])

    const minimizeWindow = useCallback((itemOrKey: string | AppWindow) => {
        const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.key
        setWindows((prev) => prev.map(w => w.key === key ? { ...w, minimized: true } : w))
        setFocusedWindow((prev) => prev?.key === key ? null : prev)
    }, [])

    const updateWindow = useCallback((itemOrKey: string | AppWindow, updates: Partial<AppWindow>) => {
        const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.key
        let updated: AppWindow | null = null
        setWindows((prev) => prev.map(w => {
            if (w.key === key) {
                updated = { ...w, ...updates }
                if (updates.size && !updates.previousSize) updated.previousSize = w.size
                if (updates.position && !updates.previousPosition) updated.previousPosition = w.position
                return updated
            }
            return w
        }))
        return updated
    }, [])

    const updateWindowRef = useCallback((itemOrKey: string | AppWindow, ref: React.RefObject<HTMLDivElement | null>) => {
        const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.key
        setWindows((prev) => prev.map(w => w.key === key ? { ...w, ref } : w))
    }, [])

    const openSearch = useCallback((filter?: string) => {
        const size = isMobile
            ? { width: typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 500) : 400, height: 320 }
            : { width: 600, height: 400 }
        const position = isMobile
            ? { x: typeof window !== 'undefined' ? (window.innerWidth - size.width) / 2 : 16, y: 16 }
            : { x: 100, y: 100 }

        addWindow({
            key: 'search',
            path: '/search',
            title: 'Search',
            size,
            position,
        })
    }, [addWindow, isMobile])

    const handleSnapToSide = useCallback((side: 'left' | 'right') => {
        if (!focusedWindow || !constraintsRef.current) return
        const inset = 0
        const bounds = constraintsRef.current.getBoundingClientRect()
        const width = (bounds.width - inset * 3) / 2
        const height = bounds.height - inset * 2
        updateWindow(focusedWindow, {
            size: { width, height },
            position: { x: side === 'left' ? inset : inset * 2 + width, y: inset }
        })
    }, [focusedWindow, updateWindow])

    const expandWindow = useCallback(() => {
        if (!focusedWindow || !constraintsRef.current) return
        const inset = 0
        const bounds = constraintsRef.current.getBoundingClientRect()
        updateWindow(focusedWindow, {
            size: { width: bounds.width - inset * 2, height: bounds.height - inset * 2 },
            position: { x: inset, y: inset }
        })
    }, [focusedWindow, updateWindow])

    const closeAllWindows = useCallback(() => {
        setWindows([])
        setFocusedWindow(null)
    }, [])

    // Initial window
    useEffect(() => {
        addWindow({
            key: 'posts',
            path: '/posts',
            title: 'Posts',
            size: { width: 900, height: 750 },
            element: <PostsView />
        })
    }, [])


    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
            setCompact(window.innerWidth < 1024)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // URL Sync
    useEffect(() => {
        if (typeof window === 'undefined') return

        const currentPath = window.location.pathname
        const targetPath = focusedWindow?.path || '/'

        if (currentPath !== targetPath) {
            window.history.pushState(null, '', targetPath)
        }
    }, [focusedWindow])

    const value = React.useMemo(() => ({
        windows,
        focusedWindow,
        bringToFront,
        addWindow,
        closeWindow,
        minimizeWindow,
        updateWindow,
        updateWindowRef,
        expandWindow,
        handleSnapToSide,
        getDesktopCenterPosition,
        constraintsRef,
        taskbarRef,
        siteSettings,
        updateSiteSettings: setSiteSettings,
        isActiveWindowsPanelOpen,
        setIsActiveWindowsPanelOpen,
        openSearch,
        closeAllWindows,
        isMobile,
        compact,
        taskbarHeight: 44,
        menu: []
    }), [
        windows, focusedWindow, bringToFront, addWindow, closeWindow, minimizeWindow,
        updateWindow, updateWindowRef, openSearch, expandWindow, handleSnapToSide,
        getDesktopCenterPosition, siteSettings, isActiveWindowsPanelOpen, closeAllWindows,
        isMobile, compact
    ])

    return (
        <Context.Provider value={value}>
            <RadixTooltip.Provider delayDuration={500}>
                {children}
            </RadixTooltip.Provider>
        </Context.Provider>
    )
}

export const useApp = () => {
    const context = useContext(Context)
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider')
    }
    return context
}
