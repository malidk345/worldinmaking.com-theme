import React, { useCallback, useEffect, useState } from 'react'
import {
    IconSearch,
    IconUser,
    IconNotification,
    IconLock,
    IconBookmark,
    IconUpload,
    IconCode,
    IconFeatures,
    IconPlay,
    IconPencil,
    IconPeople,
    IconPinFilled,
    IconBadge,
    IconApps,
} from '@posthog/icons'
import { useApp, useAppActions } from '../../context/App'

import MenuBar, { MenuType } from 'components/RadixUI/MenuBar'
import ActiveWindowsPanel from 'components/ActiveWindowsPanel'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'
import { useUser } from 'hooks/useUser'
import getAvatarURL from 'components/Squeak/util/getAvatar'
import { useMenuData } from './menuData'
import CloudinaryImage from 'components/CloudinaryImage'
import MediaUploadModal from 'components/MediaUploadModal'
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
        addWindow,
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
    const menuData = useMenuData()

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

    // Format site navigation menus for inclusion inside the Person Icon dropdown
    const mainNavSections = menuData.slice(1).flatMap((menuSection, idx) => {
        const sectionItems: any[] = []
        if (typeof menuSection.trigger === 'string') {
            sectionItems.push({
                type: 'item' as const,
                label: menuSection.trigger,
                disabled: true,
            })
        }
        if (Array.isArray(menuSection.items)) {
            sectionItems.push(...menuSection.items)
        }
        if (idx < menuData.length - 2) {
            sectionItems.push({ type: 'separator' as const })
        }
        return sectionItems
    })

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
            items: [
                ...(user
                    ? [
                          {
                              type: 'item' as const,
                              label: 'User Account',
                              disabled: true,
                          },
                          {
                              type: 'item' as const,
                              label: `Notifications${
                                  notifications?.length > 0 ? ` (${notifications.length})` : ''
                              }`,
                              onClick: () => setIsNotificationsPanelOpen(true),
                              icon: (
                                  <IconNotification className="opacity-50 group-hover/item:opacity-75 size-4" />
                              ),
                          },
                          {
                              type: 'item' as const,
                              label: 'My profile',
                              link: user?.username ? `/profile/${encodeURIComponent(user.username)}` : '/profile',
                              icon: <IconUser className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                          ...(isModerator
                              ? [
                                    {
                                        type: 'item' as const,
                                        label: 'Admin OS Dashboard',
                                        link: '/admin',
                                        icon: <IconBadge className="opacity-75 text-yellow size-4" />,
                                    },
                                ]
                              : []),
                          {
                              type: 'item' as const,
                              label: 'Bookmarks',
                              link: '/bookmarks',
                              icon: <IconBookmark className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                          {
                              type: 'separator' as const,
                          },
                      ]
                    : [
                          {
                              type: 'item' as const,
                              label: 'Account',
                              disabled: true,
                          },
                          {
                              type: 'item' as const,
                              label: 'Sign in to the community',
                              onClick: handleSignInClick,
                              icon: <IconUser className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                          {
                              type: 'separator' as const,
                          },
                      ]),

                // All site navigation menus (Community, Company, Resources, etc.) placed inside Person Icon
                ...mainNavSections,

                ...(isModerator
                    ? [
                          {
                              type: 'separator' as const,
                          },
                          {
                              type: 'item' as const,
                              label: 'Moderator tools',
                              disabled: true,
                          },
                          {
                              type: 'item' as const,
                              label: 'Upload media',
                              icon: <IconUpload className="opacity-50 group-hover/item:opacity-75 size-4" />,
                              onClick: () =>
                                  addWindow(
                                      <MediaUploadModal
                                          newWindow
                                          location={{ pathname: `media-upload` }}
                                          key={`media-upload`}
                                      />
                                  ),
                          },
                          {
                              type: 'item' as const,
                              label: 'Components',
                              link: '/components',
                              icon: <IconCode className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                          {
                              type: 'item' as const,
                              label: 'Art library',
                              link: '/art-library',
                              icon: <IconPencil className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                          {
                              type: 'item' as const,
                              label: 'Feature matrix',
                              link: '/feature-matrix',
                              icon: <IconFeatures className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                          {
                              type: 'item' as const,
                              label: 'Team directory',
                              link: '/team-directory',
                              icon: <IconPeople className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                          {
                              type: 'item' as const,
                              label: 'Community directory',
                              link: '/community/directory',
                              icon: <IconBadge className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                          {
                              type: 'item' as const,
                              label: 'HogWatch 3000',
                              link: '/hogwatch',
                              icon: <IconPlay className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                          {
                              type: 'item' as const,
                              label: 'Image annotation',
                              link: '/image-annotator',
                              icon: <IconPinFilled className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                      ]
                    : []),
                ...(user
                    ? [
                          {
                              type: 'separator' as const,
                          },
                          {
                              type: 'item' as const,
                              label: 'Community logout',
                              onClick: () => logout(),
                              icon: <IconLock className="opacity-50 group-hover/item:opacity-75 size-4" />,
                          },
                      ]
                    : []),
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
                                <WimLogo className="size-5 text-primary transition-transform hover:scale-105" />
                            </Link>
                        </div>
                        <aside data-scheme="secondary" className="flex items-center gap-0.5 py-1">
                            <AmbientPlayer />

                            <Tooltip
                                trigger={
                                    <OSButton onClick={() => openSearch()} size="sm" className="relative top-px">
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
                                        className="relative top-px !px-1.5 flex items-center gap-1.5"
                                        aria-label={`Active windows (${totalWindows})`}
                                    >
                                        <IconApps className="size-5" />
                                        {totalWindows > 0 && (
                                            <span suppressHydrationWarning className="bg-primary/10 text-primary px-1.5 py-0.2 rounded text-[11px] font-bold min-w-[1.25rem] text-center border border-primary/20">
                                                {totalWindows}
                                            </span>
                                        )}
                                    </OSButton>
                                }
                            >
                                <div className="flex flex-col items-center gap-1 text-center p-0.5">
                                    <p suppressHydrationWarning className="text-sm font-semibold mb-0">Active Windows ({totalWindows})</p>
                                    <span suppressHydrationWarning className="text-xs text-secondary leading-tight">
                                        {totalWindows === 0 ? 'No open windows' : 'Toggle Mission Control grid'}
                                    </span>
                                </div>
                            </Tooltip>

                            <MenuBar menus={accountMenu} className="[&_button]:px-2" />
                        </aside>
                    </div>
                </div>
            </div>
            <ActiveWindowsPanel />
        </>
    )
}

export default React.memo(TaskBarMenu)
