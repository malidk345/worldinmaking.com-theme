"use client"

import React, { useEffect } from 'react'
import { useApp } from '../../context/App'
import Desktop from 'components/Desktop'
import TaskBarMenu from 'components/TaskBarMenu'
import AppWindow from 'components/AppWindow'
import ActiveWindowsPanel from 'components/ActiveWindowsPanel'

export default function Wrapper() {
    const {
        windows,
        constraintsRef
    } = useApp()


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

                    {windows.map((item) => {
                        return (
                            <div
                                style={{ zIndex: item.zIndex, position: 'absolute', inset: 0, pointerEvents: 'none' }}
                                key={item.key}
                            >
                                <AppWindow item={item} key={item.key} />
                            </div>
                        )
                    })}

            </div>
            <ActiveWindowsPanel />
        </div>
    )
}
