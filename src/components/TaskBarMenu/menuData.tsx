"use client"
import { MenuType, MenuItemType } from 'components/RadixUI/MenuBar'
import React from 'react'
import { companyMenu } from '../../navs'
import * as Icons from '@posthog/icons'
import { Logo } from '@posthog/brand/logo'
import {
    IconXNotTwitter,
    IconSubstack,
    IconYouTube,
    IconLinkedIn,
    IconGithub,
    IconInstagram,
    IconSparksJoy,
} from 'components/OSIcons'
import { useAppSettings } from '../../context/App'
import { useHedgehogMode } from 'components/HedgehogMode'
import { useSmallTeamsMenuItems } from './SmallTeamsMenuItems'
import { useRouter } from 'next/navigation'

const SparksJoyItems = {
    games: [
        { label: 'Dino run', link: '/dino' },
        { label: 'Pong', link: '/pong' },
        { label: 'Pixel painter', link: '/paint' },
        { label: 'Photo booth', link: '/photobooth' },
    ],
    notGames: [
        { label: 'Coloring book', link: '/coloring-book.pdf' },
        { label: 'Hog Watch', link: '/hogwatch' },
        { label: 'Hedgehog generator', link: '/hedgehog-generator' },
    ],
}

export function useMenuData(): MenuType[] {
    const smallTeamsMenuItems = useSmallTeamsMenuItems()
    const { isMobile } = useAppSettings()
    const [hedgehogModeEnabled, setHedgehogModeEnabled] = useHedgehogMode()
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
                {
                    type: 'item',
                    label: 'Events',
                    link: '/events',
                    icon: <Icons.IconCalendar className="size-4 text-red" />,
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
                },
                {
                    type: 'item',
                    label: 'Handbook',
                    link: '/handbook',
                    icon: <Icons.IconBook className="size-4 text-seagreen" />,
                },
                {
                    type: 'item',
                    label: 'Roadmap',
                    link: '/roadmap',
                    icon: <Icons.IconMap className="size-4 text-orange" />,
                },
                {
                    type: 'item',
                    label: 'Changelog',
                    link: '/changelog',
                    icon: <Icons.IconCalendar className="size-4 text-red" />,
                },
                {
                    type: 'separator',
                },
                {
                    type: 'item',
                    label: 'People',
                    link: '/people',
                    icon: <Icons.IconPeople className="size-4 text-blue" />,
                },
                {
                    type: 'submenu',
                    label: 'Small teams',
                    link: '/small-teams',
                    items: smallTeamsMenuItems,
                    icon: <Icons.IconShieldPeople className="size-4 text-teal" />,
                },
                {
                    type: 'item',
                    label: 'Careers',
                    link: '/careers',
                    icon: <Icons.IconLaptop className="size-4 text-purple" />,
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
                    label: 'Things that spark joy',
                    icon: <IconSparksJoy className="size-4" />,
                    items: [
                        {
                            type: 'item',
                            onClick: () => setHedgehogModeEnabled(!hedgehogModeEnabled),
                            node: (
                                <span className="px-2.5 flex w-full justify-between items-center gap-2">
                                    <span>Hedgehog mode</span>
                                    <span className="relative inline-flex items-center justify-center h-2 w-8 flex-shrink-0">
                                        <span
                                            aria-hidden
                                            className="pointer-events-none absolute w-full h-full rounded-md bg-[#c4c4c4] dark:bg-[#5A5A5A]"
                                        />
                                        <span
                                            aria-hidden
                                            className={`pointer-events-none absolute left-0 inline-block h-4 w-4 rounded-full transition-transform ease-in-out duration-200 ${
                                                hedgehogModeEnabled
                                                    ? 'translate-x-5 bg-teal'
                                                    : 'translate-x-0 bg-[#555] dark:bg-[#999]'
                                            }`}
                                        />
                                    </span>
                                </span>
                            ),
                        },
                        { type: 'separator' },
                        { type: 'item', label: 'Browse all', link: '/sparks-joy' },
                        { type: 'separator' },
                        { type: 'item', label: 'Games', disabled: true },
                        ...SparksJoyItems.games.map((item) => ({
                            type: 'item' as const,
                            label: item.label,
                            link: item.link,
                        })),
                        { type: 'item', label: 'Sorta like games', disabled: true },
                        ...SparksJoyItems.notGames.map((item) => ({
                            type: 'item' as const,
                            label: item.label,
                            link: item.link,
                        })),
                    ],
                },
                {
                    type: 'submenu',
                    label: 'Sexy legal documents',
                    icon: <Icons.IconTie className="size-4 text-brown dark:text-creamsicle-dark" />,
                    items: [
                        { type: 'item', label: 'Terms', link: '/terms' },
                        { type: 'item', label: 'Privacy', link: '/privacy' },
                        { type: 'item', label: "DPA generator (it's fun!)", link: '/dpa' },
                        { type: 'item', label: 'BAA generator (less fun)', link: '/baa' },
                        { type: 'item', label: 'Subprocessors', link: '/subprocessors' },
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
              { type: 'item' as const, label: 'home.mdx', link: '/' },
              { type: 'separator' as const },
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
