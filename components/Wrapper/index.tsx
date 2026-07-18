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
        constraintsRef,
        siteSettings,
        isActiveWindowsPanelOpen
    } = useApp()

    useEffect(() => {
        if (typeof window === 'undefined') return
        
        let r = 225, g = 215, b = 194 // default keyboard-garden light: #E1D7C2 (225, 215, 194)
        const isDark = siteSettings.colorMode === 'dark'
        
        if (siteSettings.wallpaper === 'keyboard-garden') {
            if (isDark) { r = 51; g = 55; b = 51 } // #333733
            else { r = 225; g = 215; b = 194 } // #E1D7C2
        } else if (siteSettings.wallpaper === 'startup-monopoly') {
            if (isDark) { r = 29; g = 31; b = 39 } // #1d1f27
            else { r = 254; g = 252; b = 237 } // #FEFCED
        } else if (siteSettings.wallpaper === 'coding-at-night') {
            r = 84; g = 97; b = 142 // #54618E
        } else if (siteSettings.wallpaper === '2001-bliss') {
            if (isDark) { r = 11; g = 19; b = 43 }
            else { r = 91; g = 146; b = 229 }
        }
        
        document.documentElement.style.setProperty('--wallpaper-bg-rgb', `${r} ${g} ${b}`)
    }, [siteSettings.wallpaper, siteSettings.colorMode])


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


    const hasMaximizedWindow = React.useMemo(() => {
        if (!constraintsRef.current) return false
        const bounds = constraintsRef.current.getBoundingClientRect()
        const maxWidth = bounds.width
        const maxHeight = bounds.height
        return windows.some(w => {
            if (w.minimized) return false
            return (
                w.size.width >= maxWidth - 5 &&
                w.size.height >= maxHeight - 5 &&
                Math.abs(w.position.x) <= 5 &&
                Math.abs(w.position.y) <= 5
            )
        })
    }, [windows, constraintsRef])

    return (
        <div className="fixed inset-0 size-full flex flex-col select-none overflow-hidden skin-classic:font-sans p-1.5 gap-0 bg-transparent">
            <TaskBarMenu isMaximized={hasMaximizedWindow} />
            <div ref={constraintsRef} className="flex-grow relative overflow-hidden">
                <Desktop />

                    {windows.map((item, idx) => {
                        return (
                            <div
                                style={{ zIndex: isActiveWindowsPanelOpen ? 10001 + idx : item.zIndex, position: 'absolute', inset: 0, pointerEvents: 'none' }}
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
