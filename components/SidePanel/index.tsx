"use client"

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconChevronRight } from '@posthog/icons';
import { LemonButton } from 'components/LemonUI'
import Tooltip from 'components/RadixUI/Tooltip'

interface SidePanelProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    headerAside?: React.ReactNode
    width?: string
    showCloseButton?: boolean
    panelClassName?: string
}

export default function SidePanel({
    isOpen,
    onClose,
    title,
    children,
    headerAside,
    width = 'w-96',
    showCloseButton = true,
    panelClassName = '',
}: SidePanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose()
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={panelRef}
                    data-scheme="primary"
                    initial={{ x: '110%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '110%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 1 }}
                    className={`fixed top-[calc(44px+0.5rem)] sm:top-[calc(44px+1rem)] right-2 sm:right-4 h-auto max-h-[90dvh] sm:h-[calc(100dvh-2rem-44px)] ${width} LemonDrawer rounded-[var(--radius-lg)] shadow-[var(--shadow-elevation-3000)] bg-white/95 dark:bg-[#121214]/95 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-[#0a0a0c]/80 supports-[backdrop-filter]:backdrop-blur-[25px] supports-[backdrop-filter]:saturate-[190%] border border-black/10 dark:border-white/10 z-[10000] flex flex-col text-[var(--text-3000)] overflow-hidden ${panelClassName}`}
                >
                    <div className="h-full flex flex-col">
                        {(title || showCloseButton) && (
                            <div className="LemonDrawer__header bg-transparent">
                                <h2 className="LemonDrawer__title m-0 capitalize">{title}</h2>
                                <div className="flex items-center gap-2">
                                    {headerAside && <div>{headerAside}</div>}
                                    {showCloseButton && (
                                        <Tooltip trigger={
                                            <LemonButton
                                                onClick={onClose}
                                                size="small"
                                                type="secondary"
                                                className="!px-1 !min-h-0"
                                            >
                                                <IconChevronRight className="size-4" />
                                            </LemonButton>
                                        }>
                                            Hide sidebar
                                        </Tooltip>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="LemonDrawer__content flex-1">
                            {children}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
