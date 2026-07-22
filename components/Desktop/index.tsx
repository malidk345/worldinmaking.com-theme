"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/App'
import { useAuth } from '../../context/AuthContext'
import { AppIcon } from 'components/OSIcons/AppIcon'
import ArchiveExplorer from 'components/ArchiveExplorer'
import DraggableDesktopIcon from './DraggableDesktopIcon'
import { motion } from 'framer-motion'
import PostsView from 'components/Posts'
import TrendingWidget from './TrendingWidget'
import { useTranslation } from 'hooks/useTranslation'

export default function Desktop() {
    const { addWindow, siteSettings, archivedItems } = useApp()
    const { user, profile } = useAuth()
    const [rendered, setRendered] = useState(false)
    const { t } = useTranslation()

    const apps = useMemo(() => {
        const baseApps = [
            {
                label: 'home',
                displayLabel: t('menu.home'),
                Icon: <AppIcon name="compass" />,
                url: '/',
                onClick: () => addWindow({
                    key: 'home',
                    path: '/',
                    title: t('menu.home')
                })
            },
            {
                label: 'posts',
                displayLabel: t('posts.title'),
                Icon: <AppIcon name="forums" />,
                url: '/posts',
                onClick: () => addWindow({
                    key: 'posts',
                    path: '/posts',
                    title: t('posts.title'),
                    element: <PostsView />
                })
            },
            {
                label: 'community',
                displayLabel: t('menu.community'),
                Icon: <AppIcon name="games" />,
                url: '/questions',
                onClick: () => addWindow({
                    key: 'questions',
                    title: t('menu.community'),
                    path: '/questions'
                })
            },
            user ? {
                label: 'profile',
                displayLabel: profile?.username || user.email || t('menu.profile'),
                Icon: profile?.avatar_url ? (
                    <div className="size-10 rounded-full overflow-hidden border border-primary/10 shadow-sm flex items-center justify-center bg-accent">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <AppIcon name="contact" />
                ),
                url: profile?.username ? `/profile/${profile.username}` : '/profile',
                onClick: () => {
                    if (profile?.username) {
                        addWindow({
                            key: `profile-${profile.username}`,
                            path: `/profile/${profile.username}`,
                            title: t('menu.profile'),
                            size: { width: 900, height: 680 },
                        })
                    } else {
                        addWindow({
                            key: 'profile',
                            path: '/profile',
                            title: t('menu.profile')
                        })
                    }
                }
            } : {
                label: 'login',
                displayLabel: t('menu.sign_in'),
                Icon: <AppIcon name="invite" />,
                url: '/login',
                onClick: () => addWindow({
                    key: 'login',
                    path: '/login',
                    title: t('menu.sign_in')
                })
            },
            {
                label: 'contact',
                displayLabel: t('contact.title'),
                Icon: <AppIcon name="contact" />,
                url: '/contact',
                onClick: () => addWindow({
                    key: 'contact',
                    path: '/contact',
                    title: t('contact.title')
                })
            },
            {
                label: 'archive',
                displayLabel: t('archive.breadcrumb'),
                Icon: <AppIcon name="folder" />,
                url: '/archive',
                onClick: () => addWindow({
                    key: 'archive',
                    path: '/archive',
                    title: t('archive.title'),
                    element: <ArchiveExplorer />
                })
            },
            {
                label: 'arena',
                displayLabel: 'arena',
                Icon: <AppIcon name="aiMax" />,
                url: '/arena',
                onClick: () => addWindow({
                    key: 'arena',
                    path: '/arena',
                    title: 'philosophical arena'
                })
            },
            {
                label: 'notebooks',
                displayLabel: 'notebooks',
                Icon: <AppIcon name="notebook" />,
                url: '/notebooks',
                onClick: () => addWindow({
                    key: 'notebooks',
                    path: '/notebooks',
                    title: 'notebooks explorer',
                    size: { width: 1000, height: 650 }
                })
            }
        ]

        baseApps.unshift({
            label: 'editor',
            displayLabel: t('menu.create_post'),
            Icon: <AppIcon name="typewriter" />,
            url: '/write-post',
            onClick: () => addWindow({
                    key: 'write-post',
                    path: '/write-post',
                    title: t('menu.create_post'),
                    size: { width: 1000, height: 700 }
                })
        })

        return baseApps
    }, [addWindow, t, user, profile])

    const visibleApps = useMemo(() => {
        return apps.filter(app => app.label === 'archive' || !archivedItems.includes(app.label))
    }, [apps, archivedItems])

    useEffect(() => {
        setRendered(true)
    }, [])

    const isTechnical = siteSettings.wallpaper === 'technical'

    const wallpaperClasses = 'bg-accent'

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
                    {/* Intersection Plus Markers with Parallax */}
                    <div className="absolute inset-[-50px] pointer-events-none opacity-[0.08]" style={{
                        transform: 'translate(calc(var(--mouse-nx, 0) * -10px), calc(var(--mouse-ny, 0) * -10px))',
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

            {/* 2001 Bliss Pattern with Parallax */}
            <div className="absolute inset-[-50px] select-none pointer-events-none" style={{
                transform: 'translate(calc(var(--mouse-nx, 0) * -15px), calc(var(--mouse-ny, 0) * -15px))'
            }}>
                <div
                    className="absolute inset-0 opacity-40 dark:opacity-0"
                    style={{
                        backgroundImage: "url('https://res.cloudinary.com/dmukukwp6/image/upload/bliss_8bit_light_0b2e4ef53c.jpg')",
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                    }}
                />
                <div
                    className="absolute inset-0 opacity-0 dark:opacity-40"
                    style={{
                        backgroundImage: "url('https://res.cloudinary.com/dmukukwp6/image/upload/bliss_8bit_dark_703ec033d6.jpg')",
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                    }}
                />
            </div>
            


            <nav className="fixed top-24 left-6 sm:left-10 right-6 sm:right-auto pointer-events-none z-10">
                <motion.ul
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: rendered ? 1 : 0, y: rendered ? 0 : -20 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="list-none m-0 p-0 flex flex-row flex-wrap gap-x-4 sm:gap-x-8 gap-y-6 items-start justify-start pointer-events-auto max-w-full sm:max-w-none"
                >
                    {visibleApps.map((app) => (
                        <DraggableDesktopIcon
                            key={app.label}
                            id={app.label === 'archive' ? 'desktop-folder-archive' : undefined}
                            app={app}
                            initialPosition={{ x: 0, y: 0 }}
                            onPositionChange={() => { }}
                            className="relative !transform-none"
                        />
                    ))}
                </motion.ul>
            </nav>

            <TrendingWidget />
        </div>
    )
}
