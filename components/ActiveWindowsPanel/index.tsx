"use client"

import React, { useEffect } from 'react'
import { useApp } from '../../context/App'
import type { AppWindow as AppWindowType } from '../../context/Window'
import SidePanel from 'components/SidePanel'
import ScrollArea from 'components/RadixUI/ScrollArea'
import OSButton from 'components/OSButton'
import { IconApps, IconScreen, IconTrash, IconX } from '@posthog/icons';
import { motion, AnimatePresence } from 'framer-motion'

export default function ActiveWindowsPanel() {
    const {
        windows,
        isActiveWindowsPanelOpen,
        setIsActiveWindowsPanelOpen,
        focusedWindow,
        bringToFront,
        closeWindow,
        closeAllWindows,
    } = useApp()

    const closeActiveWindowsPanel = React.useCallback(() => {
        setIsActiveWindowsPanelOpen(false)
    }, [setIsActiveWindowsPanelOpen])

    // Add keyboard listener for Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isActiveWindowsPanelOpen) {
                e.preventDefault()
                closeActiveWindowsPanel()
            }
        }

        if (isActiveWindowsPanelOpen) {
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isActiveWindowsPanelOpen, closeActiveWindowsPanel])

    const handleWindowClick = (appWindow: AppWindowType) => {
        bringToFront(appWindow)
        closeActiveWindowsPanel()
    }

    const totalWindows = windows.length

    return (
        <SidePanel
            isOpen={isActiveWindowsPanelOpen}
            onClose={closeActiveWindowsPanel}
            title="active tasks"
            width="w-[340px] max-w-[calc(100vw-1rem)]"
            panelClassName="h-[calc(100dvh-44px-0.75rem)] max-h-[calc(100dvh-44px-0.75rem)] sm:h-[calc(100dvh-2rem-44px)] sm:max-h-[calc(100dvh-2rem-44px)] !border-primary/20"
        >
            <div className="h-full flex flex-col font-sans tracking-tight">
                <ScrollArea className="px-2 py-3 h-full">
                    <div className="flex flex-col gap-1.5">
                        <AnimatePresence>
                            {windows.map((w) => (
                                <motion.div
                                    key={w.key}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 25, mass: 1 }}
                                    className="relative group"
                                >
                                    <button
                                        onClick={() => handleWindowClick(w)}
                                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-[24px] text-[13px] transition-all duration-300 border ${focusedWindow?.key === w.key
                                            ? 'bg-white/90 dark:bg-white/10 text-black dark:text-white border-black/10 dark:border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] font-semibold supports-[backdrop-filter]:backdrop-blur-xl'
                                            : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-primary/80 border-transparent hover:border-black/10 dark:hover:border-white/10'
                                            }`}
                                    >
                                        <div className={`size-5 rounded-full flex items-center justify-center shrink-0 ${focusedWindow?.key === w.key ? 'bg-white/10' : 'bg-primary/10'
                                            } ${w.minimized ? 'opacity-40 grayscale' : ''}`}>
                                            {w.icon || <IconApps className={`size-3.5 ${focusedWindow?.key === w.key ? 'text-black dark:text-white' : 'text-primary'}`} />}
                                        </div>
                                        <span className={`flex-1 text-left truncate tracking-tight ${w.minimized ? 'italic opacity-60' : ''}`}>
                                            {w.title || 'untitled'}
                                        </span>
                                        {w.minimized && (
                                            <span className={`text-[8px] uppercase tracking-widest opacity-60 font-black px-1 py-0.5 rounded-full mr-6 ${focusedWindow?.key === w.key ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'
                                                }`}>min</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            closeWindow(w)
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                        aria-label="close window"
                                    >
                                        <IconX className="size-3.5" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {totalWindows === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-primary/40 text-center gap-4">
                                <div className="size-14 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mb-2">
                                    <IconScreen className="size-6 opacity-40" />
                                </div>
                                <div>
                                    <p className="font-mono text-xs font-black m-0 tracking-widest uppercase text-primary/60">no active tasks</p>
                                    <p className="text-[10px] m-0 mt-1.5 max-w-[180px] mx-auto leading-relaxed lowercase">your workspace is clean and ready.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {totalWindows > 0 && (
                    <div className="p-3 mt-auto border-t border-primary/20 bg-primary/5 supports-[backdrop-filter]:backdrop-blur-md">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-black opacity-50 tracking-widest uppercase m-0 leading-none">session</h3>
                            <span className="text-[10px] font-bold text-primary/70 tracking-widest">
                                {totalWindows} OPEN
                            </span>
                        </div>
                        <OSButton
                            variant="secondary"
                            size="sm"
                            width="full"
                            className="justify-center font-bold tracking-widest uppercase text-[10px] gap-2 !bg-primary/10 hover:!bg-red-500 hover:!text-white hover:!border-red-600 border-transparent transition-colors duration-200 group !rounded-full"
                            onClick={() => {
                                closeAllWindows()
                                closeActiveWindowsPanel()
                            }}
                        >
                            <IconTrash className="size-3.5 opacity-60 group-hover:opacity-100" />
                            <span>kill all processes</span>
                        </OSButton>
                    </div>
                )}
            </div>
        </SidePanel>
    )
}
