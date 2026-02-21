"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/App'
import type { AppWindow as AppWindowType } from '../../context/Window'
import Desktop from 'components/Desktop'
import TaskBarMenu from 'components/TaskBarMenu'
import AppWindow from 'components/AppWindow'
import ActiveWindowsPanel from 'components/ActiveWindowsPanel'
import { AnimatePresence, motion } from 'framer-motion'

export default function Wrapper() {
    const {
        windows,
        constraintsRef,
        compact,
        closeAllWindows
    } = useApp()

    const [shakeReady, setShakeReady] = useState(false)

    return (
        <div className="fixed inset-0 size-full flex flex-col select-none overflow-hidden skin-classic:font-sans">
            <TaskBarMenu />
            <div ref={constraintsRef} className="flex-grow relative overflow-hidden">
                <Desktop />
                <AnimatePresence mode="popLayout">
                    {windows.map((item, index: number) => {
                        return (
                            <motion.div
                                key={item.key}
                                animate={
                                    shakeReady
                                        ? {
                                            x: [0, (Math.random() - 0.5) * 45],
                                            y: [0, (Math.random() - 0.5) * 22],
                                            rotate: [0, (Math.random() - 0.5) * 15],
                                            transition: {
                                                delay: index * 0.05,
                                                duration: 0.1,
                                            },
                                        }
                                        : {}
                                }
                                exit={{
                                    y: typeof window !== 'undefined' ? window.innerHeight + 200 : 800,
                                    opacity: 0,
                                    transition: {
                                        delay: index * 0.05,
                                        ease: 'easeInOut',
                                        duration: 0.4
                                    },
                                }}
                            >
                                <AppWindow item={item} key={item.key} />
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
            <ActiveWindowsPanel />
        </div>
    )
}
