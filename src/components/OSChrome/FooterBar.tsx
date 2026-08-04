import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconChevronRight, IconChevronLeft, IconApps, IconSearch, IconMinus, IconX, IconSparkles } from '@posthog/icons'
import { useApp, useAppActions, useAppWindows } from '../../context/App'
import Tooltip from 'components/RadixUI/Tooltip'
import OSButton from 'components/OSButton'

export default function FooterBar() {
    const { windows } = useAppWindows()
    const { updateWindow, closeWindow, openSearch, updateSiteSettings } = useAppActions()
    const { siteSettings, isActiveWindowsPanelOpen, setIsActiveWindowsPanelOpen } = useApp()
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <aside className="fixed bottom-3 left-3 z-[9999] flex items-center gap-1.5 pointer-events-auto">
            {!isExpanded ? (
                <Tooltip
                    trigger={
                        <OSButton
                            onClick={() => setIsExpanded(true)}
                            size="sm"
                            className="!p-1.5 shadow-lg border border-primary/20 bg-accent/90 backdrop-blur hover:bg-accent"
                            aria-label="Expand OS Toolbar"
                        >
                            <IconChevronRight className="size-4 text-primary" />
                        </OSButton>
                    }
                >
                    <span className="text-xs font-semibold">OS Quick Toolbar (Expand)</span>
                </Tooltip>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -10 }}
                    className="flex items-center gap-1 p-1 bg-accent/95 backdrop-blur border border-primary/20 rounded-lg shadow-xl"
                >
                    <OSButton
                        onClick={() => setIsExpanded(false)}
                        size="sm"
                        className="!p-1 text-secondary hover:text-primary"
                    >
                        <IconChevronLeft className="size-4" />
                    </OSButton>

                    <div className="w-px h-4 bg-primary/10 mx-0.5" />

                    <Tooltip
                        trigger={
                            <OSButton onClick={() => openSearch()} size="sm" className="!p-1">
                                <IconSearch className="size-4 text-primary" />
                            </OSButton>
                        }
                    >
                        <span className="text-xs">Search (/)</span>
                    </Tooltip>

                    <Tooltip
                        trigger={
                            <OSButton
                                onClick={() =>
                                    updateSiteSettings({
                                        ...siteSettings,
                                        colorMode: siteSettings.colorMode === 'dark' ? 'light' : 'dark',
                                    })
                                }
                                size="sm"
                                className="!p-1"
                            >
                                <IconSparkles className="size-4 text-primary" />
                            </OSButton>
                        }
                    >
                        <span className="text-xs">Toggle Theme</span>
                    </Tooltip>

                    <Tooltip
                        trigger={
                            <OSButton
                                onClick={() => setIsActiveWindowsPanelOpen(!isActiveWindowsPanelOpen)}
                                size="sm"
                                className="!p-1"
                            >
                                <IconApps className="size-4 text-primary" />
                            </OSButton>
                        }
                    >
                        <span className="text-xs">Mission Control</span>
                    </Tooltip>

                    {windows.length > 0 && (
                        <>
                            <div className="w-px h-4 bg-primary/10 mx-0.5" />
                            <Tooltip
                                trigger={
                                    <OSButton
                                        onClick={() => windows.forEach((w) => updateWindow(w, { minimized: true }))}
                                        size="sm"
                                        className="!p-1"
                                    >
                                        <IconMinus className="size-4 text-primary" />
                                    </OSButton>
                                }
                            >
                                <span className="text-xs">Minimize All</span>
                            </Tooltip>

                            <Tooltip
                                trigger={
                                    <OSButton
                                        onClick={() => windows.forEach((w) => closeWindow(w))}
                                        size="sm"
                                        className="!p-1 text-red hover:bg-red/10"
                                    >
                                        <IconX className="size-4" />
                                    </OSButton>
                                }
                            >
                                <span className="text-xs">Close All Windows</span>
                            </Tooltip>
                        </>
                    )}
                </motion.div>
            )}
        </aside>
    )
}
