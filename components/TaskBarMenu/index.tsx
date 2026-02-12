"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    IconSearch,

    IconUser,
    IconApp,
    IconMessage,
    IconNotification,
    IconLock,
    IconBookmark,
    IconUpload,
    IconCode,
    IconFeatures,
    IconChevronDown,
    IconGlobe,
    IconBolt,
    IconPeople,
    IconActivity,
    IconDatabase,
    IconInfo,
    IconExternal,
    IconNewspaper,
    IconApps
} from '@posthog/icons'
import { AppWindow } from 'lucide-react'
import { useApp } from '../../context/App'
import MenuBar, { MenuItemType, MenuType } from 'components/RadixUI/MenuBar'
import { Settings } from 'lucide-react'
import OSButton from 'components/OSButton'
import AdminPanel from 'components/AdminPanel'
import Tooltip from 'components/RadixUI/Tooltip'
import KeyboardShortcut from 'components/KeyboardShortcut'
import PostsView from 'components/Posts'

export default function TaskBarMenu() {
    const {
        windows,
        openSearch,
        siteSettings,
        setIsActiveWindowsPanelOpen,
        taskbarRef,
        addWindow,
        isMobile
    } = useApp()

    const [isAnimating, setIsAnimating] = useState(false)
    const totalWindows = windows.length

    useEffect(() => {
        const handleWindowMinimized = () => {
            setIsAnimating(true)
        }

        const taskbar = document.querySelector('#taskbar')
        if (taskbar) {
            taskbar.addEventListener('windowMinimized', handleWindowMinimized as EventListener)
            return () => {
                taskbar.removeEventListener('windowMinimized', handleWindowMinimized as EventListener)
            }
        }
    }, [])

    useEffect(() => {
        if (isAnimating) {
            const timer = setTimeout(() => setIsAnimating(false), 500)
            return () => clearTimeout(timer)
        }
    }, [isAnimating])

    const handleActiveWindowsClick = () => {
        setIsActiveWindowsPanelOpen(true)
    }

    const menuData: any[] = [
        {
            trigger: (
                <div className="flex items-center gap-1.5 px-1">
                    <svg viewBox="0 0 32 32" className="size-5 fill-current">
                        <path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0zm-4.138 23.362l-2.012-2.012 2.012-2.013 2.013 2.013-2.013 2.012zm4.138-4.138l-2.013-2.012 2.013-2.013 2.012 2.013-2.012 2.012zm0-8.275l-2.013-2.013 2.013-2.012 2.012 2.012-2.012 2.013zm4.138 4.138l-2.013-2.013 2.012-2.012 2.013 2.012-2.012 2.013z" />
                    </svg>
                    <IconChevronDown className="size-3 opacity-50" />
                </div>
            ),
            items: [
                {
                    type: 'item',
                    label: 'About WorldInMaking',
                    onClick: () => addWindow({
                        key: 'about',
                        title: 'About WorldInMaking',
                        element: (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-accent text-primary p-10 text-center lowercase">
                                <h1 className="text-4xl font-black mb-4">under construction</h1>
                                <p className="text-lg opacity-60">this area is being updated.</p>
                            </div>
                        )
                    })
                },
                { type: 'separator' },
                ...(isMobile ? [
                    {
                        type: 'submenu',
                        label: 'Posts',
                        items: [
                            { type: 'item', label: 'All posts', onClick: () => addWindow({ key: 'posts-all', title: 'All Posts', path: '/posts' }) },
                            { type: 'item', label: 'Tutorials', onClick: () => addWindow({ key: 'tutorials', title: 'Tutorials', path: '/tutorials' }) },
                            { type: 'separator' },
                            { type: 'item', label: 'Newspaper', onClick: () => addWindow({ key: 'posts', title: 'Posts', element: <PostsView />, path: '/posts-newspaper' }) },
                        ]
                    },
                    {
                        type: 'submenu',
                        label: 'Community',
                        items: [
                            { type: 'item', label: 'Forums', onClick: () => addWindow({ key: 'questions', title: 'Questions', path: '/questions' }) },
                        ]
                    },
                    { type: 'separator' },
                ] : []),
                { type: 'item', label: 'Force restart', onClick: () => window.location.reload() },
            ]
        },
        {
            trigger: 'Posts',
            items: [
                { type: 'item', label: 'All posts', onClick: () => addWindow({ key: 'posts-all', title: 'All Posts', path: '/posts' }) },
                { type: 'item', label: 'Tutorials', onClick: () => addWindow({ key: 'tutorials', title: 'Tutorials', path: '/tutorials' }) },
                { type: 'separator' },
                { type: 'item', label: 'Newspaper', onClick: () => addWindow({ key: 'posts', title: 'Posts', element: <PostsView />, path: '/posts-newspaper' }) },
            ]
        },
        {
            trigger: 'Community',
            items: [
                { type: 'item', label: 'Forums', onClick: () => addWindow({ key: 'questions', title: 'Questions', path: '/questions' }) },
            ]
        }
    ]
    const accountMenu: MenuType[] = [
        {
            trigger: (
                <OSButton size="sm" className="px-1.5">
                    <div className="flex items-center gap-1">
                        <IconUser className="size-5" />
                        <IconChevronDown className="size-3 opacity-50" />
                    </div>
                </OSButton>
            ),
            items: [
                {
                    type: 'item',
                    label: 'Admin Dashboard',
                    icon: <Settings className="size-4" />,
                    onClick: () => addWindow({
                        key: 'admin-dashboard',
                        title: 'Admin Dashboard',
                        path: '/admin',
                        icon: <Settings className="size-4 text-purple-500" />,
                        element: <AdminPanel />,
                        width: 'w-full max-w-5xl h-[80vh]',
                    })
                },
                { type: 'separator' },
                { type: 'item', label: 'Sign in to community', onClick: () => { } },
                { type: 'separator' },
                { type: 'item', label: 'Go to app ↗', link: 'https://app.posthog.com', external: true }
            ]
        }
    ]

    return (
        <>
            <div
                ref={taskbarRef}
                id="taskbar"
                data-scheme="primary"
                className="w-full bg-accent/75 backdrop-blur border-b border-primary top-0 z-50 flex justify-between pl-0.5 pr-2 items-center"
            >
                <MenuBar
                    menus={menuData}
                    className="[&_button]:px-2.5 [&_button:not(:first-child)]:hidden md:[&_button:not(:first-child)]:flex"
                />
                <aside className="flex items-center gap-0 py-1">

                    <motion.div
                        className="flex items-center translate-y-[2px] -mr-1"
                        animate={
                            isAnimating
                                ? {
                                    scale: [1, 1.2, 1],
                                    rotate: [0, -5, 5, -5, 5, 0],
                                }
                                : {}
                        }
                        transition={{
                            duration: 0.5,
                            ease: 'easeInOut',
                            times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                        }}
                    >
                        <Tooltip
                            trigger={
                                <OSButton
                                    onClick={handleActiveWindowsClick}
                                    disabled={totalWindows <= 0}
                                    data-active-windows
                                    size="sm"
                                    className="!px-0.5 group/wm relative"
                                >
                                    <div className="flex items-center gap-1">
                                        <IconApps className="size-5 text-black transition-transform group-hover/wm:scale-110" />
                                        <div className="bg-primary/5 dark:bg-white/10 px-1.5 py-0.5 rounded border border-primary/20 text-[11px] font-bold min-w-[1.25rem] text-center shadow-inner !text-black">
                                            {totalWindows}
                                        </div>
                                    </div>
                                </OSButton>
                            }
                            delay={0}
                        >
                            <div className="max-w-48 text-center p-1">
                                {totalWindows <= 0 ? (
                                    <>
                                        <p className="text-sm font-bold mb-0.5">No active windows</p>
                                        <p className="text-[12px] opacity-70 mb-0 leading-tight">
                                            Open an app to see it here.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm font-bold mb-0.5">window manager</p>
                                        <p className="text-[12px] opacity-70 mb-0 leading-tight">
                                            Managing {totalWindows} open window{totalWindows > 1 ? 's' : ''}.
                                        </p>
                                    </>
                                )}
                            </div>
                        </Tooltip>
                    </motion.div>

                    <Tooltip
                        trigger={
                            <OSButton onClick={() => openSearch()} size="sm" className="px-1 translate-y-[2px]">
                                <IconSearch className="size-5 text-black" />
                            </OSButton>
                        }
                    >
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-sm mb-0 p-1">search</p>
                            <KeyboardShortcut text="/" size="sm" />
                        </div>
                    </Tooltip>

                    <MenuBar
                        menus={[
                            {
                                ...accountMenu[0],
                                trigger: (
                                    <OSButton size="sm" className="px-1">
                                        <IconUser className="size-5 text-black" />
                                        <IconChevronDown className="size-3 text-black -ml-[1px]" />
                                    </OSButton>
                                )
                            }
                        ]}
                        triggerAsChild={true}
                        className="!inline-flex items-center !py-0 !h-auto !gap-0"
                    />
                </aside>
            </div>
        </>
    )
}
