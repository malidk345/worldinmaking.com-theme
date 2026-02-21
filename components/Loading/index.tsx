"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STATUS_MESSAGES = [
    'syncing data nodes',
    'mapping architecture',
    'establishing connection',
    'fetching transmissions',
    'verifying entry points',
    'assembling layout'
]

interface LoadingProps {
    className?: string
    fullScreen?: boolean
    label?: string
}

export default function Loading({ className = '', fullScreen = false, label }: LoadingProps) {
    const [statusIndex, setStatusIndex] = useState(0)

    useEffect(() => {
        const statusInterval = setInterval(() => {
            setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length)
        }, 2000)

        return () => clearInterval(statusInterval)
    }, [])

    const containerClasses = fullScreen
        ? 'fixed inset-0 z-[9999] bg-[#FDFDF8] dark:bg-[#1E1F23] flex flex-col items-center justify-center'
        : `relative flex flex-col items-center justify-center py-12 ${className}`

    return (
        <div className={containerClasses}>
            <div className="flex items-center gap-6 p-5 px-7 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-xl border border-navy/10 dark:border-white/10 shadow-sm transition-all duration-300">
                {/* Precision Architectural Loader */}
                <div className="relative size-10 flex-shrink-0 flex items-center justify-center">
                    {/* Fixed Crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <div className="w-full h-px bg-navy dark:bg-white" />
                        <div className="h-full w-px bg-navy dark:bg-white absolute" />
                    </div>

                    {/* Pulsing Base Frame */}
                    <motion.div
                        animate={{ opacity: [0.1, 0.3, 0.1], scale: [0.95, 1.05, 0.95] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 border border-navy/30 dark:border-white/30 rounded-sm"
                    />

                    {/* Rotating Segmented Ring */}
                    <motion.svg
                        viewBox="0 0 100 100"
                        className="size-full absolute"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    >
                        <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray="20 180"
                            strokeLinecap="round"
                            className="text-navy dark:text-white"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray="2 10"
                            className="text-navy/20 dark:text-white/20"
                        />
                    </motion.svg>

                    {/* Center Point */}
                    <div className="size-1.5 bg-navy dark:bg-white rounded-full z-10" />
                </div>

                {/* Refined Content Area */}
                <div className="flex flex-col gap-2 min-w-[150px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={statusIndex}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="text-[13px] font-bold tracking-widest text-navy dark:text-white/95 lowercase font-nav"
                        >
                            {label || STATUS_MESSAGES[statusIndex]}
                        </motion.div>
                    </AnimatePresence>

                    {/* Minimal Technical Progress Bar */}
                    <div className="w-full h-[2px] bg-navy/5 dark:bg-white/5 relative overflow-hidden rounded-full">
                        <motion.div
                            className="absolute inset-0 bg-navy/60 dark:bg-white/60"
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
