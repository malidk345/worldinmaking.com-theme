import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import {
    AnimatePresence,
    motion,
    PanInfo,
    useDragControls,
    useMotionValue,
    useSpring,
    useTransform,
    useVelocity,
} from 'framer-motion'
import {
    IconChevronDown,
    IconDocument,
    IconMinus,
    IconX,
    IconCollapse45Chevrons,
    IconSquare,
    IconArrowLeft,
    IconArrowRight,
    IconTerminal,
    IconSearch,
    IconDrag,
} from '@posthog/icons'
import { Menu, MenuItem, useApp } from '../../context/App'
import { Provider as WindowProvider, AppWindow as AppWindowType, useWindow } from '../../context/Window'
import { ContextMenu, Dialog } from 'radix-ui'
import Tooltip from 'components/RadixUI/Tooltip'
import OSButton from 'components/OSButton'
import { Button } from 'components/Squeak/components/SubscribeButton'
import MenuBar, { MenuItemType } from 'components/RadixUI/MenuBar'
import { Popover } from '../RadixUI/Popover'
import { FileMenu } from '../RadixUI/FileMenu'
import { IMenu } from 'components/PostLayout/types'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Inbox from 'components/Inbox'
import Handbook from '../../templates/Handbook'
import BlogPost from '../../templates/BlogPost'
import Legal from 'components/Legal'
import { getProseClasses } from '../../constants'
import KeyboardShortcut from 'components/KeyboardShortcut'
import { useToast } from '../../context/Toast'
import usePostHog from '../../hooks/usePostHog'
import Modal from 'components/RadixUI/Modal'
import { ToggleGroup } from 'components/RadixUI/ToggleGroup'
import FloatingModal from 'components/FloatingModal'
import { MOTION_LAYER, WINDOW_BG } from '../../constants/frostedSurfaces'

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

const snapThreshold = -50

const PageModal = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = useState(true)
    const { appWindow } = useWindow()
    const { closeWindow } = useApp()

    useEffect(() => {
        if (!open) {
            closeWindow(appWindow)
        }
    }, [open])

    return (
        <Modal open={open} onOpenChange={setOpen}>
            {children}
        </Modal>
    )
}

import WimAuthPortal from 'components/Auth/WimAuthPortal'
import PostListing from '../../templates/PostListing'
import { fetchSupabasePostBySlug, SupabasePost } from '../../lib/supabaseBlog'

function BlogRouteView(props: any) {
    const rawPath = props.path || ''
    const slugStr = rawPath.replace(/^\/(blog|posts)\/?/, '')
    const [spPost, setSpPost] = useState<SupabasePost | null>(null)
    const [loading, setLoading] = useState(!props.data?.postData && !props.data?.post)

    useEffect(() => {
        if (!props.data?.postData && !props.data?.post && slugStr) {
            let mounted = true
            setLoading(true)
            fetchSupabasePostBySlug(slugStr).then((res) => {
                if (mounted) {
                    setSpPost(res)
                    setLoading(false)
                }
            })
            return () => {
                mounted = false
            }
        }
    }, [slugStr, props.data?.postData, props.data?.post])

    if (props.data?.postData || props.data?.post) {
        return <BlogPost {...props} />
    }

    if (loading) {
        return (
            <div className="p-8 text-center text-primary font-bold lowercase">
                <p>fetching post content...</p>
            </div>
        )
    }

    const title = spPost?.title || slugStr.replace(/-/g, ' ')
    const content = spPost?.content || `# ${title}\n\nNo content found for this post.`
    const date = spPost?.created_at ? spPost.created_at.split('T')[0] : '2026-01-01'
    const author = spPost?.author || 'WorldInMaking'

    const postData = {
        body: content,
        excerpt: spPost?.excerpt || title,
        frontmatter: {
            title,
            date,
            featuredImage: spPost?.image_url ? { publicURL: spPost.image_url } : null,
            featuredVideo: null,
            contributors: [
                {
                    name: author,
                    role: 'Author',
                    image: spPost?.author_avatar || 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png',
                },
            ],
        },
        fields: {
            slug: rawPath,
        },
    }

    const pageData = {
        ...props,
        data: {
            postData,
            post: postData,
        },
        pageContext: {
            tableOfContents: [],
            askMax: true,
            localizedRoot: '/blog',
        },
    }

    return <BlogPost {...(pageData as any)} />
}

import TapePlayer from 'components/TapePlayer'

const Router = (props: any) => {
    const { appWindow } = useWindow()
    const { closeWindow } = useApp()
    const { children, path } = props

    if (/^\/tape-player|^\/mixtapes/.test(path)) {
        return <TapePlayer {...props} />
    }
    if (/^\/login|^\/signup/.test(path)) {
        return (
            <div className="p-6 flex items-center justify-center min-h-full bg-slate-950/90">
                <WimAuthPortal onSuccess={() => closeWindow(appWindow)} />
            </div>
        )
    }
    if (/^\/questions/.test(path)) {
        return <Inbox {...props} />
    }
    if (path === '/blog' || path === '/posts') {
        const root = path.replace('/', '')
        return <PostListing {...props} activeMenu={root} root={root} title={root === 'blog' ? 'Blog' : 'Posts'} />
    }
    if (/^\/(blog|posts)\/.+/.test(path) || props.pageContext?.post || props.data?.postData) {
        return <BlogRouteView {...props} />
    }
    if (/^\/handbook|^\/docs\/(?!api)|^\/manual/.test(path) && props.data?.post) {
        return <Handbook {...props} />
    }
    if (['/terms', '/privacy', '/dpa', '/baa', '/subprocessors'].includes(path)) {
        return <Legal defaultTab={path}>{children}</Legal>
    }
    return (
        <>
            {appWindow?.modal?.type === 'standard' ? (
                <PageModal>{children}</PageModal>
            ) : appWindow?.modal?.type === 'floating' ? (
                <FloatingModal>{children}</FloatingModal>
            ) : (
                (!props.minimizing || appWindow?.appSettings?.size?.autoHeight) && children
            )}
        </>
    )
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

function SnapIndicator({ side }: { side: 'left' | 'right' }) {
    const { taskbarRef, taskbarHeight } = useApp()
    const taskbarRect = taskbarRef.current?.getBoundingClientRect()
    const left = taskbarRect?.left ?? 0
    const top = taskbarRect?.top ?? 0
    const availableWidth = window.innerWidth - left * 2
    const halfWidth = availableWidth / 2

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className={`fixed border-2 border-blue bg-blue/40 pointer-events-none ${
                side === 'left' ? 'rounded-bl-lg' : 'rounded-br-lg'
            }`}
            style={{
                left: side === 'left' ? left : left + halfWidth,
                width: halfWidth,
                top: taskbarHeight,
                height: window.innerHeight - taskbarHeight - (taskbarRect?.top ?? 0),
            }}
        />
    )
}

export default function AppWindow({ item, chrome = true }: { item: AppWindowType; chrome?: boolean }) {
    const { addToast, toasts } = useToast()
    const {
        minimizeWindow,
        bringToFront,
        focusedWindow,
        taskbarHeight,
        windows,
        updateWindowRef,
        updateWindow,
        getDesktopCenterPosition,
        handleSnapToSide,
        constraintsRef,
        expandWindow,
        siteSettings,
        updateSiteSettings,
        openNewChat,
        compact,
        menu: appMenu,
        taskbarRef,
        closeWindow,
        isActiveWindowsPanelOpen,
        addWindow,
    } = useApp()

    const navigate = useCallback(
        (path: string) => {
            updateWindow(item, { path })
        },
        [item, updateWindow]
    )

    const motionX = useMotionValue(0)
    const motionY = useMotionValue(0)
    const xVelocity = useVelocity(motionX)
    const yVelocity = useVelocity(motionY)
    const smoothXVelocity = useSpring(xVelocity, { damping: 40, stiffness: 300 })
    const smoothYVelocity = useSpring(yVelocity, { damping: 40, stiffness: 300 })
    const tiltX = useTransform(smoothYVelocity, [-1000, 1000], [6, -6])
    const tiltY = useTransform(smoothXVelocity, [-1000, 1000], [-6, 6])

    const isSSR = typeof window === 'undefined'
    const controls = useDragControls()
    const sizeConstraints = item.sizeConstraints
    const size = item.size
    const previousSize = item.previousSize
    const position = item.position
    const previousPosition = item.previousPosition

    const activePanelIndex = useMemo(() => windows.findIndex((w) => w.key === item.key), [windows, item.key])
    const totalWindows = windows.length

    const missionControlLayout = useMemo(() => {
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
    const [snapIndicator, setSnapIndicator] = useState<'left' | 'right' | null>(null)
    const [windowOptionsTooltipVisible, setWindowOptionsTooltipVisible] = useState(false)
    const [menu, setMenu] = useState<IMenu[]>([])
    const [history, setHistory] = useState<string[]>([])
    const [activeHistoryIndex, setActiveHistoryIndex] = useState(0)
    const windowRef = useRef<HTMLDivElement>(null)
    const [rendered, setRendered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const [leftDragResizing, setLeftDragResizing] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)
    const [pageOptions, setPageOptions] = useState<MenuItemType[]>()
    const [closing, setClosing] = useState(false)
    const [closed, setClosed] = useState(false)
    const [minimizing, setMinimizing] = useState(false)
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
    const isCompositorActive = animating || dragging || leftDragResizing || closing
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

    const isMaximized = () => {
        if (item.expanded) return true
        const taskbarRect = taskbarRef.current?.getBoundingClientRect()
        const expandedWidth = window.innerWidth - (taskbarRect?.left ?? 0) * 2
        return size.width >= expandedWidth
    }

    const beyondViewport = (windowSize: { width: number; height: number }) => {
        const rightEdge = position.x + windowSize.width
        const bottomEdge = position.y + windowSize.height

        return (
            rightEdge > window.innerWidth ||
            bottomEdge > window.innerHeight - taskbarHeight ||
            position.x < 0 ||
            position.y < 0
        )
    }

    const handleDragResize = (
        item: AppWindowType,
        info: PanInfo,
        change: { x: boolean } | { y: boolean } | { x: boolean; y: boolean }
    ) => {
        if (item.expanded && windowRef.current) {
            const rect = windowRef.current.getBoundingClientRect()
            const containerRect = constraintsRef.current?.getBoundingClientRect()
            const measuredPos = {
                x: rect.left - (containerRect?.left ?? 0),
                y: rect.top - (containerRect?.top ?? 0),
            }
            const measuredSize = { width: rect.width, height: rect.height }
            updateWindow(item, {
                position: measuredPos,
                size: measuredSize,
                previousSize: measuredSize,
                previousPosition: measuredPos,
                expanded: false,
                snapped: false,
            })
            return
        }
        const update: { size?: { height?: number; width?: number }; position?: { x: number } } = {}
        if ('y' in change) update.size = { height: Math.max(size.height + info.delta.y, sizeConstraints.min.height) }
        if ('x' in change) {
            update.size ||= {}
            const delta = leftDragResizing ? -1 * info.delta.x : info.delta.x
            update.size.width = Math.max(size.width + delta, sizeConstraints.min.width)
            if (leftDragResizing) update.position = { x: item.position.x + size.width - update.size.width }
        }
        updateWindow(item, update)
    }

    const toggleExpanded = () => {
        if (item.fixedSize) return
        const bounds = constraintsRef.current?.getBoundingClientRect()
        const fullW = bounds ? bounds.width : (typeof window !== 'undefined' ? window.innerWidth - 16 : 1200)
        const fullH = bounds ? bounds.height : (typeof window !== 'undefined' ? window.innerHeight - taskbarHeight : 800)

        const isMax = item.expanded || (item.size.width >= fullW - 10 && item.size.height >= fullH - 10)

        if (isMax) {
            const prevSize = item.previousSize || { width: Math.min(900, fullW * 0.8), height: Math.min(650, fullH * 0.8) }
            const prevPos = item.previousPosition || { x: Math.max(0, (fullW - prevSize.width) / 2), y: Math.max(0, (fullH - prevSize.height) / 2) }
            updateWindow(item, {
                size: prevSize,
                position: prevPos,
                expanded: false,
                windowed: true,
                snapped: false,
            })
        } else {
            updateWindow(item, {
                previousSize: item.size,
                previousPosition: item.position,
                size: { width: fullW, height: fullH },
                position: { x: 0, y: 0 },
                expanded: true,
                windowed: false,
                snapped: false,
            })
        }
    }

    const handleDoubleClick = () => {
        toggleExpanded()
    }

    const collapseWindow = () => {
        toggleExpanded()
    }

    const getActiveWindowsButtonPosition = () => {
        const activeWindowsButton = isSSR ? null : taskbarRef.current?.querySelector('[data-active-windows]')
        if (!activeWindowsButton) return { x: 0, y: 0 }
        const rect = activeWindowsButton.getBoundingClientRect()
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        }
    }

    const handleMinimize = () => {
        setMinimizing(true)
    }

    const handleDrag = (_event: any, info: any) => {
        if (!dragging) setDragging(true)
        if (item.expanded && windowRef.current) {
            const rect = windowRef.current.getBoundingClientRect()
            const containerRect = constraintsRef.current?.getBoundingClientRect()
            const measuredPos = {
                x: rect.left - (containerRect?.left ?? 0),
                y: rect.top - (containerRect?.top ?? 0),
            }
            const measuredSize = { width: rect.width, height: rect.height }
            updateWindow(item, {
                position: measuredPos,
                size: measuredSize,
                previousSize: measuredSize,
                previousPosition: measuredPos,
                expanded: false,
                snapped: false,
            })
            return
        }
        if (item.fixedSize || !constraintsRef.current) return

        const bounds = constraintsRef.current.getBoundingClientRect()
        const newX = position.x + info.offset.x

        if (newX < snapThreshold) {
            setSnapIndicator('left')
        } else if (newX > bounds.width - size.width - snapThreshold) {
            setSnapIndicator('right')
        } else {
            setSnapIndicator(null)
        }
    }

    const handleDragEnd = (_event: any, info: any) => {
        if (dragging) setDragging(false)
        if (!item.fixedSize && snapIndicator !== null) {
            handleSnapToSide(snapIndicator)
            setSnapIndicator(null)
            return
        } else {
            if (!constraintsRef.current) return

            const bounds = constraintsRef.current.getBoundingClientRect()
            const newX = position.x + info?.offset?.x
            const newY = position.y + info?.offset?.y

            if (newX >= 0 && newY >= 0 && newX + size.width <= bounds.width && newY + size.height <= bounds.height) {
                updateWindow(item, {
                    position: { x: newX, y: newY },
                })
            }
        }
    }

    const handleDragTransitionEnd = () => {
        if (!dragging) setDragging(false)
        if (!constraintsRef.current || !item.ref?.current) return

        const containerBounds = constraintsRef.current.getBoundingClientRect()
        const windowBounds = item.ref.current.getBoundingClientRect()

        const newX = windowBounds.left - containerBounds.left
        const newY = windowBounds.top - containerBounds.top

        updateWindow(item, {
            position: { x: newX, y: newY },
        })
    }

    const windowPosition = useMemo(() => {
        if (isSSR) return { x: 0, y: 0 }
        const activeWindowsPosition = getActiveWindowsButtonPosition()
        if (activeWindowsPosition.x === 0 && activeWindowsPosition.y === 0) {
            return undefined
        }
        return {
            x: activeWindowsPosition.x - size.width / 2,
            y: activeWindowsPosition.y - size.height / 2,
        }
    }, [size.width, size.height, taskbarRef.current])

    const canGoBack = history.length > 0 && activeHistoryIndex > 0
    const canGoForward = activeHistoryIndex < history.length - 1

    useEffect(() => {
        if (!item?.fromHistory) {
            setHistory((prev) => [...prev, item.path])
            setActiveHistoryIndex(history.length)
        }
        setActiveInternalMenu(getActiveInternalMenu())
    }, [item?.path])

    const router = useRouter()

    const goBack = useCallback(() => {
        if (canGoBack) {
            setActiveHistoryIndex(activeHistoryIndex - 1)
            router.push(history[activeHistoryIndex - 1])
        }
    }, [canGoBack, activeHistoryIndex, history])

    const goForward = useCallback(() => {
        if (canGoForward) {
            setActiveHistoryIndex(activeHistoryIndex + 1)
            router.push(history[activeHistoryIndex + 1])
        }
    }, [canGoForward, activeHistoryIndex, history])

    const handleMouseDown = () => {
        if (focusedWindow === item) return
        if (item.path.startsWith('/')) {
            router.push(`${item.path}${item.location?.search || ''}`)
        } else {
            bringToFront(item)
        }
    }

    useEffect(() => {
        const handleResize = () => {
            if (item.expanded) return
            if (beyondViewport(size)) {
                const newSize = {
                    width: Math.min(size.width, window.innerWidth),
                    height: Math.min(size.height, window.innerHeight - taskbarHeight),
                }

                const newPosition = {
                    x: Math.min(Math.max(0, position.x), window.innerWidth - newSize.width),
                    y: Math.min(Math.max(0, position.y), window.innerHeight - taskbarHeight - newSize.height),
                }

                updateWindow(item, {
                    size: newSize,
                    position: newPosition,
                })
            }
        }
        if (!isSSR) {
            window.addEventListener('resize', handleResize)
            return () => window.removeEventListener('resize', handleResize)
        }
    }, [item])

    useEffect(() => {
        setRendered(true)
    }, [])

    useEffect(() => {
        const handleWindowClose = (event: CustomEvent) => {
            if (event.detail.windowKey === item.key) {
                handleClose()
            }
        }

        document.addEventListener('windowClose', handleWindowClose as EventListener)

        return () => {
            document.removeEventListener('windowClose', handleWindowClose as EventListener)
        }
    }, [item.key])

    useEffect(() => {
        if (!item.appSettings?.closeOnEscape || focusedWindow !== item || closing) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return

            event.preventDefault()
            setClosing(true)
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [closing, focusedWindow, item])

    const chatWindows = windows.filter((w) => w.key?.startsWith('ask-max'))
    const defaultPageOptions = useMemo(
        () => [
            {
                type: 'submenu',
                label: 'Ask PostHog AI about this page',
                items: [
                    {
                        type: 'item',
                        label: 'New PostHog AI chat',
                        onClick() {
                            openNewChat({
                                path: `ask-max-${item.path}`,
                                context: [{ type: 'page', value: { path: item.path, label: item.meta?.title } }],
                            })
                        },
                    },

                    ...(chatWindows.length > 0
                        ? [
                              {
                                  type: 'separator',
                              },
                              ...chatWindows.map((appWindow, index) => ({
                                  type: 'item',
                                  label: appWindow.meta?.title || `Chat ${index + 1}`,
                                  onClick: () => {
                                      const newAppWindow = updateWindow(appWindow, {
                                          element: {
                                              ...appWindow.element,
                                              props: {
                                                  ...appWindow.props,
                                                  context: [
                                                      {
                                                          type: 'page',
                                                          value: { path: item.path, label: item.meta?.title },
                                                      },
                                                  ],
                                              },
                                          },
                                      })
                                      bringToFront(newAppWindow)
                                  },
                              })),
                          ]
                        : []),
                ],
            },
            {
                type: 'item',
                label: 'Bookmark',
            },
        ],
        [item, chatWindows]
    )

    const handleClose = () => {
        setClosing(true)
    }

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
            parent={parent}
            view={view}
            setView={setView}
            hasDeveloperMode={hasDeveloperMode}
            setHasDeveloperMode={setHasDeveloperMode}
            animating={animating}
            addWindow={addWindow}
            navigate={navigate}
        >
            <WindowContainer closing={closing}>
                {item.appSettings?.size?.fixed && (
                    <div
                        onClick={handleClose}
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
                    data-scheme="tertiary"
                    className={`group @container absolute pointer-events-auto !select-auto flex flex-col border-primary ${WINDOW_BG} ${
                        isCompositorActive ? MOTION_LAYER : ''
                    } rounded-lg ${item.appSettings?.size?.fixed ? 'border' : item.expanded ? 'border-t' : ''} ${
                        item.expanded ? 'shadow-none' : 'shadow-md'
                    }`}
                    style={{
                        pointerEvents: 'auto',
                        rotateX: compact || isActiveWindowsPanelOpen ? 0 : tiltX,
                        rotateY: compact || isActiveWindowsPanelOpen ? 0 : tiltY,
                        transformPerspective: 1200,
                        zIndex: isActiveWindowsPanelOpen ? 10001 + activePanelIndex : item.zIndex,
                        ...(item.appSettings?.size?.fixed
                            ? {
                                  maxWidth: item.sizeConstraints.min.width,
                                  maxHeight: item.appSettings.size.autoHeight
                                      ? undefined
                                      : item.sizeConstraints.min.height,
                              }
                            : {}),
                    }}
                    initial={{
                        scale: item.fromOrigin && !compact ? 0.4 : 0.96,
                        opacity: 0,
                        x: item.fromOrigin && !compact ? item.fromOrigin.x : Math.round(position.x),
                        y: item.fromOrigin && !compact ? item.fromOrigin.y : Math.round(position.y),
                        width: size.width,
                        height: size.height,
                    }}
                    animate={{
                        scale: isActiveWindowsPanelOpen && missionControlLayout ? missionControlLayout.scale : 1,
                        opacity: 1,
                        x: isActiveWindowsPanelOpen && missionControlLayout ? missionControlLayout.x : Math.round(position.x),
                        y: isActiveWindowsPanelOpen && missionControlLayout ? missionControlLayout.y : Math.round(position.y),
                        width: size.width,
                        height: size.height,
                    }}
                    exit={{
                        scale: 0.98,
                        opacity: 0,
                        transition: {
                            duration: compact ? 0.05 : 0.15,
                            ease: [0.32, 0, 0.67, 0],
                        },
                    }}
                    transition={
                        compact || siteSettings?.performanceBoost || dragging
                            ? { duration: 0 }
                            : {
                                  duration: 0.15,
                                  ease: [0.16, 1, 0.3, 1],
                              }
                    }
                    drag={isActiveWindowsPanelOpen ? false : !item.fixedSize}
                    dragControls={controls}
                    dragListener={false}
                    dragMomentum={false}
                    dragConstraints={false}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    onAnimationStart={onAnimationStart}
                    onAnimationComplete={onAnimationComplete}
                >
                    <div className={`${hasToolbar ? 'bg-primary flex items-center py-0.5 px-1' : ''}`}>
                        {hasToolbar && (
                            <>
                                {!hideTitle && (
                                    <p className="text-primary text-left text-sm font-semibold ml-1.5 my-0 line-clamp-1">
                                        {item.meta?.title?.replace(/ - PostHog$/, '')}
                                    </p>
                                )}
                                <div className="flex-1" />
                            </>
                        )}
                        <div
                            data-scheme="tertiary"
                            onDoubleClick={handleDoubleClick}
                            className={`inline-flex gap-1 items-center py-0.5 pl-1.5 pr-0.5 skin-classic:bg-primary opacity-80 md:opacity-60 md:hover:opacity-100 transition-opacity duration-100 ${
                                hasToolbar ? 'flex-1 justify-end' : 'absolute z-20 right-1 top-1'
                            }`}
                        >
                            <div className="window-minimize-control flex justify-end">
                                <Tooltip
                                    trigger={
                                        <OSButton
                                            windowButton
                                            size="md"
                                            onClick={() => minimizeWindow(item)}
                                            icon={<IconMinus />}
                                            aria-label="Minimize window"
                                        />
                                    }
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <span>Minimize window</span>
                                    </div>
                                </Tooltip>
                            </div>
                            {!item.fixedSize && (
                                <div className="window-expand-control flex justify-end">
                                    <Tooltip
                                        trigger={
                                            <OSButton
                                                windowButton
                                                size="md"
                                                onClick={toggleExpanded}
                                                icon={
                                                    item.expanded ? (
                                                        <IconCollapse45Chevrons />
                                                    ) : (
                                                        <IconSquare className="scale-110" />
                                                    )
                                                }
                                            />
                                        }
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <span>{item.expanded ? 'Restore window' : 'Expand window'}</span>
                                            <div>
                                                <KeyboardShortcut text="Shift" size="xs" />
                                                &nbsp;
                                                <KeyboardShortcut text="↑" size="xs" />
                                            </div>
                                        </div>
                                    </Tooltip>
                                </div>
                            )}
                            <div className="flex justify-end">
                                <Tooltip
                                    trigger={<OSButton windowButton size="md" onClick={handleClose} icon={<IconX />} />}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <span>Close window</span>
                                        <div>
                                            <KeyboardShortcut text="Shift" size="xs" />
                                            &nbsp;
                                            <KeyboardShortcut text="W" size="xs" />
                                        </div>
                                    </div>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                    <div
                        ref={contentRef}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className={`size-full flex-grow overflow-y-auto overscroll-y-contain touch-pan-y scroll-smooth [webkit-overflow-scrolling:touch] bg-[#fdfdf8] dark:bg-[#1b1c1e] text-primary ${
                            chrome
                                ? `rounded-lg ${hasToolbar ? 'rounded-t-none' : ''} ${
                                      item.expanded
                                          ? 'rounded-tr-none rounded-tl-none'
                                          : item.snapped === 'left'
                                          ? 'rounded-tl-none rounded-tr-none rounded-br-none'
                                          : item.snapped === 'right'
                                          ? 'rounded-tl-none rounded-tr-none rounded-bl-none'
                                          : ''
                                  }`
                                : ''
                        }`}
                    >
                        <Router {...item.props}>{item.element}</Router>
                    </div>
                </motion.div>
            </WindowContainer>
        </WindowProvider>
    )
}
