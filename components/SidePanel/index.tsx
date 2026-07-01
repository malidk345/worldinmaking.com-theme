"use client"

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
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
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={`fixed top-[calc(44px+0.5rem)] sm:top-[calc(44px+1rem)] right-2 sm:right-4 h-auto max-h-[90dvh] sm:h-[calc(100dvh-2rem-44px)] ${width} bg-white/80 dark:bg-black/80 border border-primary/20 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] supports-[backdrop-filter]:backdrop-blur-[60px] z-[10000] flex flex-col text-primary overflow-hidden ${panelClassName}`}
                >
                    <div className="h-full flex flex-col">
                        {(title || showCloseButton) && (
                            <div className="flex items-center justify-between px-5 py-3 border-b border-primary/20 bg-transparent">
                                <h2 className="text-sm font-black tracking-tight m-0">{title}</h2>
                                <div className="flex items-center gap-2">
                                    {headerAside && <div>{headerAside}</div>}
                                    {showCloseButton && (
                                        <Tooltip trigger={
                                            <OSButton onClick={onClose} size="sm" variant="ghost" className="px-1 shadow-none border-none">
                                                <ChevronRight className="size-5" />
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
