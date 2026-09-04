import React, { useCallback, useEffect, useState } from 'react'
import {
    IconSearch,
    IconUser,
    IconNotification,
    IconLock,
    IconBookmark,
    IconBadge,
    IconApps,
    IconGear,
    IconChat,
} from '@posthog/icons'
import { useApp, useAppActions } from '../../context/App'

import MenuBar, { MenuType } from 'components/RadixUI/MenuBar'

import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'
import { useUser } from 'hooks/useUser'
import getAvatarURL from 'components/Squeak/util/getAvatar'
import CloudinaryImage from 'components/CloudinaryImage'
import KeyboardShortcut from 'components/KeyboardShortcut'
import AmbientPlayer from 'components/AmbientPlayer'
import Link from 'components/Link'
import WimLogo from 'components/WimLogo'
import { MOTION_LAYER, TASKBAR_BG } from '../../constants/frostedSurfaces'

function TaskBarMenu() {
    const {
        openSearch,
        openSignIn,
        setIsNotificationsPanelOpen,
        taskbarRef,
    } = useAppActions()
    const {
        windows,
        isActiveWindowsPanelOpen,
        setIsActiveWindowsPanelOpen,
    } = useApp()
    const totalWindows = windows.length
    const [isAnimating, setIsAnimating] = useState(false)

    const { user, notifications, logout, isModerator } = useUser()

    const isLoggedIn = !!user

    useEffect(() => {
        if (isAnimating) {
            const timer = setTimeout(() => setIsAnimating(false), 500)
            return () => clearTimeout(timer)
        }
    }, [isAnimating])

    useEffect(() => {
        const handleWindowMinimized = () => {
            setIsAnimating(true)
        }

        const taskbar = document.querySelector('#taskbar')
        if (taskbar) {
            taskbar.addEventListener('windowMinimized', handleWindowMinimized)
            return () => {
                taskbar.removeEventListener('windowMinimized', handleWindowMinimized)
            }
        }
    }, [])

    const handleTaskbarRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (taskbarRef) {
                const ref = taskbarRef as React.MutableRefObject<HTMLDivElement | null>
                ref.current = node
            }
        },
        [taskbarRef]
    )

    const handleSignInClick = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
        openSignIn()
    }

    const avatarURL = getAvatarURL(user?.profile)

    const accountMenu: MenuType[] = [
        {
            trigger: (
                <>
                    {isLoggedIn ? (
                        <div className="relative flex items-center gap-1.5">
                            {avatarURL ? (
                                <CloudinaryImage
                                    src={avatarURL}
                                    imgClassName={`size-6 rounded-full overflow-hidden bg-${
                                        user?.profile?.color ?? 'white dark:bg-dark'
                                    }`}
                                    width={48}
                                    alt=""
                                />
                            ) : (
                                <IconUser className="size-6" />
                            )}
                            {notifications?.length > 0 && (
                                <span className="absolute top-4 -right-1 size-2.5 bg-red border border-bg-primary rounded-full" />
                            )}
                        </div>
                    ) : (
                        <IconUser className="size-6" />
                    )}
                </>
            ),
            items: user
                ? [
                      {
                          type: 'item' as const,
                          label: 'Profile',
                          link: user?.username ? `/profile/${encodeURIComponent(user.username)}` : '/profile',
                          icon: <IconUser className="opacity-50 group-hover/item:opacity-75 size-4" />,
                      },
                      {
                          type: 'item' as const,
                          label: `Notifications${notifications?.length > 0 ? ` (${notifications.length})` : ''}`,
                          onClick: () => setIsNotificationsPanelOpen(true),
                          icon: <IconNotification className="opacity-50 group-hover/item:opacity-75 size-4" />,
                      },
                      {
                          type: 'item' as const,
                          label: 'Bookmarks',
                          link: '/bookmarks',
                          icon: <IconBookmark className="opacity-50 group-hover/item:opacity-75 size-4" />,
                      },
                      {
                          type: 'item' as const,
                          label: 'WIM AI',
                          link: '/workspace-chat',
                          icon: <IconChat className="opacity-50 group-hover/item:opacity-75 size-4" />,
                      },
                      ...(isModerator
                          ? [
                                {
                                    type: 'item' as const,
                                    label: 'Admin',
                                    link: '/admin',
                                    icon: <IconBadge className="opacity-75 text-yellow size-4" />,
                                },
                            ]
                          : []),
                      { type: 'separator' as const },
                      {
                          type: 'item' as const,
                          label: 'Account',
                          link: '/account',
                          icon: <IconGear className="opacity-50 group-hover/item:opacity-75 size-4" />,
                      },
                      {
                          type: 'item' as const,
                          label: 'Sign out',
                          onClick: () => logout(),
                          icon: <IconLock className="opacity-50 group-hover/item:opacity-75 size-4" />,
                      },
                  ]
                : [
                      {
                          type: 'item' as const,
                          label: 'Sign in',
                          onClick: handleSignInClick,
                          icon: <IconUser className="opacity-50 group-hover/item:opacity-75 size-4" />,
                      },
                  ],
        },
    ]

    return (
        <>
            <div className="z-50">
                <div
                    ref={handleTaskbarRef}
                    id="taskbar"
                    data-scheme="primary"
                    data-menu-container
                    style={{
                        transformOrigin: '50% 50%',
                        transformStyle: 'preserve-3d',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}
                    className={`${TASKBAR_BG} ${
                        isAnimating ? MOTION_LAYER : ''
                    } skin-classic:bg-accent border border-primary rounded pl-0.5 pr-2 shadow-2xl`}
                >
                    <div
                        aria-hidden="true"
                        className="absolute top-0 left-0 right-0 bg-accent pointer-events-none"
                        style={{
                            height: '20px',
                            transform: 'rotateX(-90deg)',
                            transformOrigin: '50% 0%',
                        }}
                    />
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 right-0 bg-accent pointer-events-none"
                        style={{
                            height: '20px',
                            transform: 'rotateX(90deg)',
                            transformOrigin: '50% 100%',
                        }}
                    />
                    <div className="mx-auto transition-all duration-300 flex justify-between items-center w-full max-w-full">
                        <div className="flex items-center pl-1.5 py-0.5">
                            <Link
                                href="/"
                                className="flex items-center p-1.5 rounded hover:bg-primary/10 transition-colors"
                                aria-label="worldinmaking home"
                            >
                                <WimLogo className="size-6 transition-transform hover:scale-105" />
                            </Link>
                        </div>
                        <aside data-scheme="secondary" className="flex items-center gap-0.5 py-1">
                            <AmbientPlayer />

                            <Tooltip
                                trigger={
                                    <OSButton onClick={() => openSearch()} size="sm" className="relative top-px transition-transform duration-150 active:scale-[0.93] hover:scale-[1.05]">
                                        <IconSearch className="size-5" />
                                    </OSButton>
                                }
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-sm mb-0">Search</p>
                                    <KeyboardShortcut text="/" size="sm" />
                                </div>
                            </Tooltip>

                            <Tooltip
                                trigger={
                                    <OSButton
                                        onClick={() => setIsActiveWindowsPanelOpen(!isActiveWindowsPanelOpen)}
                                        disabled={totalWindows <= 0}
                                        size="sm"
                                        className="relative top-px !px-1.5 flex items-center gap-1.5 transition-transform duration-150 active:scale-[0.93] hover:scale-[1.05]"
                                        aria-label={`Active windows (${totalWindows})`}
                                    >
                                        <IconApps className="size-5" />
                                        {totalWindows > 0 && (
                                            <span suppressHydrationWarning className="bg-primary/10 text-primary px-1.5 py-0.2 rounded text-[11px] font-bold min-w-[1.25rem] text-center border border-primary/20 shadow-2xs">
                                                {totalWindows}
                                            </span>
                                        )}
                                    </OSButton>
                                }
                            >
                                <div className="flex flex-col items-center gap-1 text-center p-0.5">
                                    <p suppressHydrationWarning className="text-sm font-semibold mb-0">Active Windows ({totalWindows})</p>
                                    <span suppressHydrationWarning className="text-xs text-secondary leading-tight">
                                        {totalWindows === 0 ? 'No open windows' : 'List and arrange open windows'}
                                    </span>
                                </div>
                            </Tooltip>

                            <MenuBar menus={accountMenu} className="[&_button]:px-2" />
                        </aside>
                    </div>
                </div>
            </div>
        </>
    )
}

export default React.memo(TaskBarMenu)
