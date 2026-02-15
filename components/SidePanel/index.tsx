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
}

export default function SidePanel({
    isOpen,
    onClose,
    title,
    children,
    headerAside,
    width = 'w-96',
    showCloseButton = true,
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
                    transition={{ duration: 0.3, type: 'tween', ease: 'easeOut' }}
                    className={`fixed top-[calc(44px+0.5rem)] sm:top-[calc(44px+1rem)] right-2 sm:right-4 h-auto max-h-[90vh] sm:h-[calc(100vh-2rem-44px)] ${width} bg-white dark:bg-zinc-900 border border-primary rounded-md shadow-2xl z-[10000] flex flex-col text-primary overflow-hidden`}
                >
                    <div className="h-full flex flex-col">
                        {(title || showCloseButton) && (
                            <div className="flex items-center justify-between px-4 py-2 border-b border-primary bg-zinc-50 dark:bg-zinc-800/50">
                                <h2 className="text-sm font-black m-0">{title}</h2>
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
