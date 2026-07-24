"use client"

import React, { useEffect } from 'react'
import { useApp } from '../../context/App'
import { LemonButton } from 'components/LemonUI'
import { IconScreen, IconTrash } from '@posthog/icons';
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


    const totalWindows = windows.length

    return (
        <AnimatePresence>
            {isActiveWindowsPanelOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 z-[10000] bg-white/10 dark:bg-black/10 supports-[backdrop-filter]:backdrop-blur-[10px] supports-[backdrop-filter]:saturate-[190%]"
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={closeActiveWindowsPanel}
                    />
                    <div className="fixed inset-0 z-[20000] pointer-events-none flex flex-col items-center justify-center p-4 sm:p-8" >
                        <motion.div
                            className="w-full max-w-5xl flex flex-col items-center gap-12 pointer-events-auto"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
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
                                >
                                    {/* Windows are now rendered directly on the desktop layout and scaled down */}
                                </div>
                            )}

                            {totalWindows > 0 && (
                                <motion.div variants={itemVariants} className="fixed bottom-24 z-[20000]">
                                    <LemonButton
                                        type="secondary"
                                        size="medium"
                                        className="!rounded-full px-6 py-3 font-bold tracking-widest uppercase text-xs gap-3 bg-white/20 dark:bg-black/40 hover:!bg-red-500 hover:!text-white hover:border-red-600 border-white/20 dark:border-white/10 text-black/80 dark:text-white shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.15)] transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)] group"
                                        onClick={() => {
                                            closeAllWindows()
                                            closeActiveWindowsPanel()
                                        }}
                                    >
                                        <IconTrash className="size-4 opacity-60 group-hover:opacity-100" />
                                        <span>kill all processes</span>
                                    </LemonButton>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
