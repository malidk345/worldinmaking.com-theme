import React from 'react'
import { AppIcon, AppItem } from 'components/OSIcons/AppIcon'
import { useUser } from 'hooks/useUser'
import { useAppActions } from 'context/App'
import getAvatarURL from 'components/Squeak/util/getAvatar'
import { profileHref } from 'lib/profile-path'
import { useT } from 'lib/i18n/t'

function ProfilePhotoIcon({ src, name }: { src?: string; name: string }) {
    if (src) {
        return (
            <img
                src={src}
                alt=""
                draggable={false}
                className="size-10 rounded-full object-cover border-[1.5px] border-black bg-white"
            />
        )
    }
    const initial = (name || '?').slice(0, 1).toUpperCase()
    return (
        <span className="size-10 rounded-full border-[1.5px] border-black bg-pink text-white flex items-center justify-center text-lg font-semibold leading-none">
            {initial}
        </span>
    )
}

function accountDesktopApp(user: ReturnType<typeof useUser>['user'], openSignIn: () => void): AppItem {
    if (!user) {
        return {
            label: 'Sign In',
            Icon: <AppIcon name="signIn" />,
            onClick: () => openSignIn(),
            source: 'desktop',
        }
    }
    const handle = user.username || user.profile?.username || ''
    const href = profileHref(handle) || '/profile'
    const avatar =
        getAvatarURL(user.profile as any) || (user.profile as { avatar_url?: string } | undefined)?.avatar_url || ''
    return {
        label: handle || 'Profile',
        Icon: <ProfilePhotoIcon src={avatar} name={handle || user.email || 'U'} />,
        url: href,
        source: 'desktop',
    }
}

export const useProductLinks = () => {
    const { user, isValidating } = useUser()
    const { openSignIn } = useAppActions()
    const { t } = useT()
    const account = React.useMemo(() => {
        const item = accountDesktopApp(user, openSignIn)
        if (!user) return { ...item, label: t('chrome.signInDesktop') }
        return item
    }, [user, openSignIn, t])
    const showHome = !user && !isValidating
    return React.useMemo(
        () => [
            ...(showHome
                ? [
                      {
                          label: t('chrome.home'),
                          Icon: <AppIcon name="home" />,
                          url: '/home',
                          source: 'desktop',
                      } as AppItem,
                  ]
                : []),
            {
                label: t('chrome.community'),
                Icon: <AppIcon name="forums" />,
                url: '/community',
                source: 'desktop',
            },
            {
                label: t('chrome.notebooks'),
                Icon: <AppIcon name="notebook" />,
                url: '/notebooks',
                source: 'desktop',
            },
            {
                label: t('chrome.wimAi'),
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
            account,
        ],
        [account, showHome, t]
    )
}

export const apps: AppItem[] = [
    {
        label: 'Study',
        Icon: <AppIcon name="pricing" />,
        url: '/pricing',
        source: 'desktop',
    },
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
