"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useToast } from 'context/ToastContext'
import { supabase } from 'lib/supabase'
import OSButton from 'components/OSButton'
import { useApp } from 'context/App'
import { IconGlobe, IconUser, IconBook, IconMessage } from '@posthog/icons'

interface PublicProfileProps {
    username: string
}

interface PublicProfileData {
    id: string
    username: string
    avatar_url?: string
    bio?: string
    website?: string
    github?: string
    linkedin?: string
    twitter?: string
    pronouns?: string
    location?: string
    role?: string
}

interface PublicPost {
    id: string
    slug: string
    title: string
    created_at: string
}

export default function PublicProfile({ username }: PublicProfileProps) {
    const { addToast } = useToast()
    const { addWindow } = useApp()
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<PublicProfileData | null>(null)
    const [posts, setPosts] = useState<PublicPost[]>([])

    const toPostPath = (slug: string) => {
        const normalized = (slug || '').trim().replace(/\/+$/, '')
        if (!normalized) return '/posts'
        if (normalized.startsWith('/posts/') || normalized.startsWith('/blog/')) return normalized
        if (normalized.startsWith('/')) return `/posts${normalized}`.replace(/\/+/g, '/')
        return `/posts/${normalized}`
    }

    const normalizedUsername = useMemo(() => decodeURIComponent(username || '').trim(), [username])

    useEffect(() => {
        const load = async () => {
            if (!normalizedUsername) {
                setLoading(false)
                return
            }

            setLoading(true)

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, bio, website, github, linkedin, twitter, pronouns, location, role')
                .ilike('username', normalizedUsername)
                .maybeSingle()

            if (profileError) {
                addToast(profileError.message || 'failed to load profile', 'error')
                setLoading(false)
                return
            }

            if (!profileData) {
                setProfile(null)
                setPosts([])
                setLoading(false)
                return
            }

            setProfile(profileData as PublicProfileData)

            const { data: authoredPosts, error: postsError } = await supabase
                .from('posts')
                .select('id, slug, title, created_at')
                .eq('published', true)
                .eq('author', profileData.username)
                .order('created_at', { ascending: false })
                .limit(6)

            if (postsError) {
                addToast(postsError.message || 'failed to load posts', 'warning')
            }

            setPosts((authoredPosts || []) as PublicPost[])
            setLoading(false)
        }

        load()
    }, [addToast, normalizedUsername])

    if (loading) {
        return <div className="p-8 text-center text-secondary lowercase">loading profile...</div>
    }

    if (!profile) {
        return (
            <div className="p-8 text-center text-primary lowercase">
                <h2 className="text-xl font-black">profile not found</h2>
                <p className="mt-2 text-secondary">no profile exists for “{normalizedUsername}”.</p>
            </div>
        )
    }

    const links = [
        { label: 'website', value: profile.website },
        { label: 'github', value: profile.github },
        { label: 'linkedin', value: profile.linkedin },
        { label: 'twitter', value: profile.twitter },
    ].filter((link) => !!link.value)

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-accent p-5 md:p-6 text-primary">
            <div className="mx-auto max-w-4xl space-y-5">
                <section className="rounded border border-primary bg-primary p-4 md:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-16 overflow-hidden rounded border border-primary bg-accent md:size-20">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.username} className="size-full object-cover" />
                                ) : (
                                    <div className="flex size-full items-center justify-center text-secondary">
                                        <IconUser className="size-9" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h1 className="m-0 text-xl font-black lowercase md:text-2xl">{profile.username}</h1>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold lowercase">
                                    <span className="rounded border border-primary bg-accent px-2 py-0.5">{profile.role || 'member'}</span>
                                    {profile.pronouns && <span className="rounded border border-primary bg-accent px-2 py-0.5">{profile.pronouns}</span>}
                                    {profile.location && <span className="rounded border border-primary bg-accent px-2 py-0.5">{profile.location}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded border border-primary bg-primary p-4 md:p-5">
                    <h3 className="m-0 mb-3 text-sm font-black lowercase">about</h3>
                    <p className="m-0 whitespace-pre-wrap text-sm text-secondary">{profile.bio || 'no bio added yet.'}</p>
                </section>

                <section className="rounded border border-primary bg-primary p-4 md:p-5">
                    <h3 className="m-0 mb-3 flex items-center gap-2 text-sm font-black lowercase">
                        <IconGlobe className="size-4 opacity-60" /> links
                    </h3>
                    {links.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {links.map((link) => (
                                <OSButton key={link.label} asLink to={link.value as string} external variant="secondary" size="sm">
                                    {link.label}
                                </OSButton>
                            ))}
                        </div>
                    ) : (
                        <p className="m-0 text-sm text-secondary lowercase">no links shared.</p>
                    )}
                </section>

                <section className="rounded border border-primary bg-primary p-4 md:p-5">
                    <h3 className="m-0 mb-3 flex items-center gap-2 text-sm font-black lowercase">
                        <IconBook className="size-4 opacity-60" /> recent posts
                    </h3>
                    {posts.length > 0 ? (
                        <div className="space-y-2">
                            {posts.map((post) => (
                                <div key={post.id} className="flex items-center justify-between rounded border border-primary bg-accent px-3 py-2">
                                    <button
                                        type="button"
                                        className="text-sm font-semibold text-primary bg-transparent border-none p-0 cursor-pointer hover:underline"
                                        onClick={() => addWindow({
                                            key: `post-${post.slug}`,
                                            path: toPostPath(post.slug),
                                            title: post.title,
                                            size: { width: 1000, height: 800 }
                                        })}
                                    >
                                        {post.title}
                                    </button>
                                    <span className="text-xs text-secondary">{new Date(post.created_at).toLocaleDateString('en-US')}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="m-0 text-sm text-secondary lowercase">no published posts yet.</p>
                    )}
                </section>

                <section className="rounded border border-primary bg-primary p-4 md:p-5">
                    <h3 className="m-0 mb-3 flex items-center gap-2 text-sm font-black lowercase">
                        <IconMessage className="size-4 opacity-60" /> profile type
                    </h3>
                    <p className="m-0 text-sm text-secondary lowercase">
                        this is the shared public profile view for writers and all users.
                    </p>
                </section>
            </div>
        </div>
    )
}
