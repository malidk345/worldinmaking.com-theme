"use client"

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { AnimatePresence, motion, PanInfo, useDragControls } from 'framer-motion'
import {
    IconChevronDown,
    IconDocument,
    IconMinus,
    IconX,
    IconCollapse45Chevrons,
    IconExpand45Chevrons,
    IconSquare,
    IconArrowLeft,
    IconArrowRight,
} from '@posthog/icons'
import { ContextMenu } from 'radix-ui'
import { useApp } from '../../context/App'
import { useToast } from '../../context/ToastContext'
import type { AppWindow as AppWindowType } from '../../context/Window'
import { WindowProvider } from '../../context/Window'
import { IMenu } from 'components/PostLayout/types'
import Tooltip from 'components/RadixUI/Tooltip'
import OSButton from 'components/OSButton'
import MenuBar from 'components/RadixUI/MenuBar'
import { Popover } from '../RadixUI/Popover'
import { FileMenu } from '../RadixUI/FileMenu'
import { ToggleGroup } from '../RadixUI/ToggleGroup'
import HomeControl from 'components/Home/Control'
import WindowRouter from 'components/AppWindow/WindowRouter'
import KeyboardShortcut from 'components/KeyboardShortcut'

const snapThreshold = -50

function WindowContainer({ children, closing, onExit }: { children: React.ReactNode; closing: boolean; onExit: () => void }) {
    return (
        <AnimatePresence onExitComplete={onExit}>
            {!closing && children}
        </AnimatePresence>
    )
}

export default function AppWindow({ item, chrome = true }: { item: AppWindowType; chrome?: boolean }) {
    const {
        minimizeWindow,
        bringToFront,
        focusedWindow,
        updateWindowRef,
        updateWindow,
        getDesktopCenterPosition,
        handleSnapToSide,
        constraintsRef,
        siteSettings,
        closeWindow,
        taskbarRef
    } = useApp()

    const controls = useDragControls()
    const sizeConstraints = useMemo(() => {
        const base = item.sizeConstraints || { min: { width: 400, height: 300 }, max: { width: 2000, height: 2000 } }
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            return {
                min: {
                    width: Math.min(base.min.width, window.innerWidth * 0.85),
                    height: Math.min(base.min.height, (window.innerHeight - 80) * 0.7)
                },
                max: base.max
            }
        }
        return base
    }, [item.sizeConstraints])

    const size = item.size
    const position = item.position
    const [snapIndicator, setSnapIndicator] = useState<'left' | 'right' | null>(null)
    const windowRef = useRef<HTMLDivElement>(null)
    const [rendered, setRendered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const [closing, setClosing] = useState(false)
    const [leftDragResizing, setLeftDragResizing] = useState(false)
    const [minimizing, setMinimizing] = useState(false)
    const [animating, setAnimating] = useState(true)
    const animationStartTimeRef = useRef<number | null>(null)
    const { addToast } = useToast()
    const hasMobileAdjusted = useRef(false)

    useEffect(() => {
        if (windowRef.current) {
            updateWindowRef(item.key, windowRef)
        }
    }, [item.key, updateWindowRef])

    useEffect(() => {
        setRendered(true)
    }, [])

    useEffect(() => {
        if (minimizing && !item.minimized) {
            minimizeWindow(item)
            // Trigger the animation in the TaskBarMenu
            const taskbarMenu = document.querySelector('#taskbar')
            if (taskbarMenu) {
                const event = new CustomEvent('windowMinimized')
                taskbarMenu.dispatchEvent(event)
            }
        }
    }, [item, minimizeWindow, minimizing])

    const handleMinimize = () => {
        setMinimizing(true)
    }

    const handleClose = () => {
        setClosing(true)
    }

    const handleExit = () => {
        if (closing) {
            closeWindow(item)
        } else if (minimizing) {
            setMinimizing(false)
        }
    }

    const onAnimationStart = () => {
        animationStartTimeRef.current = performance.now()
    }

    const onAnimationComplete = () => {
        setAnimating(false)
        if (animationStartTimeRef.current) {
            const actualDuration = performance.now() - animationStartTimeRef.current
            // If animation takes significantly longer than expected (> 700ms), warn user
            if (actualDuration > 700 && !siteSettings.performanceBoost) {
                addToast("Animations are running slow. Consider enabling performance boost in system settings.", 'warning', "Performance Note")
            }
            animationStartTimeRef.current = null
        }
        if (minimizing) {
            setMinimizing(false)
            setAnimating(true)
        }
    }

    const handleDoubleClick = () => {
        if (!constraintsRef.current) return
        const bounds = constraintsRef.current.getBoundingClientRect()
        const inset = 0
        const maxWidth = bounds.width - inset * 2
        const maxHeight = bounds.height - inset * 2

        const isMaximized =
            size.width >= maxWidth - 5 &&
            size.height >= maxHeight - 5 &&
            Math.abs(position.x - inset) <= 5 &&
            Math.abs(position.y - inset) <= 5

        const newSize = isMaximized ? sizeConstraints.min : { width: maxWidth, height: maxHeight }
        updateWindow(item, {
            size: newSize,
            position: isMaximized ? getDesktopCenterPosition(newSize) : { x: inset, y: inset },
        })
    }

    const collapseWindow = () => {
        let prevSize = item.previousSize || sizeConstraints.min
        let prevPos = item.previousPosition || getDesktopCenterPosition(prevSize)

        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            const bounds = constraintsRef.current?.getBoundingClientRect()
            if (bounds) {
                // If the "restored" size is still basically full screen, force a smaller one
                if (prevSize.width >= bounds.width - 10) {
                    prevSize = { width: bounds.width * 0.85, height: bounds.height * 0.7 }
                    prevPos = { x: (bounds.width - prevSize.width) / 2, y: (bounds.height - prevSize.height) / 2 }
                }
            }
        }

        updateWindow(item, {
            size: prevSize,
            position: prevPos,
        })
    }

    const handleDrag = (_event: unknown, info: PanInfo) => {
        if (!dragging) setDragging(true)
        if (item.fixedSize) return
        if (!constraintsRef.current) return

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

    const handleDragEnd = (_event: unknown, info: PanInfo) => {
        setDragging(false)
        if (!item.fixedSize && snapIndicator !== null) {
            handleSnapToSide(snapIndicator)
            setSnapIndicator(null)
        } else {
            const bounds = constraintsRef.current?.getBoundingClientRect()
            if (!bounds) return

            const inset = 0
            const rawX = position.x + (info?.offset?.x || 0)
            const rawY = position.y + (info?.offset?.y || 0)

            // Safe Zone: Keep at least 100px width and the title bar (40px) reachable
            const minVisibleWidth = 100
            const minVisibleHeight = 40
            const newX = Math.max(-size.width + minVisibleWidth, Math.min(rawX, bounds.width - minVisibleWidth))
            const newY = Math.max(0, Math.min(rawY, bounds.height - minVisibleHeight))

            updateWindow(item, {
                position: { x: newX, y: newY },
            })
        }
    }

    const handleDragResize = (
        info: PanInfo,
        change: { x?: boolean; y?: boolean }
    ) => {
        const bounds = constraintsRef.current?.getBoundingClientRect()
        const inset = 0
        const update: { size: { height: number; width: number }; position?: { x: number } } = {
            size: { ...size }
        }

        if (change.y && bounds) {
            const maxHeight = bounds.height - position.y - inset
            update.size.height = Math.min(
                Math.max(size.height + info.delta.y, sizeConstraints.min.height),
                maxHeight
            )
        }

        if (change.x && bounds) {
            const delta = leftDragResizing ? -info.delta.x : info.delta.x
            const maxWidth = leftDragResizing
                ? position.x + size.width - inset
                : bounds.width - position.x - inset
            update.size.width = Math.min(
                Math.max(size.width + delta, sizeConstraints.min.width),
                maxWidth
            )
            if (leftDragResizing) {
                update.position = { x: Math.max(inset, position.x + size.width - update.size.width) }
            }
        }

        if (update.position) {
            update.position = { ...position, ...update.position }
        }
        updateWindow(item, update as Partial<AppWindowType>)
    }

    const handleMouseDown = () => {
        bringToFront(item)
    }

    const isFocused = focusedWindow?.key === item.key

    const getActiveWindowsButtonPosition = React.useCallback(() => {
        const activeWindowsButton = typeof document !== 'undefined' ? taskbarRef.current?.querySelector('[data-active-windows]') : null
        if (!activeWindowsButton) return { x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: typeof window !== 'undefined' ? window.innerHeight : 0 }
        const rect = activeWindowsButton.getBoundingClientRect()
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        }
    }, [taskbarRef])

    const windowPosition = useMemo(() => {
        if (typeof window === 'undefined') return { x: 0, y: 0 }
        const activeWindowsPos = getActiveWindowsButtonPosition()
        return {
            x: activeWindowsPos.x - size.width / 2,
            y: activeWindowsPos.y - size.height / 2,
        }
    }, [size.width, size.height, getActiveWindowsButtonPosition])

    const [history, setHistory] = useState<string[]>([item.path])
    const [activeHistoryIndex, setActiveHistoryIndex] = useState(0)

    useEffect(() => {
        if (!item?.fromHistory && history[activeHistoryIndex] !== item.path) {
            const newHistory = history.slice(0, activeHistoryIndex + 1)
            setHistory([...newHistory, item.path])
            setActiveHistoryIndex(newHistory.length)
        }
    }, [item, history, activeHistoryIndex])

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (hasMobileAdjusted.current) return

        const isMobile = window.innerWidth <= 768
        if (!isMobile) return

        if (!constraintsRef.current) return
        const bounds = constraintsRef.current.getBoundingClientRect()
        const inset = 0
        const nextSize = {
            width: bounds.width - inset * 2,
            height: bounds.height - inset * 2,
        }
        const nextPosition = { x: inset, y: inset }

        hasMobileAdjusted.current = true
        updateWindow(item, { size: nextSize, position: nextPosition })
    }, [item, constraintsRef, updateWindow])

    const isMaximized = useMemo(() => {
        if (!constraintsRef.current) return false
        const bounds = constraintsRef.current.getBoundingClientRect()
        const inset = 0
        const maxWidth = bounds.width - inset * 2
        const maxHeight = bounds.height - inset * 2
        return (
            size.width >= maxWidth - 2 &&
            size.height >= maxHeight - 2 &&
            Math.abs(position.x - inset) <= 2 &&
            Math.abs(position.y - inset) <= 2
        )
    }, [constraintsRef, position.x, position.y, size.height, size.width])

    const canGoBack = activeHistoryIndex > 0
    const canGoForward = activeHistoryIndex < history.length - 1

    const goBack = () => {
        if (canGoBack) {
            const nextIndex = activeHistoryIndex - 1
            setActiveHistoryIndex(nextIndex)
            updateWindow(item, { path: history[nextIndex], fromHistory: true })
        }
    }

    const goForward = () => {
        if (canGoForward) {
            const nextIndex = activeHistoryIndex + 1
            setActiveHistoryIndex(nextIndex)
            updateWindow(item, { path: history[nextIndex], fromHistory: true })
        }
    }

    const navigate = useCallback((path: string) => {
        updateWindow(item, { path })
    }, [item, updateWindow])

    return (
        <WindowProvider
            appWindow={item}
            value={{
                goBack,
                goForward,
                canGoBack,
                canGoForward,
                navigate
            }}
        >
            <WindowContainer closing={closing} onExit={handleExit}>
                {!item.minimized && !minimizing && (
                    <>
                        {snapIndicator && constraintsRef.current && (() => {
                            const bounds = constraintsRef.current!.getBoundingClientRect()
                            const inset = 0
                            const halfW = (bounds.width - inset * 3) / 2
                            const h = bounds.height - inset * 2
                            const leftX = bounds.left + inset
                            const rightX = bounds.left + inset * 2 + halfW
                            const topY = bounds.top + inset
                            return (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.3 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed border-2 border-blue-500 bg-blue-500/40 pointer-events-none rounded-md z-[9999]"
                                    style={{
                                        left: snapIndicator === 'left' ? leftX : rightX,
                                        width: halfW,
                                        top: topY,
                                        height: h,
                                    }}
                                />
                            )
                        })()}
                        <motion.div
                            ref={windowRef}
                            data-app="AppWindow"
                            data-scheme="tertiary"
                            className={`@container absolute flex flex-col backdrop-blur-3xl-safe border ${isFocused ? 'shadow-2xl border-primary ring-1 ring-primary/10' : 'shadow-lg border-primary/30 opacity-95'
                                } ${dragging ? 'select-none' : ''} ${isMaximized ? 'rounded-none' : 'rounded-sm'} ${chrome ? 'overflow-hidden' : ''}`}
                            style={{ zIndex: item.zIndex }}
                            initial={{
                                scale: 0.08,
                                x: item.fromOrigin?.x || windowPosition.x,
                                y: item.fromOrigin?.y || windowPosition.y,
                                width: size.width,
                                height: size.height
                            }}
                            animate={{
                                scale: 1,
                                x: Math.round(position.x),
                                y: Math.round(position.y),
                                width: size.width,
                                height: size.height,
                            }}
                            exit={{
                                scale: 0.005,
                                x: windowPosition.x,
                                y: windowPosition.y,
                                transition: {
                                    scale: { duration: 0.23, ease: [0.2, 0.2, 0.8, 1] },
                                    x: { duration: 0.23, ease: [0.2, 0.2, 0.8, 1] },
                                    y: { duration: 0.23, ease: [0.2, 0.2, 0.8, 1] },
                                }
                            }}
                            transition={{
                                duration: siteSettings.performanceBoost ? 0 : 0.2,
                                scale: {
                                    duration: siteSettings.performanceBoost ? 0 : 0.2,
                                    delay: siteSettings.performanceBoost ? 0 : 0.1,
                                    ease: [0.2, 0.2, 0.8, 1],
                                },
                                width: {
                                    duration: (dragging || siteSettings.performanceBoost) ? 0 : 0.18,
                                    ease: [0.2, 0.2, 0.8, 1],
                                },
                                height: {
                                    duration: (dragging || siteSettings.performanceBoost) ? 0 : 0.18,
                                    ease: [0.2, 0.2, 0.8, 1],
                                },
                                x: {
                                    duration: (dragging || siteSettings.performanceBoost) ? 0 : 0.18,
                                    ease: [0.2, 0.2, 0.8, 1],
                                },
                                y: {
                                    duration: (dragging || siteSettings.performanceBoost) ? 0 : 0.18,
                                    ease: [0.2, 0.2, 0.8, 1],
                                },
                            }}
                            onMouseDown={handleMouseDown}
                            drag={!item.fixedSize}
                            dragControls={controls}
                            dragListener={false}
                            dragMomentum={false}
                            dragConstraints={false}
                            onDrag={handleDrag}
                            onDragEnd={handleDragEnd}
                            onAnimationStart={onAnimationStart}
                            onAnimationComplete={onAnimationComplete}
                        >
                            {chrome && (
                                <div
                                    data-scheme="tertiary"
                                    onDoubleClick={handleDoubleClick}
                                    className={`flex-shrink-0 w-full flex @md:grid grid-cols-[minmax(100px,auto)_1fr_minmax(100px,auto)] gap-1 items-center py-0.5 pl-1.5 pr-0.5 bg-primary/20 backdrop-blur-3xl-safe ${siteSettings.experience === 'boring' ? '' : 'cursor-move'
                                        }`}
                                    onPointerDown={(e) => controls.start(e)}
                                >
                                    <MenuBar
                                        menus={[
                                            {
                                                trigger: (
                                                    <>
                                                        <IconDocument className="size-5" />
                                                        <IconChevronDown className="size-6 -mx-1.5 text-muted group-hover:text-primary data-[state=open]:text-primary" />
                                                    </>
                                                ),
                                                items: [
                                                    ...(Array.isArray(item.props?.pageOptions) ? item.props.pageOptions : []),
                                                    {
                                                        type: 'item',
                                                        label: 'close',
                                                        onClick: handleClose,
                                                        shortcut: ['Shift', 'W'],
                                                    },
                                                ],
                                            },
                                        ]}
                                    />

                                    <div className="flex-1 truncate flex items-center justify-start @md:justify-center">
                                        {item.props?.hasDeveloperMode ? (
                                            <ToggleGroup
                                                title="view mode"
                                                hideTitle
                                                options={[
                                                    {
                                                        label: 'slides',
                                                        value: 'marketing',
                                                    },
                                                    {
                                                        label: 'dev mode',
                                                        value: 'developer',
                                                    },
                                                ]}
                                                value={(item.props?.view as string) || 'marketing'}
                                                onValueChange={(value) => updateWindow(item, { props: { ...item.props, view: value } })}
                                            />
                                        ) : item.props?.menu && (item.props.menu as IMenu[]).length > 0 ? (
                                            <Popover
                                                trigger={
                                                    <button className="text-primary hover:text-primary dark:text-primary-dark dark:hover:text-primary-dark text-left items-center justify-center text-sm font-bold lowercase tracking-tight flex select-none">
                                                        {(item.meta?.title && item.meta.title) || item.title || (item.key === 'home' ? 'home' : item.key)}
                                                        <IconChevronDown className="size-6 -m-1" />
                                                    </button>
                                                }
                                                dataScheme="primary"
                                                contentClassName="w-auto p-0 border border-primary"
                                                header={false}
                                            >
                                                <FileMenu menu={item.props.menu as IMenu[]} />
                                            </Popover>
                                        ) : (
                                            <div className="text-primary hover:text-primary dark:text-primary-dark dark:hover:text-primary-dark text-left items-center justify-center text-sm font-bold lowercase tracking-tight flex select-none">
                                                {(item.meta?.title && item.meta.title) || item.title || (item.key === 'home' ? 'home' : item.key)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <OSButton size="xs" onClick={handleMinimize}>
                                            <IconMinus className="size-4 relative top-1" />
                                        </OSButton>

                                        {!item.fixedSize && (
                                            <ContextMenu.Root>
                                                <ContextMenu.Trigger asChild>
                                                    <OSButton
                                                        size="xs"
                                                        onClick={() => {
                                                            if (isMaximized) {
                                                                collapseWindow()
                                                            } else {
                                                                handleDoubleClick()
                                                            }
                                                        }}
                                                        className="group"
                                                        tooltip="right click for more options"
                                                    >
                                                        <span>
                                                            <IconSquare className="size-5 group-hover:hidden" />
                                                            {isMaximized ? (
                                                                <IconCollapse45Chevrons className="size-6 -m-0.5 hidden group-hover:block" />
                                                            ) : (
                                                                <IconExpand45Chevrons className="size-6 -m-0.5 hidden group-hover:block" />
                                                            )}
                                                        </span>
                                                    </OSButton>
                                                </ContextMenu.Trigger>
                                                <ContextMenu.Portal>
                                                    <ContextMenu.Content
                                                        className="min-w-[220px] rounded-md bg-white dark:bg-accent-dark p-1 shadow-xl z-[10000]"
                                                        data-scheme="primary"
                                                    >
                                                        <ContextMenu.Label className="px-2.5 text-[13px] leading-[25px] text-muted">
                                                            snap to...
                                                        </ContextMenu.Label>
                                                        <ContextMenu.Item
                                                            className="group relative flex h-[25px] select-none items-center rounded px-2.5 text-sm leading-none text-primary hover:bg-accent outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-input-bg data-[disabled]:text-muted"
                                                            onClick={() => handleSnapToSide('left')}
                                                        >
                                                            left half
                                                            <div className="ml-auto pl-5 text-secondary group-data-[disabled]:text-muted group-data-[highlighted]:text-primary">
                                                                <KeyboardShortcut text="Shift" size="xs" />
                                                                <KeyboardShortcut
                                                                    text={<IconArrowLeft className="size-3 inline-block" />}
                                                                    size="xs"
                                                                />
                                                            </div>
                                                        </ContextMenu.Item>
                                                        <ContextMenu.Item
                                                            className="group relative flex h-[25px] select-none items-center rounded px-2.5 text-sm leading-none text-primary hover:bg-accent outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-input-bg data-[disabled]:text-muted"
                                                            onClick={() => handleSnapToSide('right')}
                                                        >
                                                            right half
                                                            <div className="ml-auto pl-5 text-secondary group-data-[disabled]:text-muted group-data-[highlighted]:text-primary">
                                                                <KeyboardShortcut text="Shift" size="xs" />
                                                                <KeyboardShortcut
                                                                    text={<IconArrowRight className="size-3 inline-block" />}
                                                                    size="xs"
                                                                />
                                                            </div>
                                                        </ContextMenu.Item>
                                                        <ContextMenu.Separator className="blueprint-divider" />
                                                        <ContextMenu.Label className="px-2.5 text-[13px] leading-[25px] text-muted">
                                                            resize
                                                        </ContextMenu.Label>
                                                        <ContextMenu.Item
                                                            disabled={isMaximized}
                                                            className="group relative flex h-[25px] select-none items-center rounded px-2.5 text-sm leading-none text-primary hover:bg-accent outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-input-bg data-[disabled]:text-muted"
                                                            onClick={handleDoubleClick}
                                                        >
                                                            maximize
                                                            <div className="ml-auto pl-5 text-secondary group-data-[disabled]:text-muted group-data-[highlighted]:text-primary">
                                                                <KeyboardShortcut text="Shift" size="xs" />
                                                                <KeyboardShortcut
                                                                    text={<IconArrowRight className="size-3 inline-block -rotate-90" />}
                                                                    size="xs"
                                                                />
                                                            </div>
                                                        </ContextMenu.Item>
                                                    </ContextMenu.Content>
                                                </ContextMenu.Portal>
                                            </ContextMenu.Root>
                                        )}

                                        <Tooltip
                                            trigger={
                                                <OSButton
                                                    size="md"
                                                    onClick={handleClose}
                                                    icon={<IconX />}
                                                />
                                            }
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <span>close window</span>
                                                <div className="flex items-center gap-1">
                                                    <KeyboardShortcut text="Shift" size="xs" />
                                                    <KeyboardShortcut text="W" size="xs" />
                                                </div>
                                            </div>
                                        </Tooltip>
                                    </div>
                                </div>
                            )}
                            <div className="w-full flex-1 flex flex-col bg-transparent min-h-0 relative pt-1 px-1.5 has-[+div:empty]:pb-1.5">
                                <div className="w-full h-full bg-primary flex-1 overflow-hidden relative shadow-[0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05)] border border-black/10 dark:border-white/10 rounded-sm shadow-inner">
                                    {(!animating || rendered) && (
                                        item.key === 'home' ? <HomeControl /> : <WindowRouter item={item} />
                                    )}
                                </div>
                            </div>
                            <div id={`window-footer-${item.key}`} className="w-full bg-transparent empty:hidden flex-shrink-0 pb-0.5" />

                            {!item.fixedSize && !item.minimal && (
                                <>
                                    {/* Right Edge */}
                                    <motion.div
                                        className="group absolute right-0 top-0 w-1.5 bottom-6 cursor-ew-resize !transform-none"
                                        drag="x"
                                        dragMomentum={false}
                                        dragConstraints={{ left: 0, right: 0 }}
                                        onDrag={(_event, info) => handleDragResize(info, { x: true })}
                                    >
                                        <div className="hidden group-hover:block absolute inset-y-0 right-0 w-[2px] bg-primary/30" />
                                    </motion.div>
                                    {/* Left Edge */}
                                    <motion.div
                                        className="group absolute left-0 top-0 w-1.5 bottom-6 cursor-ew-resize !transform-none"
                                        drag="x"
                                        dragMomentum={false}
                                        dragConstraints={{ left: 0, right: 0 }}
                                        onDragStart={() => setLeftDragResizing(true)}
                                        onDrag={(_event, info) => handleDragResize(info, { x: true })}
                                        onDragEnd={() => setLeftDragResizing(false)}
                                    >
                                        <div className="hidden group-hover:block absolute inset-y-0 left-0 w-[2px] bg-primary/30" />
                                    </motion.div>
                                    {/* Bottom Edge */}
                                    <motion.div
                                        className="group absolute bottom-0 left-0 right-6 h-1.5 cursor-ns-resize !transform-none"
                                        drag="y"
                                        dragMomentum={false}
                                        dragConstraints={{ top: 0, bottom: 0 }}
                                        onDrag={(_event, info) => handleDragResize(info, { y: true })}
                                    >
                                        <div className="hidden group-hover:block absolute inset-x-0 bottom-0 h-[2px] bg-primary/30" />
                                    </motion.div>
                                    {/* Bottom Right Corner */}
                                    <motion.div
                                        className="group absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center !transform-none"
                                        drag
                                        dragMomentum={false}
                                        dragConstraints={{ left: 0, top: 0, right: 0, bottom: 0 }}
                                        onDrag={(_event, info) => handleDragResize(info, { x: true, y: true })}
                                    >
                                        <div className="hidden group-hover:block relative w-full h-full overflow-hidden rounded-bl">
                                            <div className="absolute -bottom-5 -right-5 w-8 h-8 bg-primary/10 border-t border-primary/30 -rotate-45" />
                                        </div>
                                    </motion.div>
                                    {/* Bottom Left Corner */}
                                    <motion.div
                                        className="group absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize flex items-center justify-center !transform-none"
                                        drag
                                        dragMomentum={false}
                                        dragConstraints={{ left: 0, top: 0, right: 0, bottom: 0 }}
                                        onDragStart={() => setLeftDragResizing(true)}
                                        onDrag={(_event, info) => handleDragResize(info, { x: true, y: true })}
                                        onDragEnd={() => setLeftDragResizing(false)}
                                    >
                                        <div className="hidden group-hover:block relative w-full h-full overflow-hidden rounded-br">
                                            <div className="absolute -bottom-5 -left-5 w-8 h-8 bg-primary/10 border-t border-primary/30 rotate-45" />
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </motion.div>
                    </>
                )}
            </WindowContainer>
        </WindowProvider>
    )
}
