"use client"

import React, { useEffect } from 'react'
import { useApp } from '../../context/App'
import type { AppWindow as AppWindowType } from '../../context/Window'
import OSButton from 'components/OSButton'
import { IconApps, IconScreen, IconTrash, IconX } from '@posthog/icons';
import { motion, AnimatePresence } from 'framer-motion'

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2, delay: 0.1 } }
}

const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: 'spring' as const, stiffness: 300, damping: 25, mass: 1,
            staggerChildren: 0.05,
            delayChildren: 0.05
        }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
}

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
        <AnimatePresence>
            {isActiveWindowsPanelOpen && (
                <motion.div
                    className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-4 sm:p-8 bg-black/40 dark:bg-black/60 supports-[backdrop-filter]:backdrop-blur-[25px] supports-[backdrop-filter]:saturate-[190%]"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            closeActiveWindowsPanel()
                        }
                    }}
                >
                    <motion.div
                        className="w-full max-w-5xl flex flex-col items-center gap-12"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                closeActiveWindowsPanel()
                            }
                        }}
                    >
                        {totalWindows === 0 ? (
                            <motion.div
                                variants={itemVariants}
                                className="flex flex-col items-center justify-center p-12 rounded-[32px] bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] text-white/60 text-center gap-6"
                            >
                                <div className="size-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <IconScreen className="size-8 opacity-40" />
                                </div>
                                <div>
                                    <p className="font-mono text-sm font-black m-0 tracking-widest uppercase text-white/80">no active tasks</p>
                                    <p className="text-xs m-0 mt-2 max-w-[200px] mx-auto leading-relaxed lowercase">your workspace is clean and ready.</p>
                                </div>
                            </motion.div>
                        ) : (
                            <div
                                className="flex flex-wrap items-center justify-center gap-6 w-full"
                                onClick={(e) => {
                                    if (e.target === e.currentTarget) {
                                        closeActiveWindowsPanel()
                                    }
                                }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {windows.map((w) => {
                                        const isFocused = focusedWindow?.key === w.key
                                        return (
                                            <motion.div
                                                key={w.key}
                                                layout
                                                variants={itemVariants}
                                                className="relative group"
                                            >
                                                <button
                                                    onClick={() => handleWindowClick(w)}
                                                    className={`relative flex flex-col items-center justify-center w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] p-4 rounded-[32px] transition-all duration-300 active:scale-[0.96] border shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.15)] ${
                                                        isFocused
                                                            ? 'bg-white/90 dark:bg-white/10 text-black dark:text-white border-black/10 dark:border-white/20 scale-105 shadow-[0_16px_48px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.3)]'
                                                            : 'bg-white/40 dark:bg-black/40 hover:bg-white/60 dark:hover:bg-white/10 text-black/80 dark:text-white/80 border-white/20 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className={`size-16 sm:size-20 rounded-[24px] flex items-center justify-center mb-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] ${
                                                        isFocused ? 'bg-black/5 dark:bg-white/10' : 'bg-black/5 dark:bg-white/5'
                                                    } ${w.minimized ? 'opacity-40 grayscale' : ''}`}>
                                                        {w.icon ? (
                                                            <div className="scale-150 sm:scale-[2]">
                                                                {w.icon}
                                                            </div>
                                                        ) : (
                                                            <IconApps className={`size-8 sm:size-10 ${isFocused ? 'text-black dark:text-white' : 'text-black/60 dark:text-white/60'}`} />
                                                        )}
                                                    </div>

                                                    <span className={`w-full text-center text-sm font-semibold truncate tracking-tight px-2 ${w.minimized ? 'italic opacity-60' : ''}`}>
                                                        {w.title || 'untitled'}
                                                    </span>

                                                    {w.minimized && (
                                                        <span className="absolute bottom-3 text-[9px] uppercase tracking-widest opacity-80 font-black px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-black dark:text-white">
                                                            min
                                                        </span>
                                                    )}
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        closeWindow(w)
                                                    }}
                                                    className="absolute -top-3 -right-3 size-8 flex items-center justify-center bg-red-500 text-white shadow-lg rounded-full opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 hover:bg-red-600 transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-10"
                                                >
                                                    <IconX className="size-4" />
                                                </button>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        )}

                        {totalWindows > 0 && (
                            <motion.div variants={itemVariants}>
                                <OSButton
                                    variant="secondary"
                                    size="md"
                                    className="!rounded-full px-6 py-3 font-bold tracking-widest uppercase text-xs gap-3 bg-white/20 dark:bg-black/40 hover:!bg-red-500 hover:!text-white hover:border-red-600 border-white/20 dark:border-white/10 text-black/80 dark:text-white shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.15)] transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)] group"
                                    onClick={() => {
                                        closeAllWindows()
                                        closeActiveWindowsPanel()
                                    }}
                                >
                                    <IconTrash className="size-4 opacity-60 group-hover:opacity-100" />
                                    <span>kill all processes</span>
                                </OSButton>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
