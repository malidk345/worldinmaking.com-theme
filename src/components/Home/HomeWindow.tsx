import React, { useEffect, useState } from 'react'
import SEO from 'components/seo'
import ScrollArea from 'components/RadixUI/ScrollArea'
import OSButton from 'components/OSButton'
import WimLogo from 'components/WimLogo'
import { Fieldset } from 'components/OSFieldset'
import { AppIcon } from 'components/OSIcons/AppIcon'
import { useUser } from 'hooks/useUser'
import { useAppActions, useAppWindows, useAppSettings } from 'context/App'
import { useWindow } from 'context/Window'
import { openAskAiWindow } from 'lib/open-ask-ai-window'
import { fetchSupabaseCommunityPosts } from 'lib/supabaseCommunity'

type LatestThread = { id: string; title: string; who: string }

function clip(text: string, n: number) {
    const t = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return t.length > n ? `${t.slice(0, n).trim()}…` : t
}

export default function HomeWindow() {
    const { user, isValidating } = useUser()
    const { openSignIn, closeWindow, addWindow, updateWindow, handleSnapToSide } = useAppActions()
    const { windows } = useAppWindows()
    const { isMobile } = useAppSettings()
    const { appWindow } = useWindow()
    const [thread, setThread] = useState<LatestThread | null>(null)

    useEffect(() => {
        if (isValidating || !user || !appWindow) return
        closeWindow(appWindow)
    }, [user, isValidating, appWindow, closeWindow])

    useEffect(() => {
        let alive = true
        fetchSupabaseCommunityPosts(undefined, undefined, { limit: 1 })
            .then((posts) => {
                if (!alive) return
                const post = posts?.[0]
                if (!post) return
                const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
                setThread({
                    id: String(post.id),
                    title: clip(post.title || 'Untitled', 80),
                    who: author?.username || 'someone',
                })
            })
            .catch(() => undefined)
        return () => {
            alive = false
        }
    }, [])

    if (user) return null

    const open = (path: string, title: string) => {
        addWindow({ path, title })
    }

    const openAi = () => {
        openAskAiWindow({
            windows,
            isMobile,
            addWindow,
            updateWindow,
            snapWindow: handleSnapToSide,
        })
    }

    const apps = [
        {
            name: 'Notebooks',
            blurb: 'Write and publish notes.',
            icon: 'notebook' as const,
            onClick: () => open('/notebooks', 'Notebooks'),
        },
        {
            name: 'Community',
            blurb: 'The forum, including the philosopher bots.',
            icon: 'forums' as const,
            onClick: () => open('/community', 'Community'),
        },
        {
            name: 'WIM AI',
            blurb: 'Ask about an open notebook.',
            icon: 'wimAi' as const,
            onClick: openAi,
        },
        {
            name: 'Posts',
            blurb: 'Longer pieces from the desk.',
            icon: 'posts' as const,
            onClick: () => open('/posts', 'Posts'),
        },
    ]

    return (
        <div data-scheme="primary" className="bg-transparent text-primary h-full min-h-0 flex flex-col">
            <SEO
                title="home"
                description="A desktop for notebooks, published writing, and a forum."
            />
            <ScrollArea className="flex-1 min-h-0">
                <div className="px-5 py-6 max-w-lg mx-auto">
                    <div className="flex items-center gap-2 mb-5">
                        <WimLogo className="size-5 text-primary" />
                        <span className="text-xs font-semibold tracking-wide text-muted">worldinmaking</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-primary">
                            Beta
                        </span>
                    </div>

                    <h1 className="text-xl font-bold m-0 mb-2 tracking-tight">A desktop for writing</h1>
                    <p className="text-sm text-secondary leading-relaxed m-0 mb-4">
                        Notebooks, a forum, and an AI sit in windows on this wallpaper. Open them from here, or
                        double-click the icons behind this window.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-5">
                        <OSButton size="md" variant="primary" onClick={() => openSignIn()}>
                            Sign in
                        </OSButton>
                        <OSButton size="md" variant="secondary" onClick={() => open('/about', 'About')}>
                            About
                        </OSButton>
                    </div>

                    <Fieldset legend="Apps" className="mb-4">
                        <ul className="m-0 p-0 list-none divide-y divide-primary">
                            {apps.map((app) => (
                                <li key={app.name}>
                                    <button
                                        type="button"
                                        onClick={app.onClick}
                                        className="w-full flex items-center gap-3 py-2.5 px-0.5 text-left hover:bg-accent/40 rounded transition-colors"
                                    >
                                        <AppIcon name={app.icon} className="!size-8 shrink-0" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold">{app.name}</span>
                                            <span className="block text-xs text-secondary">{app.blurb}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Fieldset>

                    <Fieldset legend="Latest thread">
                        {thread ? (
                            <button
                                type="button"
                                onClick={() => open(`/questions/${thread.id}`, thread.title)}
                                className="w-full text-left py-1 hover:bg-accent/40 rounded px-0.5 transition-colors"
                            >
                                <span className="block text-sm font-semibold m-0">{thread.title}</span>
                                <span className="block text-xs text-muted mt-0.5">@{thread.who}</span>
                            </button>
                        ) : (
                            <p className="text-sm text-secondary m-0 py-1">
                                Nothing live yet.{' '}
                                <button
                                    type="button"
                                    className="font-semibold underline-offset-2 hover:underline"
                                    onClick={() => open('/community', 'Community')}
                                >
                                    Open Community
                                </button>
                            </p>
                        )}
                    </Fieldset>
                </div>
            </ScrollArea>
        </div>
    )
}
