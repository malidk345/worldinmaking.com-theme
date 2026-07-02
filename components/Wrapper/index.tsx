"use client"

import React, { useState, useEffect } from 'react'
import { useApp } from '../../context/App'
import Desktop from 'components/Desktop'
import TaskBarMenu from 'components/TaskBarMenu'
import AppWindow from 'components/AppWindow'
import ActiveWindowsPanel from 'components/ActiveWindowsPanel'
import { AnimatePresence, motion } from 'framer-motion'

export default function Wrapper() {
    const {
        windows,
        constraintsRef
    } = useApp()

    const [shakeReady] = useState(false)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const x = e.clientX;
            const y = e.clientY;

            // Set global CSS variables for spotlight and parallax effects
            document.documentElement.style.setProperty('--mouse-x', `${x}px`);
            document.documentElement.style.setProperty('--mouse-y', `${y}px`);

            // Calculate normalized values (-1 to 1) for parallax
            const nx = (x / window.innerWidth) * 2 - 1;
            const ny = (y / window.innerHeight) * 2 - 1;
            document.documentElement.style.setProperty('--mouse-nx', nx.toString());
            document.documentElement.style.setProperty('--mouse-ny', ny.toString());
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);


    return (
        <div className="fixed inset-0 size-full flex flex-col select-none overflow-hidden skin-classic:font-sans">
            <TaskBarMenu />
            <div ref={constraintsRef} className="flex-grow relative overflow-hidden">
                <Desktop />
                <AnimatePresence mode="popLayout">
                    {windows.map((item, index: number) => {
                        return (
                            <motion.div
                                style={{ zIndex: item.zIndex, position: 'absolute', inset: 0, pointerEvents: 'none' }}
                                key={item.key}
                                initial={{
                                    opacity: 0,
                                    scale: 0.95,
                                    y: 40,
                                    z: -100 // Depth effect starting point
                                }}
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
                                        : {
                                            opacity: 1,
                                            scale: 1,
                                            y: 0,
                                            z: 0,
                                            transition: {
                                                type: "spring",
                                                stiffness: 350,
                                                damping: 15,
                                                mass: 1,
                                                restDelta: 0.001
                                            }
                                        }
                                }
                                exit={{
                                    y: typeof window !== 'undefined' ? window.innerHeight + 200 : 800,
                                    scale: 0.95,
                                    opacity: 0,
                                    transition: {
                                        delay: index * 0.05,
                                        type: "spring",
                                        stiffness: 350,
                                        damping: 15,
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
