import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import {
    AnimatePresence,
    motion,
    useDragControls,

} from 'framer-motion'
import { MenuItem, useApp } from '../../context/App'
import { Provider as WindowProvider, AppWindow as AppWindowType, useWindow } from '../../context/Window'
import type { MenuItemType } from 'components/RadixUI/MenuBar'
import { IMenu } from 'components/PostLayout/types'
import { useRouter } from 'next/router'
import { useToast } from '../../context/Toast'
import usePostHog from '../../hooks/usePostHog'
import { MOTION_LAYER, WINDOW_BG } from '../../constants/frostedSurfaces'
import { isMaximizedWindow, transitionWindowMode, windowModeFlags } from 'lib/windowState'
import { useWindowPhysics } from 'hooks/useWindowPhysics'
import { useWindowResize } from 'hooks/useWindowResize'
import { useWindowManager } from 'hooks/useWindowManager'
import { useWindowHistory } from 'hooks/useWindowHistory'
import { useWindowShortcuts } from 'hooks/useWindowShortcuts'
import WindowResizeHandles from './WindowResizeHandles'
import WindowChrome from './WindowChrome'
import WindowContent from './WindowContent'
import WindowRouter from './WindowRouter'
import SnapAssistOverlay, { type SnapZone } from './SnapAssistOverlay'
import { ACTIVE_WINDOWS_PANEL_RESERVE, layoutMissionControlWindow } from '../../lib/mission-control-layout'

const recursiveSearch = (array: MenuItem[] | undefined, value: string): boolean => {
    if (!array) return false

    for (let i = 0; i < array.length; i++) {
        const element = array[i]

        if (element.url?.split('?')[0] === value) {
            return true
        }

        if (element.children) {
            const found = recursiveSearch(element.children, value)
            if (found) {
                return true
            }
        }
    }

    return false
}

const WindowContainer = ({ children, closing }: { children: React.ReactNode; closing: boolean }) => {
    const { closeWindow } = useApp()
    const { appWindow } = useWindow()
    if (appWindow?.minimized) {
        return null
    }
    return (
        <AnimatePresence
            onExitComplete={() => {
                if (closing && appWindow) {
                    closeWindow(appWindow)
                }
            }}
        >
            {!closing && children}
        </AnimatePresence>
    )
}

function AppWindow({ item, chrome = true }: { item: AppWindowType; chrome?: boolean }) {
    const { toasts } = useToast()
    const {
        minimizeWindow,
        bringToFront,
        focusedWindow,
        taskbarHeight,
        windows,
        updateWindowRef,
        updateWindow,
        handleSnapToSide,
        constraintsRef,
        expandWindow,
        siteSettings,
        compact,
        menu: appMenu,
        isActiveWindowsPanelOpen,
        addWindow,
        isMobile,
        closingAllWindowsAnimation,
    } = useApp()

    const navigate = useCallback(
        (path: string) => {
            updateWindow(item, { path })
        },
        [item, updateWindow]
    )

    const { motionX, motionY, tiltX, tiltY, resetPhysics } = useWindowPhysics()

    const isSSR = typeof window === 'undefined'
    const controls = useDragControls()
    // A few lightweight windows are created from partial descriptors (for example
    // chat shortcuts). Keep resize resilient when those descriptors have not been
    // normalized with full window constraints yet.
    const sizeConstraints = item.sizeConstraints ?? {
        min: { width: 280, height: 180 },
        max: {
            width: typeof window !== 'undefined' ? window.innerWidth : 1920,
            height: typeof window !== 'undefined' ? window.innerHeight : 1200,
        },
    }
    const size = item.size
    const position = item.position

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
    const [snapIndicator, setSnapIndicator] = useState<SnapZone | null>(null)
    const [menu, setMenu] = useState<IMenu[]>([])
    const { canGoBack, canGoForward, goBack, goForward } = useWindowHistory(item)
    const router = useRouter()
    const windowRef = useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = useState(false)
    const [pageOptions, setPageOptions] = useState<MenuItemType[]>()
    const [closing, setClosing] = useState(false)
    const { handleDragResize, handleResizeEnd, isResizing } = useWindowResize({
        item,
        size,
        position,
        sizeConstraints,
        taskbarHeight,
        constraintsRef,
        windowRef,
        isSSR,
        updateWindow,
    })
    const { handleDrag, handleDragEnd } = useWindowManager({
        item,
        position,
        size,
        constraintsRef,
        windowRef,
        isDragging: dragging,
        snapIndicator,
        setDragging,
        setSnapIndicator,
        handleSnapToSide,
        expandWindow,
        updateWindow,
    })
    // The open animation should only play once, on mount. `playOpenAnimation` is
    // decided from mount-time props and cleared when the animation finishes, so
    // later state changes (expand/collapse) never replay the pop-in.
    const [playOpenAnimation, setPlayOpenAnimation] = useState(!!item.fromOrigin)
    const skipsOpenAnimation = !playOpenAnimation
    const [animating, setAnimating] = useState(playOpenAnimation)
    const animationStartTimeRef = useRef<number | null>(null)
    const posthog = usePostHog()
    const [view, setView] = useState<'marketing' | 'developer'>('marketing')
    const [hasDeveloperMode, setHasDeveloperMode] = useState(false)
    const hasToolbar = item.appSettings?.toolbar
    const hideTitle = item.appSettings?.hideTitle
    const isCompositorActive = animating || dragging || isResizing || closing
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

    const safeAppMenu = Array.isArray(appMenu) ? appMenu : []
    const parent =
        safeAppMenu.find(({ children, url }: any) => {
            const currentURL = item?.path
            return currentURL === url?.split('?')[0] || recursiveSearch(children, currentURL)
        }) ||
        safeAppMenu.find(({ url }: any) => url === `/${item?.path?.split('/')[1]}`) ||
        safeAppMenu.find(({ name }: any) => name === 'Docs')

    const internalMenu = parent?.children || []

    const getActiveInternalMenu = useCallback(() => {
        return internalMenu?.find((menuItem: MenuItem) => {
            const currentURL = item?.path
            return currentURL === menuItem.url?.split('?')[0] || recursiveSearch(menuItem.children, currentURL)
        })
    }, [internalMenu, item])

    const [activeInternalMenu, setActiveInternalMenu] = useState<MenuItem | undefined>(getActiveInternalMenu())

    useEffect(() => {
        setMenu?.(internalMenu)
    }, [activeInternalMenu])

    useEffect(() => {
        if (windowRef.current) {
            updateWindowRef(item, windowRef)
        }
    }, [windowRef.current])

    useEffect(() => {
        if (focusedWindow?.key === item.key) {
            windowRef.current?.focus({ preventScroll: true })
        }
    }, [focusedWindow?.key, item.key])

    const toggleExpanded = () => {
        if (item.fixedSize) return
        const bounds = constraintsRef.current?.getBoundingClientRect()
        const fullW = bounds ? bounds.width : (typeof window !== 'undefined' ? window.innerWidth - 16 : 1200)
        const fullH = bounds ? bounds.height : (typeof window !== 'undefined' ? window.innerHeight - taskbarHeight : 800)

        const isMax = isMaximizedWindow(item) || (item.size.width >= fullW - 10 && item.size.height >= fullH - 10)

        if (isMax) {
            const prevSize = isMobile
                ? {
                      width: Math.min(item.previousSize?.width || fullW * 0.9, fullW * 0.92),
                      height: Math.min(item.previousSize?.height || fullH * 0.78, fullH * 0.78),
                  }
                : item.previousSize || {
                      width: Math.min(900, fullW * 0.8),
                      height: Math.min(650, fullH * 0.8),
                  }
            const prevPos = isMobile
                ? { x: Math.max(0, (fullW - prevSize.width) / 2), y: Math.max(0, (fullH - prevSize.height) / 2) }
                : item.previousPosition || {
                      x: Math.max(0, (fullW - prevSize.width) / 2),
                      y: Math.max(0, (fullH - prevSize.height) / 2),
                  }
            updateWindow(item, {
                size: prevSize,
                position: prevPos,
                ...windowModeFlags(transitionWindowMode('maximized', { type: 'toggle-maximize' })),
            })
        } else {
            updateWindow(item, {
                previousSize: item.size,
                previousPosition: item.position,
                size: { width: fullW, height: fullH },
                position: { x: 0, y: 0 },
                ...windowModeFlags(transitionWindowMode('normal', { type: 'toggle-maximize' })),
            })
        }
    }

    const handleDoubleClick = () => {
        toggleExpanded()
    }

    useEffect(() => {
        setActiveInternalMenu(getActiveInternalMenu())
    }, [item?.path, getActiveInternalMenu])

    const handleMouseDown = () => {
        if (focusedWindow === item) return
        // Mobile: never router.push on focus — pushState thread URLs would get wiped back
        // to the stale window path (e.g. /questions) and the forum detail panel would close
        // mid-scroll / mid-touch. Just raise z-index.
        if (isMobile) {
            bringToFront(item)
            return
        }
        // Desktop: if the browser is already on a deeper path under this window (forum thread),
        // don't clobber it with a shallower item.path.
        try {
            const browserPath = typeof window !== 'undefined' ? window.location.pathname : ''
            const windowPath = item.path || ''
            if (
                windowPath.startsWith('/') &&
                browserPath.startsWith(windowPath) &&
                browserPath.length > windowPath.length
            ) {
                bringToFront(item)
                return
            }
            // Forum shell always lives at /questions/* — never force-navigate to list root on focus
            if (windowPath === '/questions' && browserPath.startsWith('/questions/')) {
                bringToFront(item)
                return
            }
        } catch {
            /* ignore */
        }
        if (item.path.startsWith('/')) {
            let next = `${item.path}${item.location?.search || ''}`
            if (/\[[^\]]+\]/.test(next)) {
                if (
                    typeof window !== 'undefined' &&
                    window.location.pathname &&
                    !/\[[^\]]+\]/.test(window.location.pathname)
                ) {
                    next = `${window.location.pathname}${window.location.search || ''}`
                } else {
                    bringToFront(item)
                    return
                }
            }
            const current = `${router.asPath.split('#')[0]}`
            if (current !== next) {
                void router.push(next)
            } else {
                bringToFront(item)
            }
        } else {
            bringToFront(item)
        }
    }

    const handleClose = useCallback(() => {
        setClosing(true)
    }, [])

    useWindowShortcuts({
        item,
        focusedWindow,
        closing,
        compact: !!compact,
        isMobile: !!isMobile,
        expandWindow,
        handleSnapToSide,
        handleClose,
        setClosing,
        closingAllWindowsAnimation: !!closingAllWindowsAnimation,
    })

    const onAnimationStart = () => {
        animationStartTimeRef.current = performance.now()
    }
    const onAnimationComplete = () => {
        setAnimating(false)
        setPlayOpenAnimation(false)
        const endTime = performance.now()
        const startTime = animationStartTimeRef.current || 0
        const duration = endTime - startTime
        if (
            duration > 700 &&
            !siteSettings.performanceBoost &&
            !toasts.some((toast) => toast.title === 'Animations running slow')
        ) {
            posthog?.capture('animation_performance_reduced')
            // addToast({
            //     title: 'Animations may be affecting performance',
            //     description: 'You can turn off animations to improve performance if needed.',
            //     actionLabel: 'Disable animations',
            //     onAction: () => {
            //         posthog?.capture('animation_performance_toast_action')
            //         updateSiteSettings({ ...siteSettings, performanceBoost: true })
            //         addToast({
            //             title: 'Animations have been disabled',
            //             description: (
            //                 <p className="max-w-sm">
            //                     Animations have been turned off to improve performance. You can change this setting in{' '}
            //                     <Link
            //                         to="/display-options"
            //                         className="font-semibold underline"
            //                         state={{ newWindow: true }}
            //                     >
            //                         display options
            //                     </Link>
            //                 </p>
            //             ),
            //             duration: 2000,
            //             onUndo: () => {
            //                 updateSiteSettings({ ...siteSettings, performanceBoost: false })
            //             },
            //         })
            //     },
            //     duration: 8000,
            // })
        }
        animationStartTimeRef.current = null
    }

    return (
        <WindowProvider
            appWindow={item}
            menu={menu}
            setMenu={setMenu}
            goBack={goBack}
            goForward={goForward}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            dragControls={controls}
            setPageOptions={setPageOptions}
            pageOptions={pageOptions}
            activeInternalMenu={activeInternalMenu}
            setActiveInternalMenu={setActiveInternalMenu}
            internalMenu={internalMenu}
            parent={parent || { name: '', url: '', children: [] }}
            view={view}
            setView={setView}
            hasDeveloperMode={hasDeveloperMode}
            setHasDeveloperMode={setHasDeveloperMode}
            animating={animating}
            addWindow={addWindow}
            navigate={navigate}
        >
            <WindowContainer closing={closing}>
                {snapIndicator && constraintsRef.current ? (
                    <SnapAssistOverlay
                        zone={snapIndicator}
                        bounds={constraintsRef.current.getBoundingClientRect()}
                    />
                ) : null}
                {item.appSettings?.size?.fixed && (
                    <div
                        // Ignore scroll-end ghost clicks (common on mobile after touchmove)
                        onPointerDown={(e) => {
                            (e.currentTarget as HTMLElement).dataset.pointerY = String(e.clientY)
                            ;(e.currentTarget as HTMLElement).dataset.pointerX = String(e.clientX)
                        }}
                        onClick={(e) => {
                            const el = e.currentTarget as HTMLElement
                            const startX = Number(el.dataset.pointerX || 0)
                            const startY = Number(el.dataset.pointerY || 0)
                            const moved =
                                Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10
                            if (moved) return
                            handleClose()
                        }}
                        className={`fixed inset-0 z-50 bg-black/50 ${
                            closing ? 'animate-overlay-fade-out' : !skipsOpenAnimation ? 'animate-overlay-fade-in' : ''
                        }`}
                    />
                )}
                <motion.div
                    onPointerDownCapture={handleMouseDown}
                    ref={(el: HTMLDivElement | null) => {
                        const mutableRef = windowRef as React.MutableRefObject<HTMLDivElement | null>
                        mutableRef.current = el
                        if (el && !skipsOpenAnimation) {
                            onAnimationStart()
                        }
                    }}
                    data-app="AppWindow"
                    data-path={item.path || undefined}
                    data-fixed-size={item.appSettings?.size?.fixed || undefined}
                    data-expanded={item.expanded || undefined}
                    data-windowed={item.windowed || undefined}
                    data-snapped={item.snapped || undefined}
                    role="dialog"
                    aria-label={item.meta?.title || item.path || 'Window'}
                    aria-modal={item.modal?.type === 'standard' || undefined}
                    tabIndex={-1}
                    data-scheme="tertiary"
                    className={`group @container absolute overflow-hidden pointer-events-auto !select-auto flex flex-col border transition-shadow duration-200 ${
                        focusedWindow === item.key
                            ? 'border-primary/90 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)]'
                            : 'border-primary/40 shadow-sm opacity-[0.985]'
                    } ${WINDOW_BG} ${
                        isCompositorActive ? MOTION_LAYER : ''
                    } ${
                        item.expanded
                            ? 'border-t-0 rounded-t-none rounded-b-lg !shadow-none'
                            : item.snapped
                            ? `border-t-0 !shadow-none ${
                                  item.snapped === 'left'
                                      ? 'rounded-tl-none rounded-tr-none rounded-br-none rounded-bl-lg'
                                      : 'rounded-tl-none rounded-tr-none rounded-bl-none rounded-br-lg'
                              }`
                            : 'rounded-lg'
                    }`}
                    style={{
                        pointerEvents: 'auto',
                        // Position with left/top — NOT transform x/y.
                        // Any CSS transform on this node (incl. translate3d(0,0,0) / rotateX)
                        // makes backdrop-filter sample only this stacking context, so frosted
                        // glass never blurs the desktop wallpaper (unlike wimpos plain divs).
                        zIndex: inSwitcher ? 10001 + switcherIndex : item.zIndex,
                        contentVisibility: inView ? 'visible' : 'auto',
                        containIntrinsicSize: `${Math.round(size.width)}px ${Math.round(size.height)}px`,
                        willChange: isCompositorActive ? 'left, top, width, height, transform' : undefined,
                        x: dragging ? motionX : undefined,
                        y: dragging ? motionY : undefined,
                        // 3D tilt only while dragging (brief transform is OK; rest must be transform-free)
                        ...(dragging && !compact && !inSwitcher
                            ? {
                                  rotateX: tiltX,
                                  rotateY: tiltY,
                                  transformPerspective: 1200,
                              }
                            : {}),
                        ...(item.appSettings?.size?.fixed
                            ? {
                                  maxWidth: item.sizeConstraints.min.width,
                                  maxHeight: item.appSettings.size.autoHeight
                                      ? undefined
                                      : item.sizeConstraints.min.height,
                              }
                            : {}),
                    }}
                    // At rest force transform:none so backdrop-filter can blur the desktop.
                    // Framer often leaves scale(1)/translate3d(0,0,0) which still kills glass.
                    transformTemplate={(_latest, generated) => {
                        if (!isCompositorActive && !inSwitcher) {
                            return 'none'
                        }
                        return generated
                    }}
                    initial={{
                        scale: item.fromOrigin && !compact ? 0.08 : 0.94,
                        opacity: 0,
                        left: item.fromOrigin && !compact ? Math.round(item.fromOrigin.x) : Math.round(position.x),
                        top: item.fromOrigin && !compact ? Math.round(item.fromOrigin.y) : Math.round(position.y),
                        width: size.width,
                        height: size.height,
                    }}
                    animate={{
                        // Mission Control still uses scale; left/top stay layout properties
                        scale: inSwitcher && missionControlLayout ? missionControlLayout.scale : 1,
                        opacity: 1,
                        left: inSwitcher && missionControlLayout ? missionControlLayout.x : Math.round(position.x),
                        top: inSwitcher && missionControlLayout ? missionControlLayout.y : Math.round(position.y),
                        width: size.width,
                        height: size.height,
                    }}
                    exit={{
                        scale: 0.95,
                        opacity: 0,
                        transition: {
                            duration: compact ? 0.05 : 0.12,
                            ease: [0.32, 0, 0.67, 0],
                        },
                    }}
                    transition={
                        compact || siteSettings?.performanceBoost || dragging
                            ? { duration: 0 }
                            : {
                                  scale: { type: 'spring', stiffness: 440, damping: 25, mass: 0.6 },
                                  left: { type: 'spring', stiffness: 380, damping: 27, mass: 0.75 },
                                  top: { type: 'spring', stiffness: 380, damping: 27, mass: 0.75 },
                                  width: { type: 'spring', stiffness: 360, damping: 28, mass: 0.8 },
                                  height: { type: 'spring', stiffness: 360, damping: 28, mass: 0.8 },
                                  opacity: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
                                  default: { type: 'spring', stiffness: 380, damping: 26 },
                              }
                    }
                    drag={inSwitcher ? false : !item.fixedSize}
                    dragControls={controls}
                    dragListener={false}
                    dragMomentum={false}
                    dragElastic={0}
                    dragConstraints={false}
                    onDrag={handleDrag}
                    onDragEnd={(e, info) => {
                        handleDragEnd(e, info)
                        resetPhysics()
                    }}
                    onAnimationStart={onAnimationStart}
                    onAnimationComplete={onAnimationComplete}
                >
                    <WindowChrome
                        item={item}
                        hasToolbar={!!hasToolbar}
                        hideTitle={!!hideTitle}
                        onMinimize={() => minimizeWindow(item)}
                        onToggleExpanded={toggleExpanded}
                        onClose={handleClose}
                        onDoubleClick={handleDoubleClick}
                        onDragHandlePointerDown={(event) => {
                            if (item.fixedSize || inSwitcher) return
                            controls.start(event)
                        }}
                    />
                    <WindowContent item={item} chrome={chrome} hasToolbar={!!hasToolbar}>
                        <WindowRouter item={{ ...item, children: item.element }} />
                    </WindowContent>
                    {!item.fixedSize && !item.expanded && !isMobile && (
                        <>
                            <WindowResizeHandles
                                onResize={(info, change, left) => handleDragResize(info, change, left)}
                                onResizeEnd={handleResizeEnd}
                            />
                        </>
                    )}
                </motion.div>
            </WindowContainer>
        </WindowProvider>
    )
}

const AppWindowMemoized = React.memo(AppWindow, (prevProps, nextProps) => {
    const p = prevProps.item
    const n = nextProps.item
    // MUST include path / props.permalink — forum thread panel opens by updating path only.
    // Skipping path comparison left Inbox stuck on /questions and the detail pane never appeared.
    return (
        p === n ||
        (p.key === n.key &&
            p.path === n.path &&
            p.props?.permalink === n.props?.permalink &&
            p.props?.path === n.props?.path &&
            p.zIndex === n.zIndex &&
            p.minimized === n.minimized &&
            p.expanded === n.expanded &&
            p.windowed === n.windowed &&
            p.snapped === n.snapped &&
            p.position?.x === n.position?.x &&
            p.position?.y === n.position?.y &&
            p.size?.width === n.size?.width &&
            p.size?.height === n.size?.height)
    )
})

export default AppWindowMemoized
