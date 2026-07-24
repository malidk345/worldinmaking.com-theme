import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Logo } from '@posthog/brand/logo'
import {
    IconSearch,
    IconChatHelp,
    IconUser,
    IconApp,
    IconMessage,
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
} from '@posthog/icons'
import { useAppActions, useAppSettings } from '../../context/App'

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
import { MOTION_LAYER, TASKBAR_BG } from '../../constants/frostedSurfaces'

function TaskBarMenu() {
    const {
        openSearch,
        openSignIn,
        openNewChat,
        setIsNotificationsPanelOpen,
        setIsActiveWindowsPanelOpen,
        addWindow,
        taskbarRef,
        updateTaskbarHeight,
    } = useAppActions()
    const { posthogInstance } = useAppSettings()
    const [isAnimating, setIsAnimating] = useState(false)

    const { user, notifications, logout, isModerator } = useUser()
    const menuData = useMenuData()

    const isLoggedIn = !!user

    useEffect(() => {
        // Reset animation state after it completes
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

    const handleActiveWindowsClick = () => {
        setIsActiveWindowsPanelOpen(true)
    }

    const handleSignInClick = () => {
        // Close the menu by blurring the active element
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
                        <>
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
                        </>
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
                          ...(user?.profile
                              ? [
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
                                        link: `/community/profiles/${user?.profile.id}`,
                                        icon: <IconUser className="opacity-50 group-hover/item:opacity-75 size-4" />,
                                    },
                                    {
                                        type: 'item' as const,
                                        label: 'Bookmarks',
                                        link: '/bookmarks',
                                        icon: <IconBookmark className="opacity-50 group-hover/item:opacity-75 size-4" />,
                                    },
                                ]
                              : []),
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

                // Integrated PostHog Header Menus into Person Icon Menu
                ...menuData.flatMap((menuSection, idx) => {
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
                    if (idx < menuData.length - 1) {
                        sectionItems.push({ type: 'separator' as const })
                    }
                    return sectionItems
                }),

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
                    } skin-classic:bg-accent wallpaper-keyboard-garden:dark:bg-black/15 border-secondary rounded pl-0.5 pr-2 shadow-2xl`}
                >
                    {/* Top and bottom edges of the 3D box — visible during rotation */}
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
                        <div className="flex items-center pl-2" />
                        <aside data-scheme="secondary" className="flex items-center gap-0.5 py-1">
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
                                        onClick={() => openNewChat({ path: `ask-max` })}
                                        size="sm"
                                        className="relative top-px"
                                    >
                                        <IconChatHelp className="size-5" />
                                    </OSButton>
                                }
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-sm mb-0">Ask Max</p>
                                    <div className="flex items-center gap-1">
                                        <KeyboardShortcut text="Shift" size="sm" />
                                        <KeyboardShortcut text="?" size="sm" />
                                    </div>
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

// Memoized so it survives Wrapper re-renders (e.g. the navigate() on window
// open/close); it still updates when it reads changed context.
export default React.memo(TaskBarMenu)
