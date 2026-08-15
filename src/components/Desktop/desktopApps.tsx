import React from 'react'
import { AppIcon, AppItem } from 'components/OSIcons/AppIcon'

export const useProductLinks = () => {
    return React.useMemo(
        () => [
            {
                label: 'Community',
                Icon: <AppIcon name="forums" />,
                url: '/community',
                source: 'desktop',
            },
            {
                label: 'Notebooks',
                Icon: <AppIcon name="notebook" />,
                url: '/notebooks',
                source: 'desktop',
            },
            {
                label: 'WIM AI',
                Icon: <AppIcon name="wimAi" />,
                url: '/workspace-chat',
                source: 'desktop',
            },
            {
                label: 'Posts',
                Icon: <AppIcon name="posts" />,
                url: '/posts',
                source: 'desktop',
            },
        ],
        []
    )
}

export const apps: AppItem[] = [
    {
        label: 'Archive',
        Icon: <AppIcon name="archive" />,
        url: '/archive',
        source: 'desktop',
    },
    {
        label: 'Contact',
        Icon: <AppIcon name="envelope" />,
        url: '/contact',
        source: 'desktop',
    },
    {
        label: 'Display Options',
        Icon: <AppIcon name="page" />,
        url: '/display-options',
        source: 'desktop',
    },
    {
        label: 'Trash',
        Icon: <AppIcon name="trash" />,
        url: '/trash',
        source: 'desktop',
    },
]
