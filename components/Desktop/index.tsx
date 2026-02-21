"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useApp } from '../../context/App'
import { AppIcon } from 'components/OSIcons/AppIcon'
import DraggableDesktopIcon from './DraggableDesktopIcon'
import { motion } from 'framer-motion'
import PostsView from 'components/Posts'

export default function Desktop() {
    const { addWindow, constraintsRef, siteSettings } = useApp()
    const [rendered, setRendered] = useState(false)

    const apps = useMemo(() => [
        {
            label: 'home.mdx',
            Icon: <AppIcon name="doc" />,
            onClick: () => addWindow({
                key: 'home',
                path: '/',
                title: 'home.mdx',
                size: { width: 900, height: 750 },
                position: { x: 50, y: 50 }
            })
        },
        {
            label: 'Posts',
            Icon: <AppIcon name="newspaper" />,
            onClick: () => addWindow({
                key: 'posts',
                path: '/posts',
                title: 'Posts',
                size: { width: 900, height: 750 },
                position: { x: 50, y: 50 },
                element: <PostsView />
            })
        }
    ], [addWindow])

    useEffect(() => {
        setRendered(true)
    }, [])

    const isTechnical = siteSettings.wallpaper === 'technical'

    const wallpaperClasses = useMemo(() => {
        switch (siteSettings.wallpaper) {
            case 'slate': return 'bg-slate-100 dark:bg-slate-900'
            case 'zinc': return 'bg-zinc-100 dark:bg-zinc-900'
            case 'neutral': return 'bg-neutral-100 dark:bg-neutral-900'
            case 'technical': return 'bg-[#e9e9e9] text-zinc-900'
            default: return 'bg-light dark:bg-black'
        }
    }, [siteSettings.wallpaper])

    return (
        <div
            data-app="Desktop"
            className={`fixed inset-0 size-full overflow-hidden flex items-center justify-center transition-colors duration-500 ${wallpaperClasses}`}
            style={isTechnical ? {
                backgroundImage: `
                    radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px),
                    linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px, 100px 100px, 100px 100px'
            } : {}}
        >
            {isTechnical && (
                <>
                    {/* Intersection Plus Markers */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{
                        backgroundImage: `
                            linear-gradient(to right, black 4px, transparent 4px),
                            linear-gradient(to bottom, black 4px, transparent 4px)
                        `,
                        backgroundSize: '100px 100px',
                        backgroundPosition: '-2px -2px'
                    }} />

                    {/* Corner Decorations - Mechanical/Precision Style */}
                    <div className="absolute top-10 left-10 size-40 pointer-events-none">
                        <div className="absolute top-0 left-0 size-8 border-t-2 border-l-2 border-black/10" />
                        <div className="absolute top-2 left-2 size-4 border-t border-l border-black/5" />
                    </div>

                    <div className="absolute top-10 right-10 size-40 pointer-events-none">
                        <div className="absolute top-0 right-0 size-8 border-t-2 border-r-2 border-black/10" />
                        <div className="absolute top-2 right-2 size-4 border-t border-r border-black/5" />
                    </div>

                    <div className="absolute bottom-24 left-10 size-40 pointer-events-none">
                        <div className="absolute bottom-0 left-0 size-8 border-b-2 border-l-2 border-black/10" />
                        <div className="absolute bottom-2 left-2 size-4 border-b border-l border-black/5" />
                    </div>

                    <div className="absolute bottom-24 right-10 size-40 pointer-events-none">
                        <div className="absolute bottom-0 right-0 size-8 border-b-2 border-r-2 border-black/10" />
                        <div className="absolute bottom-2 right-2 size-4 border-b border-r border-black/5" />
                    </div>

                    {/* Subtle frame lines */}
                    <div className="absolute inset-10 border border-black/[0.02] pointer-events-none" />
                </>
            )}


            <nav className="flex flex-col items-center justify-center pointer-events-none">
                <motion.ul
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: rendered ? 1 : 0, scale: rendered ? 1 : 0.9 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="list-none m-0 p-0 flex gap-8 items-center justify-center pointer-events-auto"
                >
                    {apps.map((app) => (
                        <DraggableDesktopIcon
                            key={app.label}
                            app={app}
                            initialPosition={{ x: 0, y: 0 }} // Use relative positioning now
                            onPositionChange={() => { }}
                            className="relative !transform-none" // Override absolute
                        />
                    ))}
                </motion.ul>
            </nav>
        </div>
    )
}
