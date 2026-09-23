import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import dynamic from 'next/dynamic'
import qs from 'qs'
import { AppWindow } from '../Window'
import { mergeWindowUpdate, windowModeFlags, buildSnapOverrides, type WindowUpdate } from 'lib/windowState'
import { findAskAiWindow, findNotebookWindow, windowSlot } from 'lib/open-ask-ai-window'
import { resolveWorkspacePresetLayout } from 'lib/os/arrange-workspace'
import { snapLayout } from 'components/AppWindow/SnapAssistOverlay'
import {
    canonicalWindowPath,
    extractNotebookId,
    isArtifactWindowPath,
    isAssistantWindowPath,
    isForumPath,
    isHomeWindowPath,
    repairWindowPath,
} from 'lib/window-path'
import { isVisitingRoom } from 'lib/world-snapshot'
import type { User } from 'hooks/useUser'

type AppSettings = Record<string, any>

const Start = dynamic(() => import('components/Start'), { ssr: false })
const ContactSales = dynamic(() => import('components/ContactSales'), { ssr: false })

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export type WindowElement = any

export type UseWindowRegistryOptions = {
    element: any
    location: any
    isSSR: boolean
    hasMounted: boolean
    taskbarHeight: number
    constraintsRef: React.RefObject<HTMLDivElement>
    lastClickedElementRect: { x: number; y: number } | null
    posthog: any
    signedInUserRef: React.MutableRefObject<User | null | undefined>
    isMobile: boolean
    setAuthModalView: (view: 'sign-in' | 'sign-up' | 'forgot-password') => void
    setIsAuthModalOpen: (open: boolean) => void
    safePush: (url: string, opts?: any) => void
    appSettings: AppSettings
}

export function useWindowRegistry({
    element,
    location,
    isSSR,
    hasMounted,
    taskbarHeight,
    constraintsRef,
    lastClickedElementRect,
    posthog,
    signedInUserRef,
    isMobile,
    setAuthModalView,
    setIsAuthModalOpen,
    safePush,
    appSettings,
}: UseWindowRegistryOptions) {
    const layoutRestoredRef = useRef(false)
    const addWindowRef = useRef<(item: WindowElement | React.ReactElement) => void>()
    const [windowsInView, setWindowsInView] = useState<AppWindow[]>([])
    // Stable ref mirror of windowsInView so consumers that only need the latest value
    // lazily can read it without subscribing to the volatile context and re-rendering on every provider render.
    const windowsInViewRef = useRef(windowsInView)
    useEffect(() => {
        windowsInViewRef.current = windowsInView
    }, [windowsInView])
    const [windows, setWindows] = useState<AppWindow[]>(() => {
        const rawPath = location?.pathname || '/'
        if (rawPath === '/' || rawPath === '/desktop') {
            return []
        }
        // Same tree on the server and the first client render. Contact/login
        // extras are applied in the layout effect after hydration.
        return [createNewWindow(element as WindowElement, [], location, true, taskbarHeight)]
    })
    const windowsRef = useRef(windows)
    useEffect(() => {
        windowsRef.current = windows
    }, [windows])
    const focusedWindow = useMemo(() => {
        return windows.reduce<AppWindow | undefined>(
            (highest, current) => (current.zIndex > (highest?.zIndex ?? -1) ? current : highest),
            undefined
        )
    }, [windows])
    const [closingAllWindowsAnimation, setClosingAllWindowsAnimation] = useState(false)

    // Hydrate mobile window geometry before first paint (mirrors former App.tsx isomorphic branch)
    useIsomorphicLayoutEffect(() => {
        const path = location?.pathname || '/'
        const search = typeof location?.search === 'string' ? location.search : ''
        if (search.includes('contact=') || path === '/login' || path === '/signup') {
            setWindows(getInitialWindows(element))
        }
        const isMobileValue =
            window.innerWidth < 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        if (isMobileValue) {
            const bounds = constraintsRef.current?.getBoundingClientRect()
            const fullW = bounds ? bounds.width : window.innerWidth - 16
            const fullH = bounds ? bounds.height : window.innerHeight - taskbarHeight - 16
            setWindows((prev) =>
                prev.map((w) => ({
                    ...w,
                    size: { width: fullW, height: fullH },
                    expanded: true,
                    windowed: true,
                    position: { x: 0, y: 0 },
                }))
            )
        }
    }, [])
    useEffect(() => {
        if (!hasMounted || isMobile || layoutRestoredRef.current) return
        if (isVisitingRoom()) {
            layoutRestoredRef.current = true
            return
        }

        try {
            const saved = JSON.parse(localStorage.getItem('worldinmaking-window-layout:v1') || '{}')
            if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
                setWindows((prev) =>
                    prev.map((win) => {
                        const stored = saved[win.path]
                        if (
                            !stored ||
                            typeof stored !== 'object' ||
                            typeof stored.size?.width !== 'number' ||
                            typeof stored.size?.height !== 'number' ||
                            typeof stored.position?.x !== 'number' ||
                            typeof stored.position?.y !== 'number'
                        ) {
                            return win
                        }
                        return {
                            ...win,
                            size: { ...win.size, ...stored.size },
                            position: { ...win.position, ...stored.position },
                            expanded: stored.expanded ?? win.expanded,
                            snapped: stored.snapped ?? win.snapped,
                            windowed: stored.windowed ?? win.windowed,
                        }
                    })
                )
            }
        } catch {
            // Ignore malformed layout data and use the default window positions.
            localStorage.removeItem('worldinmaking-window-layout:v1')
        }
        layoutRestoredRef.current = true
    }, [hasMounted, isMobile])

    useEffect(() => {
        if (!layoutRestoredRef.current || isMobile || isVisitingRoom()) return

        const layout = windows.reduce<Record<string, unknown>>((result, win) => {
            if (win.path.startsWith('/')) {
                result[win.path] = {
                    size: win.size,
                    position: win.position,
                    expanded: win.expanded,
                    snapped: win.snapped,
                    windowed: win.windowed,
                }
            }
            return result
        }, {})

        try {
            localStorage.setItem('worldinmaking-window-layout:v1', JSON.stringify(layout))
        } catch {
            // Storage can be unavailable in private browsing or embedded contexts.
        }
    }, [windows, isMobile])
    const desktopParams = useMemo(() => {
        if (isSSR) return undefined
        const innerWidth = window.innerWidth
        const innerHeight = window.innerHeight

        const savedWindows = [...windows]
            .filter((win) => !win.minimized && win.path.startsWith('/'))
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((win) => ({
                path: win.path,
                position: {
                    x: (win.position.x / innerWidth) * 100,
                    y: (win.position.y / (innerHeight - taskbarHeight)) * 100,
                },
                size: {
                    width: (win.size.width / innerWidth) * 100,
                    height: (win.size.height / innerHeight) * 100,
                },
                zIndex: win.zIndex,
                snapped: win.snapped,
            }))

        if (savedWindows.length === 0) return undefined

        // Preserve existing query parameters from the current URL
        const currentParams = qs.parse((typeof location?.search === 'string' ? location.search.substring(1) : ''))
        const allParams = {
            ...currentParams,
            windows: savedWindows,
        }

        return `${location.pathname}?${qs.stringify(allParams, { encode: false })}`
    }, [windows, taskbarHeight, location, isSSR])

    useEffect(() => {
        const handleArrangeWorkspace = (e: Event) => {
            const customEvent = e as CustomEvent
            // Diff Split historically omitted detail; default to split_dual.
            // Unknown presets fail closed (no silent mis-tile).
            const preset = customEvent.detail?.preset || 'split_dual'
            const layout = resolveWorkspacePresetLayout(preset, windowsRef.current)
            if (!layout) return
            if (layout.kind === 'split') {
                addWindowRef.current?.({ path: layout.left, snapped: 'left' })
                addWindowRef.current?.({ path: layout.right, snapped: 'right' })
                return
            }
            addWindowRef.current?.({ path: layout.path })
        }
        window.addEventListener('wimArrangeWorkspace', handleArrangeWorkspace)
        return () => {
            window.removeEventListener('wimArrangeWorkspace', handleArrangeWorkspace)
        }
    }, [])
    const closeWindow = useCallback((itemOrKey?: string | AppWindow) => {
        if (!itemOrKey) return
        const targetKey = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.key || itemOrKey.path
        setWindows((prev) => {
            const filtered = prev.filter((w) => w.key !== targetKey && w.path !== targetKey && w !== itemOrKey)
            const sorted = [...filtered].sort((a, b) => a.zIndex - b.zIndex)
            return sorted.map((w, idx) => ({
                ...w,
                zIndex: idx + 1,
            }))
        })
    }, [])

    const bringToFront = useCallback(
        (
            itemOrKey: string | AppWindow,
            location?: Location,
            additional: {
                expanded?: boolean
                windowed?: boolean
                snapped?: 'left' | 'right' | false
                size?: { width: number; height: number }
                position?: { x: number; y: number }
            } = {}
        ) => {
            const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey?.key || itemOrKey?.path
            setWindows((prev) => {
                const existing = prev.find((w) => w.key === key || w.path === key || w === itemOrKey)
                if (!existing) return prev
                const maxZIndex = Math.max(...prev.map((w) => w.zIndex), 0)
                if (existing.zIndex === maxZIndex && !existing.minimized && Object.keys(additional).length === 0) {
                    return prev
                }

                return prev.map((el) => {
                    const isTarget = el.key === existing.key || el.path === existing.path || el === existing
                    const newZIndex = isTarget ? maxZIndex + 1 : el.zIndex > existing.zIndex ? el.zIndex - 1 : el.zIndex
                    const newMinimized = isTarget ? false : el.minimized
                    const newLocation = isTarget ? location || el.location : el.location

                    if (!isTarget && newZIndex === el.zIndex && newMinimized === el.minimized && newLocation === el.location) {
                        return el
                    }

                    return {
                        ...el,
                        zIndex: newZIndex,
                        minimized: newMinimized,
                        location: newLocation,
                        ...(isTarget ? additional : {}),
                    }
                })
            })
        },
        []
    )

    const setWindowTitle = useCallback((itemOrKey: string | AppWindow, title: string) => {
        const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey?.key || itemOrKey?.path
        setWindows((windows) => {
            let changed = false
            const next = windows.map((w) => {
                if (w.key !== key && w.path !== key && w !== itemOrKey) return w
                if (w.meta?.title === title && w.title === title) return w
                changed = true
                return { ...w, title, meta: { title } }
            })
            return changed ? next : windows
        })
    }, [])

    const minimizeWindow = useCallback((itemOrKey: string | AppWindow) => {
        const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey?.key || itemOrKey?.path
        setWindows((windows) => windows.map((w) => (w.key === key || w.path === key || w === itemOrKey ? { ...w, minimized: true } : w)))
    }, [])

    function getWindowBasedSizeConstraints() {
        const isHydrated = hasMounted && typeof window !== 'undefined'
        const viewportW = isHydrated ? window.innerWidth : 1280
        const viewportH = isHydrated ? window.innerHeight : 800

        return {
            min: {
                width: viewportW * 0.2,
                height: viewportH * 0.2,
            },
            max: {
                width: viewportW * 0.9,
                height: viewportH * 0.9,
            },
        }
    }

    function getDesktopCenterPosition(size: { width: number; height: number }) {
        const isHydrated = hasMounted && typeof window !== 'undefined'
        const viewportW = isHydrated ? window.innerWidth : 1280
        const viewportH = isHydrated ? window.innerHeight : 800

        return {
            x: Math.max(0, viewportW / 2 - size.width / 2),
            y: Math.max(0, (viewportH - taskbarHeight) / 2 - size.height / 2),
        }
    }

    function getPositionDefaults(key: string, size: { width: number; height: number }, windows: AppWindow[]) {
        if (appSettings[key]?.position?.center) {
            return getDesktopCenterPosition(size)
        }

        const isHydrated = hasMounted && typeof window !== 'undefined'
        const viewportW = isHydrated ? window.innerWidth : 1280
        const viewportH = isHydrated ? window.innerHeight : 800

        if (appSettings[key]?.position?.topCenter) {
            const isDesktop = viewportW >= 768
            const topOffset = isDesktop ? 100 : 0

            return {
                x: Math.max(0, viewportW / 2 - size.width / 2),
                y: topOffset,
            }
        }

        if (key?.startsWith('ask-max')) {
            return {
                x: Math.max(0, viewportW - size.width - 20),
                y: Math.max(0, viewportH - size.height - 20),
            }
        }

        const sortedWindows = [...windows].sort((a, b) => b.zIndex - a.zIndex)
        const previousWindow = sortedWindows[0]

        if (previousWindow?.key === '/') {
            return getDesktopCenterPosition(size)
        }

        if (previousWindow && !previousWindow.key?.startsWith('ask-max')) {
            const potentialX = previousWindow.position.x + 10

            const screenMidpoint = viewportW / 2
            const windowRightEdge = potentialX + size.width
            const amountOnRight = Math.max(0, windowRightEdge - screenMidpoint)
            const proportionOnRight = amountOnRight / size.width

            if (proportionOnRight > 2 / 3) {
                return getDesktopCenterPosition(size)
            }

            return {
                x: potentialX,
                y: previousWindow.position.y + 10,
            }
        }

        return getDesktopCenterPosition(size)
    }

    function getInitialSize(key: string) {
        const settings = appSettings[key]
        if (settings?.size?.fixed) {
            return settings.size.min
        }
        const isHydrated = hasMounted && typeof window !== 'undefined'
        const viewportW = isHydrated ? window.innerWidth : 1280
        const viewportH = isHydrated ? window.innerHeight : 800

        const defaultSize =
            settings?.size?.max ||
            (key?.startsWith('ask-max')
                ? appSettings['ask-max']?.size?.max
                : {
                      width: viewportW * 0.9,
                      height: viewportH * 0.9,
                  }) || {
                width: viewportW * 0.9,
                height: viewportH * 0.9,
            }
        return {
            width: Math.min(defaultSize.width, viewportW * 0.9),
            height: Math.min(defaultSize.height, viewportH * 0.9),
        }
    }

    function getLastClickedElementRect() {
        return lastClickedElementRect || undefined
    }

    function getInitialWindows(element: any) {
        const rawPath = location?.pathname || '/'
        if (rawPath === '/' || rawPath === '/desktop') {
            return []
        }
        if (isSSR) {
            return [createNewWindow(element, [], location, isSSR, taskbarHeight)]
        }
        let urlObj: URL | null = null; try { if (location?.href) { urlObj = new URL(location.href, typeof window !== 'undefined' ? window.location.origin : 'https://posthog.com') } } catch { urlObj = null }
        const contact = urlObj?.searchParams.get('contact')
        if (contact) {
            const initialWindowSize = { width: window.innerWidth * 0.58, height: window.innerHeight * 0.8 }
            const formWindowWidth = window.innerWidth * 0.4
            const formWindowSize = {
                width: formWindowWidth,
                height: formWindowWidth <= 545 ? 732 : 568,
            }
            const padding = [65, 20]

            const initialWindow = createNewWindow(element, [], location, isSSR, taskbarHeight, {
                size: initialWindowSize,
                position: { x: padding[0], y: padding[1] },
                zIndex: 2,
            })
            const formWindow = createNewWindow(
                React.createElement(ContactSales as any, {
                    location: { pathname: `/talk-to-a-human` },
                    key: '/talk-to-a-human',
                }),
                [],
                { pathname: `talk-to-a-human` },
                isSSR,
                taskbarHeight,
                {
                    size: formWindowSize,
                    position: {
                        x: window.innerWidth - formWindowSize.width - padding[0],
                        y: window.innerHeight - formWindowSize.height - padding[1] - taskbarHeight,
                    },
                    zIndex: 0,
                }
            )
            return [initialWindow, formWindow]
        }
        if (location.pathname === '/login' || location.pathname === '/signup') {
            const formWindowSize = {
                width: Math.min(480, isSSR ? 480 : window.innerWidth * 0.9),
                height: 580,
            }
            const bgWindow = createNewWindow(
                React.createElement(Start as any, { location: { pathname: `/` }, key: '/' }),
                [],
                { pathname: `/` },
                isSSR,
                taskbarHeight,
                { zIndex: 1 }
            )
            const authWindow = createNewWindow(
                element as WindowElement,
                [],
                location,
                isSSR,
                taskbarHeight,
                {
                    size: formWindowSize,
                    position: {
                        x: isSSR ? 100 : (window.innerWidth - formWindowSize.width) / 2,
                        y: isSSR ? 50 : Math.max(20, (window.innerHeight - formWindowSize.height - taskbarHeight) / 2),
                    },
                    zIndex: 2,
                    windowed: true,
                }
            )
            return [bgWindow, authWindow]
        }
        return [createNewWindow(element, [], location, isSSR, taskbarHeight)]
    }

    function getKey(key: string) {
        if (typeof key === 'string' && (key === '/assistant' || key.startsWith('/assistant/'))) return '/assistant'
        const experiment = appSettings[key]?.experiment
        if (!experiment?.flag) return key
        const assignedVariant = posthog?.getFeatureFlag?.(experiment?.flag)
        if (!assignedVariant) return key
        const keyToUse = Object.keys(appSettings).find(
            (key) =>
                appSettings[key]?.experiment?.flag === experiment?.flag &&
                appSettings[key]?.experiment?.variant === assignedVariant
        )
        return keyToUse || key
    }

    function createNewWindow(
        element: WindowElement,
        windows: AppWindow[],
        location: any,
        isSSR: boolean,
        taskbarHeight: number,
        options = {} as {
            size?: { width: number; height: number }
            position?: { x: number; y: number }
            zIndex?: number
            windowed?: boolean
        }
    ) {
        const el = element as any
        const keyToUse = getKey(el?.key)
        const targetLocation = el?.props?.location || location
        const targetPath = canonicalWindowPath(
            targetLocation?.pathname || (!isSSR && typeof window !== 'undefined' ? window.location.pathname : '/')
        )
        const targetState = targetLocation?.state || {}

        const size = targetState?.size || el?.props?.size || getInitialSize(keyToUse)
        const position =
            targetState?.position ||
            el?.props?.position ||
            appSettings[keyToUse]?.position?.getPositionDefaults?.(size, windows, getDesktopCenterPosition) ||
            getPositionDefaults(keyToUse, size, windows)
        const settings = appSettings[keyToUse]
        const lastClickedElementRect = getLastClickedElementRect()

        // Windowed (centered/cascaded) is default for regular pages so windows stack over each other.
        const isMobileClient =
            !isSSR &&
            typeof window !== 'undefined' &&
            (window.innerWidth < 768 ||
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
        const canWindow = isSSR || (typeof window !== 'undefined' && window.innerWidth >= 768 && !isMobileClient)
        const isWindowed =
            options.windowed ??
            targetState?.windowed ??
            (canWindow &&
                !keyToUse?.startsWith('ask-max') &&
                !settings?.size?.fixed &&
                !el?.props?.minimal &&
                !settings?.modal)
        const shouldExpand = isMobileClient
        const bounds = constraintsRef.current?.getBoundingClientRect()
        const fullW = bounds ? bounds.width : !isSSR && typeof window !== 'undefined' ? window.innerWidth - 16 : 1200
        const fullH = bounds
            ? bounds.height
            : !isSSR && typeof window !== 'undefined'
              ? window.innerHeight - taskbarHeight - 16
              : 800

        const finalSize = shouldExpand ? { width: fullW, height: fullH } : size
        const finalPos = shouldExpand ? { x: 0, y: 0 } : position

        const maxZ = Math.max(...windows.map((w) => w.zIndex), 0)
        const newWindow: AppWindow = {
            element: el as React.ReactNode,
            zIndex: options.zIndex ?? maxZ + 1,
            key: el?.key,
            coordinates: location?.state?.coordinates || { x: 0, y: 0 },
            minimized: false,
            path: targetPath,
            fromHistory: location?.state?.fromHistory || false,
            props: {
                pageContext: el?.props?.pageContext,
                data: el?.props?.data,
                params: el?.props?.params,
                path: targetPath,
            },
            size: options.size || finalSize,
            previousSize: size,
            position: options.position || finalPos,
            previousPosition: position,
            sizeConstraints:
                settings?.size?.fixed && settings.size
                    ? { min: settings.size.min, max: settings.size.max }
                    : getWindowBasedSizeConstraints(),
            fixedSize: settings?.size?.fixed || false,
            fromOrigin: (() => {
                const rawOrigin = targetState?.fromOrigin || lastClickedElementRect
                if (!rawOrigin) return undefined
                const winWidth = options.size?.width || finalSize.width || 600
                const winHeight = options.size?.height || finalSize.height || 400
                return {
                    x: Math.round(rawOrigin.x - winWidth / 2),
                    y: Math.round(rawOrigin.y - winHeight / 2),
                }
            })(),
            minimal: el?.props?.minimal ?? false,
            appSettings: appSettings[keyToUse],
            location: targetLocation,
            expanded: shouldExpand,
            snapped: false,
            windowed: isWindowed,
        }

        if (!newWindow.expanded) {
            // Adjust width if window extends beyond right edge
            if (newWindow.position.x + newWindow.size.width > (isSSR ? 0 : window.innerWidth) - 20) {
                newWindow.size.width = isSSR ? 0 : window.innerWidth - newWindow.position.x - 20
            }

            // Adjust height if window extends beyond bottom edge
            if (newWindow.position.y + newWindow.size.height > (isSSR ? 0 : window.innerHeight) - taskbarHeight - 20) {
                newWindow.size.height = isSSR ? 0 : window.innerHeight - newWindow.position.y - taskbarHeight - 20
            }
        }

        return { ...newWindow, ...options }
    }

    const updatePages = (element: WindowElement) => {
        const targetPath = canonicalWindowPath(
            element?.props?.location?.pathname ||
                location?.pathname ||
                (typeof window !== 'undefined' ? window.location.pathname : '/')
        )
        if (isHomeWindowPath(targetPath) && signedInUserRef.current) {
            return
        }
        const targetLocation = element?.props?.location || location
        const existingWindow = windows.find((w) => w.path === targetPath)
        const newWindow = createNewWindow(element, windows, location, isSSR, taskbarHeight)

        const isMobileClient =
            typeof window !== 'undefined' &&
            (window.innerWidth < 768 ||
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
        if (isMobileClient) {
            const bounds = constraintsRef.current?.getBoundingClientRect()
            const fullW = bounds ? bounds.width : window.innerWidth - 16
            const fullH = bounds ? bounds.height : window.innerHeight - taskbarHeight - 16
            newWindow.expanded = true
            newWindow.windowed = true
            newWindow.snapped = false
            newWindow.size = { width: fullW, height: fullH }
            newWindow.position = { x: 0, y: 0 }
        } else {
            newWindow.snapped = false
            newWindow.expanded = false
            newWindow.windowed = true
        }

        if (existingWindow) {
            bringToFront(existingWindow, targetLocation)
        } else if (newWindow.appSettings?.size?.fixed) {
            setWindows([...windows.filter((w) => !w.appSettings?.size?.fixed), newWindow])
        } else {
            setWindows([...windows, newWindow])
        }
    }

    const addWindow = (item: WindowElement | React.ReactElement) => {
        if (React.isValidElement(item)) {
            updatePages(item as any)
            return
        }

        const key = item.key || item.path
        const path = canonicalWindowPath(item.path || '/')
        const alreadyOpen = windowsRef.current.some((w) => w.key === key || w.path === path)
        if (path === '/login' || path.startsWith('/login')) {
            setAuthModalView('sign-in')
            setIsAuthModalOpen(true)
            return
        }
        if (path === '/signup' || path.startsWith('/signup')) {
            setAuthModalView('sign-up')
            setIsAuthModalOpen(true)
            return
        }
        if (path.startsWith('/auth')) {
            return
        }
        if (isHomeWindowPath(path) && signedInUserRef.current) {
            return
        }

        setWindows((prev) => {
            const isMobileClient =
                typeof window !== 'undefined' &&
                (window.innerWidth < 768 ||
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
            const bounds = constraintsRef.current?.getBoundingClientRect()
            const fullW = bounds ? bounds.width : (typeof window !== 'undefined' ? window.innerWidth - 16 : 1200)
            const fullH = bounds ? bounds.height : (typeof window !== 'undefined' ? window.innerHeight - taskbarHeight - 16 : 800)

            const snappedSide = item.snapped === 'left' || item.snapped === 'right' ? item.snapped : false
            const snapRect =
                !isMobileClient && snappedSide ? getSnapDimensions(snappedSide) : null

            const applySnapOverrides = (w: AppWindow) => buildSnapOverrides(snappedSide, w, snapRect)

            if (isAssistantWindowPath(path)) {
                const existingAssistant = prev.find((w) => isAssistantWindowPath(w.path))
                if (existingAssistant) {
                    const maxZ = Math.max(...prev.map((w) => w.zIndex), 0)
                    return prev.map((w) =>
                        w.key === existingAssistant.key
                            ? {
                                  ...w,
                                  path,
                                  zIndex: maxZ + 1,
                                  minimized: false,
                                  props: { ...w.props, path },
                                  ...applySnapOverrides(w),
                              }
                            : w
                    )
                }
            }

            if (isForumPath(path)) {
                const existingForum = prev.find((w) => isForumPath(w.path))
                if (existingForum) {
                    const maxZ = Math.max(...prev.map((w) => w.zIndex), 0)
                    // Thread slug only (wimpos params.permalink) — not topic/list routes
                    const threadMatch = path.match(
                        /^\/(?:questions|forum)\/(?!topic(?:\/|$)|subscriptions(?:\/|$))([^/?#]+)\/?$/
                    )
                    const permalink = threadMatch?.[1]
                    // Keep existing key stable — changing key remounts AppWindow and kills panel state
                    return prev.map((w) =>
                        w.key === existingForum.key
                            ? {
                                  ...w,
                                  path,
                                  zIndex: maxZ + 1,
                                  minimized: false,
                                  props: { ...w.props, path, permalink },
                                  ...applySnapOverrides(w),
                              }
                            : w
                    )
                }
            }

            const existing = prev.find((w) => w.key === key || w.path === path)
            if (existing) {
                const maxZ = Math.max(...prev.map((w) => w.zIndex), 0)
                const refreshPreview = isArtifactWindowPath(path)
                return prev.map((w) =>
                    w.key === existing.key
                        ? {
                              ...w,
                              path,
                              zIndex: maxZ + 1,
                              minimized: false,
                              ...(refreshPreview
                                  ? {
                                        element: item.element ?? w.element,
                                        title: item.title || w.title,
                                        props: { ...w.props, ...(item.props || {}), path },
                                    }
                                  : { props: { ...w.props, path } }),
                              ...applySnapOverrides(w),
                          }
                        : w
                )
            }
            const size = isMobileClient
                ? { width: fullW, height: fullH }
                : snapRect?.size || item.size || { width: 900, height: 650 }
            const position = isMobileClient
                ? { x: 0, y: 0 }
                : snapRect?.position || item.position || getPositionDefaults(key, size, prev)
            const maxZ = Math.max(...prev.map((w) => w.zIndex), 0)
            const notebookId = extractNotebookId(path)
            const lastSeg = path.split('/').pop() || 'Window'
            const givenTitle = item.title && item.title !== notebookId && item.title !== lastSeg ? item.title : ''
            const windowTitle =
                givenTitle ||
                (path === '/archive'
                    ? 'Archive'
                    : path === '/home' || path === '/'
                    ? 'Home'
                    : path === '/workspace-chat' || path.startsWith('/workspace-chat/')
                    ? 'WIM AI'
                    : path === '/pricing'
                    ? 'Study'
                    : path === '/study' || path.startsWith('/study/') || path.startsWith('/study?')
                    ? 'Flashcards'
                    : path === '/account'
                    ? 'Account'
                    : path === '/terms'
                    ? 'Terms'
                    : path === '/privacy'
                    ? 'Privacy'
                    : path === '/cookies'
                    ? 'Cookies'
                    : path === '/refund'
                    ? 'Refund'
                    : path === '/guidelines'
                    ? 'Community'
                    : path === '/copyright'
                    ? 'Copyright'
                    : path === '/dpa'
                    ? 'DPA'
                    : path === '/baa'
                    ? 'BAA'
                    : path === '/subprocessors'
                    ? 'Subprocessors'
                    : path === '/posts' || path === '/blog'
                    ? 'Posts'
                    : path === '/login' || path === '/signup'
                    ? 'Sign In'
                    : path.startsWith('/profile')
                    ? 'Profile'
                    : notebookId
                    ? 'Notebook'
                    : path.startsWith('/notebooks')
                    ? 'Notebooks'
                    : lastSeg)

            const newWin: AppWindow = {
                key,
                path,
                title: windowTitle,
                size,
                position,
                previousSize: item.size || { width: 900, height: 650 },
                previousPosition: item.position || { x: 50, y: 50 },
                sizeConstraints: item.sizeConstraints || {
                    min: { width: 280, height: 180 },
                    max: { width: fullW, height: fullH },
                },
                fixedSize: item.fixedSize || false,
                element: item.element,
                meta: { title: windowTitle },
                zIndex: maxZ + 1,
                minimized: false,
                windowed: true,
                expanded: isMobileClient || item.expanded,
                snapped: isMobileClient ? false : snappedSide,
                fromOrigin: item.fromOrigin ? {
                    x: Math.round(item.fromOrigin.x - size.width / 2),
                    y: Math.round(item.fromOrigin.y - size.height / 2),
                } : undefined,
                props: { path },
            }
            return [...prev, newWin]
        })

        if (!alreadyOpen && typeof window !== 'undefined' && window.history) {
            try {
                window.history.pushState({ windowKey: key }, '', path)
            } catch (e) {
                console.error(e)
            }
        }
    }

    const updateWindowRef = (appWindow: AppWindow, ref: React.RefObject<HTMLDivElement>) => {
        setWindows((windows) => windows.map((w) => (w.key === appWindow.key ? { ...w, ref } : w)))
    }

    const updateWindow = (
        appWindow: AppWindow,
        updates: WindowUpdate
    ) => {
        let nextWindow: AppWindow | undefined
        setWindows((windows) =>
            windows.map((window) => {
                if (window.key !== appWindow.key) return window

                nextWindow = mergeWindowUpdate(window, updates)
                return nextWindow
            })
        )
        // React state updates are batched, so the callback result is not
        // synchronously available. Callers only need a window identity here.
        return nextWindow || appWindow
    }
    function getDesktopSize() {
        const bounds = constraintsRef.current?.getBoundingClientRect()
        if (bounds) return { width: bounds.width, height: bounds.height }
        if (isSSR) return { width: 0, height: 0 }
        return {
            width: Math.max(0, window.innerWidth - 16),
            height: Math.max(0, window.innerHeight - taskbarHeight - 16),
        }
    }

    function getSnapDimensions(side: 'left' | 'right') {
        // Windows live inside constraintsRef. Using #taskbar.left here treated a
        // viewport inset as a desktop-local x, so the left half sat inward of the header
        // while the right half clipped flush. Commit with pad 0 so both edges match the header.
        const layout = snapLayout(side, getDesktopSize(), 0)
        return {
            size: { width: layout.width, height: layout.height },
            position: { x: layout.x, y: layout.y },
        }
    }

    const handleSnapToSide = (side: 'left' | 'right', target?: AppWindow) => {
        const windowToSnap = target ?? focusedWindow
        if (!constraintsRef.current || !windowToSnap) return

        const { size, position } = getSnapDimensions(side)

        let prevSize = windowToSnap.size
        let prevPos = windowToSnap.position
        if (windowToSnap.expanded) {
            const cr = constraintsRef.current.getBoundingClientRect()
            prevSize = { width: cr.width - 16, height: cr.height - 8 }
            prevPos = { x: 8, y: 0 }
        }

        updateWindow(windowToSnap, {
            position,
            size,
            previousSize: prevSize,
            previousPosition: prevPos,
            ...windowModeFlags(side === 'left' ? 'snapped-left' : 'snapped-right'),
        })

        const slot = windowSlot(windowToSnap)
        if (!slot) return
        const mate =
            slot === 'notebook' ? findAskAiWindow(windows) : findNotebookWindow(windows)
        if (!mate || mate.key === windowToSnap.key) return
        const otherSide = side === 'left' ? 'right' : 'left'
        const other = getSnapDimensions(otherSide)
        updateWindow(mate, {
            position: other.position,
            size: other.size,
            ...windowModeFlags(otherSide === 'left' ? 'snapped-left' : 'snapped-right'),
        })
    }

    function getExpandedDimensions() {
        const layout = snapLayout('maximize', getDesktopSize(), 0)
        return {
            position: { x: layout.x, y: layout.y },
            size: { width: layout.width, height: layout.height },
        }
    }

    const expandWindow = (target?: AppWindow) => {
        const windowToExpand = target ?? focusedWindow
        if (!windowToExpand) return
        // When expanding a side-by-side (snapped) window, drop the other snapped
        // window(s) so the one being expanded takes over the whole screen. Sync the
        // URL to it without re-running the page/window setup (skipPageUpdate).
        const dropSnappedSiblings = !!windowToExpand.snapped
        if (dropSnappedSiblings && windowToExpand.path.startsWith('/')) {
            safePush(`${windowToExpand.path}${windowToExpand.location?.search || ''}`, {
                state: { skipPageUpdate: true },
            })
        }
        setWindows((windows) =>
            windows
                .filter(
                    (w) => !(dropSnappedSiblings && w.key !== windowToExpand.key && w.snapped && !w.appSettings?.size?.fixed)
                )
                .map((w) =>
                    w.key === windowToExpand.key
                        ? {
                              ...w,
                              previousSize: w.size,
                              previousPosition: w.position,
                              ...windowModeFlags('maximized'),
                              zIndex: windows.length,
                          }
                        : w
                )
        )
    }
    const animateClosingAllWindows = () => {
        setClosingAllWindowsAnimation(true)
    }

    const closeAllWindows = () => {
        setWindows([])
        setClosingAllWindowsAnimation(false)
    }
    useEffect(() => {
        if (typeof window === 'undefined') return
        const live = window.location.pathname
        setWindows((prev) => {
            let changed = false
            const next = prev.map((w) => {
                const fixed = repairWindowPath(w.path || '', live)
                if (fixed === (w.path || '')) return w
                changed = true
                return { ...w, path: fixed, props: { ...w.props, path: fixed } }
            })
            return changed ? next : prev
        })
    }, [location?.pathname])

    useEffect(() => {
        if (!location?.href) return
        try {
            let urlObj: URL | null = null; try { if (location?.href) { urlObj = new URL(location.href, typeof window !== 'undefined' ? window.location.origin : 'https://posthog.com') } } catch { urlObj = null }
            const queryString = urlObj?.search?.substring(1) || ''
            const parsed = qs.parse(queryString)
            if (parsed?.windows || (location as any)?.state?.skipPageUpdate) {
                return
            }
            updatePages(element as any)
        } catch (e) {
            updatePages(element as any)
        }
    }, [location?.pathname, (element as any)?.key])
    const stateWindows = (element as any)?.props?.location?.state?.savedWindows
    useEffect(() => {
        const newWindows = windows.map((w) => ({ ...w, modal: undefined }))
        setWindows(newWindows)
    }, [])

    const convertWindowsToPixels = (windows: any[]) => {
        const innerWidth = window.innerWidth
        const innerHeight = window.innerHeight

        return windows.map((win) => ({
            ...win,
            size: {
                width: (parseFloat(win.size.width) / 100) * innerWidth,
                height: (parseFloat(win.size.height) / 100) * innerHeight,
            },
            position: {
                x: (parseFloat(win.position.x) / 100) * innerWidth,
                y: (parseFloat(win.position.y) / 100) * (innerHeight - taskbarHeight),
            },
        }))
    }

    useEffect(() => {
        if (isSSR) return

        let urlObj: URL | null = null; try { if (location?.href) { urlObj = new URL(location.href, typeof window !== 'undefined' ? window.location.origin : 'https://posthog.com') } } catch { urlObj = null }
        const queryString = urlObj?.search.substring(1)
        const parsed = qs.parse(queryString || '')
        const paramsWindows = parsed?.windows

        if (paramsWindows && Array.isArray(paramsWindows)) {
            const [initialWindow, ...rest] = convertWindowsToPixels(paramsWindows as any[])

            // Preserve non-windows query parameters when navigating
            const nonWindowsParams = { ...parsed }
            delete nonWindowsParams.windows
            const nonWindowsQueryString =
                Object.keys(nonWindowsParams).length > 0 ? `?${qs.stringify(nonWindowsParams, { encode: false })}` : ''

            safePush(`${initialWindow.path}${nonWindowsQueryString}`, {
                state: {
                    newWindow: true,
                    size: initialWindow.size,
                    position: initialWindow.position,
                    savedWindows: rest,
                },
            })
        }

        if (stateWindows) {
            const [nextWindow, ...rest] = stateWindows
            if (!nextWindow) return

            // Preserve query parameters from current URL when navigating to next window
            const currentParams = qs.parse((typeof location?.search === 'string' ? location.search.substring(1) : ''))
            delete currentParams.windows
            const currentQueryString =
                Object.keys(currentParams).length > 0 ? `?${qs.stringify(currentParams, { encode: false })}` : ''

            safePush(`${nextWindow.path}${currentQueryString}`, {
                state: {
                    newWindow: true,
                    size: nextWindow.size,
                    position: nextWindow.position,
                    savedWindows: rest.length > 0 ? rest : undefined,
                },
            })
        }
    }, [stateWindows])

    useEffect(() => {
        const visibleWindows = windows.filter((window) => {
            if (window.minimized) return false
            if (window.expanded) return true

            const windowsAbove = windows.filter((w) => w !== window && w.zIndex > window.zIndex && !w.minimized)

            let coveredArea = 0
            const currentArea = window.size.width * window.size.height

            for (const windowAbove of windowsAbove) {
                const left = Math.max(window.position.x, windowAbove.position.x)
                const right = Math.min(
                    window.position.x + window.size.width,
                    windowAbove.position.x + windowAbove.size.width
                )
                const top = Math.max(window.position.y, windowAbove.position.y)
                const bottom = Math.min(
                    window.position.y + window.size.height,
                    windowAbove.position.y + windowAbove.size.height
                )

                if (left < right && top < bottom) {
                    coveredArea += (right - left) * (bottom - top)
                }
            }

            const coverageRatio = currentArea > 0 ? coveredArea / currentArea : 0
            return coverageRatio < 0.8
        })

        setWindowsInView(visibleWindows)
    }, [windows])

    // Keep addWindow ref fresh for registry-owned listeners (wimArrangeWorkspace)
    addWindowRef.current = addWindow

    return {
        windows,
        setWindows,
        windowsRef,
        focusedWindow,
        windowsInView,
        windowsInViewRef,
        layoutRestoredRef,
        closingAllWindowsAnimation,
        setClosingAllWindowsAnimation,
        desktopParams,
        closeWindow,
        bringToFront,
        setWindowTitle,
        minimizeWindow,
        addWindow,
        updateWindowRef,
        updateWindow,
        getPositionDefaults,
        getDesktopCenterPosition,
        getSnapDimensions,
        handleSnapToSide,
        expandWindow,
        getExpandedDimensions,
        animateClosingAllWindows,
        closeAllWindows,
    }
}
