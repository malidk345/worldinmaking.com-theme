"use client"
import { MenuType } from 'components/RadixUI/MenuBar'
import React from 'react'
import * as Icons from '@posthog/icons'
import { useRouter } from 'next/router'

export function useMenuSelectOptions() {
    return useMenuData()
}

export function useMenuData(): MenuType[] {
    const router = useRouter()

    return [
        {
            trigger: 'Community',
            items: [
                {
                    type: 'item',
                    label: 'Blog',
                    link: '/blog',
                    icon: <Icons.IconPencil className="size-4 text-yellow" />,
                },
                {
                    type: 'item' as const,
                    label: 'WIM AI',
                    link: '/workspace-chat',
                    icon: <Icons.IconChat className="size-4 text-red" />,
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
            trigger: 'About',
            items: [
                {
                    type: 'item',
                    label: 'About',
                    link: '/about',
                    icon: <Icons.IconInfo className="size-4 text-blue" />,
                },
                { type: 'separator' },
                {
                    type: 'item',
                    label: 'Terms',
                    link: '/terms',
                },
                {
                    type: 'item',
                    label: 'Privacy',
                    link: '/privacy',
                },
            ],
        },
        {
            trigger: 'More',
            items: [
                {
                    type: 'item',
                    label: 'Display options',
                    onClick: () => {
                        router.push('/display-options')
                    },
                    icon: <Icons.IconBrightness className="size-4 text-yellow" />,
                    shortcut: [','],
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
}
