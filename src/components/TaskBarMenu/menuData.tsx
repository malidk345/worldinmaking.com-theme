"use client"
import { MenuType, MenuItemType } from 'components/RadixUI/MenuBar'
import React from 'react'
import * as Icons from '@posthog/icons'
import { Logo } from '@posthog/brand/logo'
import {
    IconXNotTwitter,
    IconSubstack,
    IconYouTube,
    IconLinkedIn,
    IconGithub,
    IconInstagram,
} from 'components/OSIcons'
import { useAppSettings } from '../../context/App'
import { useRouter } from 'next/router'

export function useMenuSelectOptions() {
    return useMenuData()
}

export function useMenuData(): MenuType[] {
    const { isMobile } = useAppSettings()
    const router = useRouter()

    const mainNavItems: MenuType[] = [
        {
            trigger: 'Community',
            items: [
                {
                    type: 'item',
                    label: 'Newsletter',
                    link: '/newsletter',
                    icon: <Icons.IconNewspaper className="size-4 text-orange" />,
                },
                {
                    type: 'item',
                    label: 'Blog',
                    link: '/blog',
                    icon: <Icons.IconPencil className="size-4 text-yellow" />,
                },
                {
                    type: 'item' as const,
                    label: 'Forums',
                    link: '/questions',
                    icon: <Icons.IconMessage className="size-4 text-green" />,
                },
            ],
        },
        {
            trigger: 'Company',
            items: [
                {
                    type: 'item',
                    label: 'About',
                    link: '/about',
                    icon: <Icons.IconInfo className="size-4 text-blue" />,
                },
                {
                    type: 'separator',
                },
                {
                    type: 'submenu',
                    label: 'Like and subscribe',
                    icon: <Icons.IconMegaphone className="size-4 text-orange" />,
                    mobileDestination: false,
                    items: [
                        {
                            type: 'item',
                            label: 'X',
                            link: 'https://x.com/posthog',
                            icon: <IconXNotTwitter className="size-4 text-black dark:text-white" />,
                            external: true,
                        },
                        {
                            type: 'item',
                            label: 'LinkedIn',
                            link: 'https://www.linkedin.com/company/posthog',
                            icon: <IconLinkedIn className="size-4" />,
                            external: true,
                        },
                        {
                            type: 'item',
                            label: 'Substack',
                            link: 'https://newsletter.posthog.com',
                            icon: <IconSubstack className="size-4" />,
                            external: true,
                        },
                        {
                            type: 'item',
                            label: 'YouTube',
                            link: 'https://www.youtube.com/@posthog',
                            icon: <IconYouTube className="size-4" />,
                            external: true,
                        },
                        {
                            type: 'item',
                            label: 'Instagram',
                            link: 'https://www.instagram.com/teamposthog',
                            icon: <IconInstagram className="size-4" />,
                            external: true,
                        },
                        {
                            type: 'item',
                            label: 'GitHub',
                            link: 'https://github.com/posthog',
                            icon: <IconGithub className="size-4" />,
                            external: true,
                        },
                    ],
                },
            ],
        },
        {
            trigger: (
                <>
                    <span>More</span>
                </>
            ),
            items: [
                {
                    type: 'submenu',
                    label: 'Legal documents',
                    icon: <Icons.IconTie className="size-4 text-brown dark:text-creamsicle-dark" />,
                    items: [
                        { type: 'item', label: 'Terms of Service', link: '/terms' },
                        { type: 'item', label: 'Privacy Policy', link: '/privacy' },
                    ],
                },
                { type: 'separator' },
                {
                    type: 'item',
                    label: 'Display options',
                    onClick: () => {
                        router.push('/display-options')
                    },
                    icon: <Icons.IconBrightness className="size-4 text-yellow" />,
                    shortcut: [','],
                    mobileDestination: false,
                },
                {
                    type: 'item',
                    label: 'Keyboard shortcuts',
                    link: '/kbd',
                    icon: <Icons.IconKeyboard className="size-4 text-primary" />,
                    shortcut: ['.'],
                },
            ],
        },
    ]

    const baseLogoMenuItems = [
        {
            type: 'item' as const,
            label: 'About',
            link: '/about',
            icon: <Icons.IconInfo className="size-4 text-blue" />,
        },
        {
            type: 'item' as const,
            label: 'Display options',
            onClick: () => {
                router.push('/display-options')
            },
            shortcut: [','],
        },
    ]

    const processMobileNavItems = (): MenuItemType[] => {
        const mobileItems: MenuItemType[] = []
        mainNavItems.forEach((menu) => {
            if (menu.mobileLink) {
                mobileItems.push({
                    type: 'item' as const,
                    label: typeof menu.trigger === 'string' ? menu.trigger : 'Menu',
                    link: menu.mobileLink,
                })
            } else {
                const filteredItems: MenuItemType[] = []
                const menuItemsCopy = [...menu.items]
                for (let i = 0; i < menuItemsCopy.length; i++) {
                    const item = menuItemsCopy[i]
                    if (item.mobileDestination === false) {
                        if (
                            filteredItems.length > 0 &&
                            filteredItems[filteredItems.length - 1].type === 'separator' &&
                            (i === menuItemsCopy.length - 1 || menuItemsCopy[i + 1].type === 'separator')
                        ) {
                            filteredItems.pop()
                        }
                        continue
                    }
                    if (item.type === 'submenu' && item.mobileDestination) {
                        filteredItems.push({ ...item, type: 'item' as const, link: item.mobileDestination, items: undefined })
                    } else if (item.type === 'submenu' && item.link) {
                        filteredItems.push({ ...item, type: 'item' as const, items: undefined })
                    } else {
                        filteredItems.push(item)
                    }
                }
                if (filteredItems.length > 0) {
                    mobileItems.push({
                        type: 'submenu' as const,
                        label: typeof menu.trigger === 'string' ? menu.trigger : 'More',
                        items: filteredItems,
                    })
                }
            }
        })
        return mobileItems
    }

    const logoMenuItems = isMobile
        ? [
              ...processMobileNavItems(),
              { type: 'separator' as const },
              ...baseLogoMenuItems,
          ]
        : baseLogoMenuItems

    const logoMenu: MenuType = {
        trigger: <Logo className="size-7 fill-current" />,
        items: logoMenuItems,
    }

    return [logoMenu, ...mainNavItems]
}

import type { AppIconName } from 'components/OSIcons/AppIcon'
import { IconDictator, IconSparksJoy } from 'components/OSIcons'

export const SparksJoyItems = {
    games: [
        {
            label: 'Hedgehog mode',
            link: '/sparks-joy/hedgehog-mode',
            iconName: 'hedgehog_mode' as AppIconName,
            customIcon: null,
        },
        {
            label: 'HogWars',
            link: '/sparks-joy/hogwars',
            iconName: 'hogwars' as AppIconName,
            customIcon: null,
        },
        {
            label: 'Dictator or tech bro?',
            link: '/sparks-joy/dictator-or-tech-bro',
            iconName: null,
            customIcon: <IconDictator />,
        },
    ],
    notGames: [
        {
            label: 'PostHog FM',
            link: '/fm',
            iconName: null,
            customIcon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path
                        fill="#000"
                        d="M21.5 5.75a.25.25 0 0 0-.25-.25H2.75a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h18.5a.25.25 0 0 0 .25-.25zM10 12a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m7 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m1.5 0a3 3 0 0 1-3 3h-7a3 3 0 1 1 3-3c0 .547-.15 1.058-.405 1.5h1.81A3 3 0 0 1 12.5 12a3 3 0 1 1 6 0m4.5 6.25A1.75 1.75 0 0 1 21.25 20H2.75A1.75 1.75 0 0 1 1 18.25V5.75C1 4.784 1.784 4 2.75 4h18.5c.966 0 1.75.784 1.75 1.75z"
                    />
                </svg>
            ),
        },
        {
            label: 'Photobooth',
            link: '/photobooth',
            iconName: 'photobooth' as AppIconName,
            customIcon: null,
        },
        {
            label: 'HogPaint',
            link: '/paint',
            iconName: 'hogpaint' as AppIconName,
            customIcon: null,
        },
        {
            label: 'Coloring book.pdf',
            link: '/coloring-book.pdf',
            iconName: 'pdf' as AppIconName,
            customIcon: null,
        },
        {
            label: 'Post-It note training',
            link: '/academy',
            iconName: 'postIt' as AppIconName,
            customIcon: null,
        },
        {
            label: '404 page',
            link: '/404',
            iconName: 'blueScreen' as AppIconName,
            customIcon: null,
        },
    ],
}
