"use client"

import React, { useEffect, useRef } from 'react'
import { getPanelSurfaceBg } from '../../constants/frostedSurfaces'
import { motion, AnimatePresence } from 'framer-motion'
import { IconChevronRight } from '@posthog/icons';
import OSButton from 'components/OSButton'
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
                    className={`fixed top-[calc(44px+0.5rem)] sm:top-[calc(44px+1rem)] right-2 sm:right-4 h-auto max-h-[90dvh] sm:h-[calc(100dvh-2rem-44px)] ${width} ${getPanelSurfaceBg()} border border-white/20 dark:border-white/10 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)] z-[10000] flex flex-col text-primary overflow-hidden ${panelClassName}`}
                >
                    <div className="h-full flex flex-col">
                        {(title || showCloseButton) && (
                            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10 bg-transparent">
                                <h2 className="text-[15px] font-semibold tracking-tight m-0 capitalize">{title}</h2>
                                <div className="flex items-center gap-2">
                                    {headerAside && <div>{headerAside}</div>}
                                    {showCloseButton && (
                                        <Tooltip trigger={
                                            <OSButton onClick={onClose} size="sm" variant="ghost" className="px-1 shadow-none border-none hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                                <IconChevronRight className="size-5" />
                                            </OSButton>
                                        }>
                                            Hide sidebar
                                        </Tooltip>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-hidden">
                            {children}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
