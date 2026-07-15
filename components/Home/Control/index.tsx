"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { IconGlobe, IconTerminal } from '@posthog/icons'

export default function HomeControl() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-black p-4 sm:p-8 font-[family:var(--font-apple)] lowercase selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25, bounce: 0.4 }}
                className="w-full max-w-2xl bg-white dark:bg-[#1C1C1E] rounded-[32px] p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-none border border-black/[0.04] dark:border-white/[0.04] flex flex-col gap-8 my-auto"
            >
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                        className="w-14 h-14 bg-blue-500/10 dark:bg-blue-500/20 rounded-[18px] flex items-center justify-center text-blue-500 mb-2"
                    >
                        <IconGlobe className="w-8 h-8" />
                    </motion.div>

                    <div className="flex flex-col gap-1.5">
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-black dark:text-white m-0">
                            worldinmaking
                        </h1>
                        <p className="text-[15px] text-[#86868B] font-medium tracking-tight m-0">
                            an exploration of constructed realities
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-col gap-4 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[24px] p-6 text-[15px] leading-relaxed text-black/80 dark:text-white/80">
                    <p className="m-0">
                        welcome to worldinmaking (wim). this is a space dedicated to the interrogation of the systems we inherit and the structures we build.
                    </p>
                    <p className="m-0">
                        everything you see here — from the code to the concepts — is a work in progress. a conscious act of formation.
                    </p>
                </div>

                {/* Footer Badges */}
                <div className="flex flex-wrap gap-3 pt-2">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold tracking-wide"
                    >
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        status: active
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 rounded-full text-xs font-bold tracking-wide"
                    >
                        <IconTerminal className="w-3.5 h-3.5 opacity-70" />
                        ver: 0.1.0-alpha
                    </motion.div>
                </div>
            </motion.div>
        </div>
    )
}
