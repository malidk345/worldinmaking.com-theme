"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    IconSearch,
    IconUser,
    IconChevronDown,
    IconBolt,
    IconApps,
    IconGlobe
} from '@posthog/icons'
import { Settings, Info, FileText, BookOpen, Newspaper, MessageSquare, RotateCw, LogOut, LogIn } from 'lucide-react'
import { useApp } from '../../context/App'
import { useAuth } from '../../context/AuthContext'
import MenuBar, { MenuItemType } from 'components/RadixUI/MenuBar'
import OSButton from 'components/OSButton'
import AdminPanel from 'components/AdminPanel'
import LoginContent from 'components/Login/LoginContent'
import Tooltip from 'components/RadixUI/Tooltip'
import KeyboardShortcut from 'components/KeyboardShortcut'
import PostsView from 'components/Posts'
import SystemSettings from 'components/Home/SystemSettings'
import ScrollArea from 'components/RadixUI/ScrollArea'
import Marginalia from 'components/Ideas/Marginalia'
import CuratedDossiers from 'components/Ideas/CuratedDossiers'
import AtmosphericStations from 'components/Ideas/AtmosphericStations'
import EphemeralTransmissions from 'components/Ideas/EphemeralTransmissions'
import AmbientPlayer from 'components/AmbientPlayer'
import NotificationCenter from 'components/NotificationCenter'
import { useTranslation } from 'hooks/useTranslation'
import { LanguageSelector } from 'components/OSChrome/LanguageSelector'

export default function TaskBarMenu() {
    const {
        windows,
        openSearch,
        setIsActiveWindowsPanelOpen,
        taskbarRef,
        addWindow
    } = useApp()
    const { user, profile, isAdmin, signOut, updateProfile } = useAuth()
    const { t, lang } = useTranslation()

    const [isAnimating, setIsAnimating] = useState(false)
    const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false)
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

    const accountMenuItems: MenuItemType[] = React.useMemo(() => [
        // User/Profile section
        ...(user ? [
            {
                type: 'item' as const,
                node: (
                    <div className="text-[10px] uppercase font-black opacity-40 px-3 py-1 tracked-widest select-none">
                        {t('menu.signed_in_as')} {profile?.username || user.email}
                    </div>
                ),
                disabled: true
            },
            {
                type: 'item' as const,
                label: t('menu.profile'),
                icon: <IconUser className="size-4 opacity-70" />,
                onClick: () => profile?.username && addWindow({
                    key: `profile-${profile.username}`,
                    path: `/profile/${profile.username}`,
                    title: t('menu.profile'),
                    size: { width: 900, height: 680 },
                })
            },
            { type: 'separator' as const }
        ] : []),

        // Main app items
        {
            type: 'item' as const,
            label: t('menu.about_title'),
            icon: <Info className="size-4 opacity-70" />,
            onClick: () => addWindow({
                key: 'about',
                title: t('menu.about_title'),
                path: '/about',
                element: (
                    <div className="w-full h-full bg-accent text-primary p-6 md:p-10 overflow-hidden flex flex-col font-mono">
                        <ScrollArea>
                            <div className="max-w-2xl mx-auto lowercase leading-relaxed space-y-6 text-[13px] md:text-sm">
                                <div className="mb-12">
                                    <p className="font-bold text-lg">{t('menu.about_h1')}</p>
                                </div>
                                <p>{t('menu.about_p1')}</p>
                                <p>{t('menu.about_p2')}</p>
                                <p>{t('menu.about_p3')}</p>
                                <p>{t('menu.about_p4')}</p>
                                <p>{t('menu.about_p5')}</p>
                                <div>
                                    <p>{t('menu.about_p6')}</p>
                                    <p>{t('menu.about_p7')}</p>
                                </div>
                                <p>{t('menu.about_p8')}</p>
                                <p>{t('menu.about_p9')}</p>
                                <div className="pt-8 border-t border-primary/10">
                                    <p>{t('menu.about_author')}</p>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                )
            })
        },
        { type: 'separator' as const },

        // Posts
        {
            type: 'submenu' as const,
            label: t('posts.title'),
            icon: <FileText className="size-4 opacity-70" />,
            items: [
                { type: 'item' as const, label: t('menu.all_posts'), icon: <FileText className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'posts-all', title: t('menu.all_posts'), path: '/posts' }) },
                { type: 'item' as const, label: t('menu.blueprints'), icon: <BookOpen className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'blueprints', title: t('menu.blueprints'), path: '/blueprints' }) },
                { type: 'separator' as const },
                { type: 'item' as const, label: t('menu.newspaper'), icon: <Newspaper className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'posts', title: t('menu.newspaper'), element: <PostsView />, path: '/posts-newspaper' }) },
            ]
        },

        // Community
        {
            type: 'submenu' as const,
            label: t('menu.community'),
            icon: <MessageSquare className="size-4 opacity-70" />,
            items: [
                { type: 'item' as const, label: t('menu.forums'), icon: <MessageSquare className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'questions', title: 'Questions', path: '/questions' }) },
            ]
        },

        {
            type: 'submenu' as const,
            label: t('menu.ideas'),
            icon: <BookOpen className="size-4 opacity-70" />,
            items: [
                { type: 'item' as const, label: t('menu.marginalia'), icon: <BookOpen className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'marginalia', path: '/ideas/marginalia', title: 'Marginalia Archive', element: <Marginalia /> }) },
                { type: 'item' as const, label: t('menu.dossiers'), icon: <FileText className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'dossiers', path: '/ideas/dossiers', title: 'Curated Dossiers', element: <CuratedDossiers /> }) },
                { type: 'item' as const, label: t('menu.stations'), icon: <Settings className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'stations', path: '/ideas/stations', title: 'Atmospheric Stations', element: <AtmosphericStations /> }) },
                { type: 'item' as const, label: t('menu.transmissions'), icon: <MessageSquare className="size-4 opacity-70" />, onClick: () => addWindow({ key: 'transmissions', path: '/ideas/transmissions', title: 'Ephemeral Transmissions', element: <EphemeralTransmissions /> }) },
            ]
        },

        { type: 'separator' as const },

        // System items
        {
            type: 'item' as const,
            label: t('menu.system_settings'),
            icon: <Settings className="size-4 opacity-70" />,
            onClick: () => addWindow({
                key: 'system-settings',
                title: t('menu.system_settings'),
                icon: <Settings className="size-4" />,
                path: '/settings',
                element: <SystemSettings />,
                size: { width: 680, height: 520 }
            })
        },
        { type: 'item' as const, label: t('menu.force_restart'), icon: <RotateCw className="size-4 opacity-70" />, onClick: () => window.location.reload() },

        // Admin
        ...(isAdmin ? [
            { type: 'separator' as const },
            {
                type: 'item' as const,
                label: t('menu.admin_dashboard'),
                icon: <IconBolt className="size-4 text-purple-500" />,
                onClick: () => addWindow({
                    key: 'admin-dashboard',
                    title: t('menu.admin_dashboard'),
                    path: '/admin',
                    icon: <Settings className="size-4 text-purple-500" />,
                    element: <AdminPanel />,
                    size: { width: 1100, height: 750 }
                })
            }
        ] : []),

        { type: 'separator' as const },
        {
            type: 'item' as const,
            label: t('profile.language'),
            icon: <IconGlobe className="size-4 opacity-70" />,
            onClick: () => setLanguageSelectorOpen(true)
        },
        { type: 'separator' as const },

        // Auth
        ...(user ? [
            {
                type: 'item' as const,
                label: t('menu.sign_out'),
                icon: <LogOut className="size-4 opacity-70" />,
                onClick: () => signOut()
            }
        ] : [
            {
                type: 'item' as const,
                label: t('menu.sign_in'),
                icon: <LogIn className="size-4 opacity-70" />,
                onClick: () => addWindow({
                    key: 'login',
                    path: '/login',
                    title: t('menu.member_access'),
                    size: { width: 450, height: 450 },
                    element: <LoginContent />
                })
            }
        ])
    ], [user, profile, isAdmin, addWindow, signOut, t])

    const accountMenu = React.useMemo(() => [
        {
            trigger: (
                <OSButton size="sm" variant="ghost" className="px-1 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                        {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={profile.avatar_url}
                                alt={profile.username || 'User'}
                                className="size-5 rounded-full object-cover border border-black/10 transition-transform group-hover:scale-110"
                            />
                        ) : (
                            <IconUser className="size-5 text-black dark:text-white" />
                        )}
                        <IconChevronDown className="size-3 text-black dark:text-white opacity-30" />
                    </div>
                </OSButton>
            ),
            items: accountMenuItems
        }
    ], [profile, accountMenuItems])

    return (
        <>
            <LanguageSelector
                visible={languageSelectorOpen}
                onClose={() => setLanguageSelectorOpen(false)}
                currentLanguage={lang}
                positionClass="fixed top-[42px] right-2 z-[10002]"
                onLanguageChange={(code) => {
                    if (user && profile) {
                        updateProfile({ preferred_language: code })
                    } else {
                        if (typeof window !== 'undefined') {
                            localStorage.setItem('preferred_language', code)
                            window.location.reload()
                        }
                    }
                }}
            />
            <div
                ref={taskbarRef}
                id="taskbar"
                data-scheme="primary"
                className="w-full bg-white/70 dark:bg-black/70 supports-[backdrop-filter]:backdrop-blur-[60px] border-b border-black/5 dark:border-white/10 shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.2)] top-0 z-[9999] flex justify-between px-3 py-1 items-center transition-colors duration-300 relative"
            >
                <div className="flex items-center gap-2 px-1 py-1 pointer-events-none">
                    <svg viewBox="0 0 32 32" className="size-5 fill-current text-black dark:text-white">
                        <path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0zm-4.138 23.362l-2.012-2.012 2.012-2.013 2.013 2.013-2.012 2.012zm4.138-4.138l-2.013-2.012 2.013-2.013 2.012 2.013-2.012 2.012zm0-8.275l-2.013-2.013 2.013-2.012 2.012 2.012-2.012 2.013zm4.138 4.138l-2.013-2.013 2.012-2.012 2.013 2.012-2.012 2.013z" />
                    </svg>
                </div>
                <aside className="flex items-center gap-1.5 py-1">

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
                                    variant="ghost"
                                    className="!px-1.5 group/wm relative"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <IconApps className="size-5 text-black dark:text-white transition-transform group-hover/wm:scale-110" />
                                        <div className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full border border-black/5 dark:border-white/10 text-[11px] font-bold min-w-[1.25rem] text-center shadow-sm !text-black dark:!text-white">
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
                                        <p className="text-sm font-bold mb-0.5">{t('wm.no_windows')}</p>
                                        <p className="text-[12px] opacity-70 mb-0 leading-tight">
                                            {t('wm.open_app')}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm font-bold mb-0.5">{t('wm.title')}</p>
                                        <p className="text-[12px] opacity-70 mb-0 leading-tight">
                                            {t('wm.managing')} {totalWindows} {totalWindows > 1 ? t('wm.open_windows') : t('wm.open_window')}
                                        </p>
                                    </>
                                )}
                            </div>
                        </Tooltip>
                    </motion.div>

                    <Tooltip
                        trigger={
                            <OSButton onClick={() => openSearch()} size="sm" variant="ghost" className="px-2 translate-y-[2px]">
                                <IconSearch className="size-5 text-black dark:text-white" />
                            </OSButton>
                        }
                    >
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-sm mb-0 p-1">{t('search.tooltip')}</p>
                            <KeyboardShortcut text="/" size="sm" />
                        </div>
                    </Tooltip>

                    <AmbientPlayer />

                    <NotificationCenter />

                    <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-1" />
                    
                    <MenuBar
                        menus={accountMenu}
                        triggerAsChild={true}
                        className="!inline-flex items-center !py-0 !h-auto !gap-0"
                    />
                </aside>
            </div>
        </>
    )
}
