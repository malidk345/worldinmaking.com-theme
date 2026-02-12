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

    const wallpaperLight = "https://res.cloudinary.com/dmukukwp6/image/upload/keyboard_garden_bg_light_03a349af5c.png"
    const wallpaperDark = "https://res.cloudinary.com/dmukukwp6/image/upload/keyboard_garden_bg_dark_9ab088797a.png"
    return (
        <div data-app="Desktop" className="fixed inset-0 size-full overflow-hidden flex items-center justify-center">
            {/* Wallpaper Implementation */}
            <div className="absolute inset-0 -z-10 select-none pointer-events-none">
                <div
                    className="absolute inset-0 opacity-100 dark:opacity-0 transition-opacity duration-700"
                    style={{
                        backgroundImage: `url(${wallpaperLight})`,
                        backgroundSize: '100px 100px',
                        backgroundRepeat: 'repeat',
                    }}
                />
                <div
                    className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-700"
                    style={{
                        backgroundImage: `url(${wallpaperDark})`,
                        backgroundSize: '200px 200px',
                        backgroundRepeat: 'repeat',
                    }}
                />
            </div>

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
