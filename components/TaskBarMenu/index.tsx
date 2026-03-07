"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    IconSearch,
    IconUser,
    IconChevronDown,
    IconBolt,
    IconApps
} from '@posthog/icons'
import { Settings, Info, FileText, BookOpen, Newspaper, MessageSquare, RotateCw, LogOut, LogIn } from 'lucide-react'
import { useApp } from '../../context/App'
import { useAuth } from '../../context/AuthContext'
import MenuBar, { MenuItemType, MenuType } from 'components/RadixUI/MenuBar'
import OSButton from 'components/OSButton'
import AdminPanel from 'components/AdminPanel'
import LoginContent from 'components/Login/LoginContent'
import CorpusView from 'components/Corpus'
import Tooltip from 'components/RadixUI/Tooltip'
import KeyboardShortcut from 'components/KeyboardShortcut'
import PostsView from 'components/Posts'
import SystemSettings from 'components/Home/SystemSettings'
import ScrollArea from 'components/RadixUI/ScrollArea'

export default function TaskBarMenu() {
    const {
        windows,
        openSearch,
        setIsActiveWindowsPanelOpen,
        taskbarRef,
        addWindow,
        isMobile
    } = useApp()
    const { user, profile, isAdmin, signOut } = useAuth()

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

    const handleActiveWindowsClick = React.useCallback(() => {
        setIsActiveWindowsPanelOpen(true)
    }, [setIsActiveWindowsPanelOpen])

    const menuData: MenuType[] = React.useMemo(() => [
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
                    type: 'item' as const,
                    label: 'About WorldInMaking',
                    icon: <Info className="size-4 opacity-70" />,
                    onClick: () => addWindow({
                        key: 'about',
                        title: 'About WorldInMaking',
                        path: '/about',
                        element: (
                            <div className="w-full h-full bg-accent text-primary p-6 md:p-10 overflow-hidden flex flex-col font-mono">
                                <ScrollArea>
                                    <div className="max-w-2xl mx-auto lowercase leading-relaxed space-y-6 text-[13px] md:text-sm">
                                        <div className="mb-12">
                                            <p className="font-bold text-lg">i am mustafa ali.</p>
                                        </div>

                                        <p>
                                            worldinmaking (wim) began from a simple but unsettling intuition: the world is not something we merely inhabit — it is something continuously being formed.
                                        </p>

                                        <p>
                                            what appears stable is often the result of repetition. what feels natural is usually constructed. institutions harden over time and begin to look inevitable. moral language disguises power. economic systems present themselves as neutral mechanisms. even desire carries the marks of history.
                                        </p>

                                        <p>
                                            this project exists in that unstable space where certainty starts to fracture.
                                        </p>

                                        <p>
                                            worldinmaking (wim) is an independent writing and research platform where ideas are not treated as finished monuments but as living structures — open to interrogation, reinterpretation, and reconstruction. rather than offering definitive answers, it lingers with tension. it questions what presents itself as obvious. it returns to inherited concepts not to preserve them, but to test their foundations.
                                        </p>

                                        <p>
                                            the sacred, the ethical, the political, the psychological — none are approached as fixed domains. they intersect. they shape one another. they produce the world we move through every day without noticing its architecture.
                                        </p>

                                        <div>
                                            <p>to think is not a passive act. thought participates in construction.</p>
                                            <p>to question is already to intervene.</p>
                                        </div>

                                        <p>
                                            worldinmaking (wim) is an ongoing attempt to remain intellectually restless — to resist comfort, to slow down judgment, and to take ideas seriously in a time that prefers immediacy.
                                        </p>

                                        <p>
                                            if the world is still in formation, then responsibility begins with attention.
                                        </p>

                                        <div className="pt-8 border-t border-primary/10">
                                            <p>— mustafa ali</p>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        )
                    })
                },
                ...(isAdmin ? [
                    { type: 'separator' as const },
                    {
                        type: 'item' as const,
                        label: 'Admin Dashboard',
                        icon: <IconBolt className="size-4 text-purple-500" />,
                        onClick: () => addWindow({
                            key: 'admin-dashboard',
                            title: 'Admin Dashboard',
                            path: '/admin',
                            icon: <Settings className="size-4 text-purple-500" />,
                            element: <AdminPanel />,
                            size: { width: 1100, height: 750 }
                        })
                    }
                ] : []),
                { type: 'separator' as const },
                ...(isMobile ? [
                    {
                        type: 'submenu' as const,
                        label: 'Posts',
                        items: [
                            { type: 'item' as const, label: 'All posts', icon: <FileText className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'posts-all', title: 'All Posts', path: '/posts' }) },
                            { type: 'item' as const, label: 'Blueprints', icon: <BookOpen className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'blueprints', title: 'Blueprints', path: '/blueprints' }) },
                            { type: 'separator' as const },
                            { type: 'item' as const, label: 'Newspaper', icon: <Newspaper className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'posts', title: 'Posts', element: <PostsView />, path: '/posts-newspaper' }) },
                        ]
                    },
                    {
                        type: 'submenu' as const,
                        label: 'Community',
                        items: [
                            { type: 'item' as const, label: 'Forums', icon: <MessageSquare className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'questions', title: 'Questions', path: '/questions' }) },
                        ]
                    },
                    { type: 'separator' as const },
                ] : []),
                { type: 'item' as const, label: 'Force restart', icon: <RotateCw className="size-4 opacity-70" />, onClick: () => window.location.reload() },
                { type: 'separator' as const },
                {
                    type: 'item' as const,
                    label: 'System Settings',
                    icon: <Settings className="size-4 opacity-70" />,
                    onClick: () => addWindow({
                        key: 'system-settings',
                        title: 'System Settings',
                        icon: <Settings className="size-4" />,
                        path: '/settings',
                        element: <SystemSettings />,
                        size: { width: 680, height: 520 }
                    })
                },
            ]
        },
        {
            trigger: 'Posts',
            items: [
                { type: 'item' as const, label: 'All posts', icon: <FileText className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'posts-all', title: 'All Posts', path: '/posts' }) },
                { type: 'item' as const, label: 'Blueprints', icon: <BookOpen className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'blueprints', title: 'Blueprints', path: '/blueprints' }) },
                { type: 'separator' as const },
                { type: 'item' as const, label: 'Newspaper', icon: <Newspaper className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'posts', title: 'Posts', element: <PostsView />, path: '/posts-newspaper' }) },
            ]
        },
        {
            trigger: 'Community',
            items: [
                { type: 'item' as const, label: 'Forums', icon: <MessageSquare className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'questions', title: 'Questions', path: '/questions' }) },
            ]
        }
    ], [isAdmin, isMobile, addWindow])

    const accountMenuItems: MenuItemType[] = user ? [
        ...(isAdmin ? [
            {
                type: 'item' as const,
                label: 'Admin Dashboard',
                onClick: () => addWindow({
                    key: 'admin-dashboard',
                    title: 'Admin Dashboard',
                    path: '/admin',
                    icon: <Settings className="size-4 text-purple-500" />,
                    element: <AdminPanel />,
                    size: { width: 1100, height: 750 }
                })
            }
        ] : []),
        {
            type: 'item' as const,
            label: 'My corpus',
            icon: <IconUser className="size-4 opacity-70" />,
            onClick: () => profile?.username && addWindow({
                key: `corpus-${profile.username}`,
                path: `/u/${profile.username}`,
                title: `${profile.username}'s corpus`,
                size: { width: 900, height: 680 },
                element: <CorpusView username={profile.username} />
            })
        },
        {
            type: 'item' as const,
            label: 'Sign out',
            icon: <LogOut className="size-4 opacity-70" />,
            onClick: () => signOut()
        }
    ] : [
        {
            type: 'item' as const,
            label: 'Sign in',
            icon: <LogIn className="size-4 opacity-70" />,
            onClick: () => addWindow({
                key: 'login',
                path: '/login',
                title: 'Member Access',
                size: { width: 450, height: 450 },
                element: <LoginContent />
            })
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
            items: accountMenuItems
        }
    ]

    return (
        <>
            <div
                ref={taskbarRef}
                id="taskbar"
                data-scheme="primary"
                className="w-full bg-accent/90 backdrop-blur-md border-b border-primary top-0 z-[9999] flex justify-between pl-0.5 pr-2 items-center"
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
                            trigger={React.useMemo(() => (
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
                            ), [totalWindows, handleActiveWindowsClick])}
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
