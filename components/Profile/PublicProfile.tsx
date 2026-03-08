"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from 'lib/supabase'
import { useAuth } from 'context/AuthContext'
import { useApp } from 'context/App'
import { useWindow } from 'context/Window'
import { useToast } from 'context/ToastContext'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'
import {
    Globe,
    Github,
    MapPin,
    BookOpen,
    PenLine,
    Linkedin,
    Twitter,
    FileText,
    RefreshCw,
    Share,
    Users,
    ExternalLink,
    PanelsTopLeft,
    ArrowUpRight,
} from 'lucide-react'
import {
    IconUser,
    IconChevronLeft,
    IconChevronRight,
} from '@posthog/icons'
import '../Corpus/styles.css'

interface PublicProfileProps {
    username: string
}

interface ProfileData {
    id: string
    username: string
    avatar_url?: string
    cover_url?: string
    bio?: string
    website?: string
    github?: string
    linkedin?: string
    twitter?: string
    pronouns?: string
    location?: string
    role?: string
}

interface NodeDoc {
    id: string
    title: string
    updated: string
    preview: string
}

interface PostItem {
    id: string
    title: string
    slug: string
    excerpt?: string
    image_url?: string
    created_at: string
    published: boolean
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `${weeks}w ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    return `${Math.floor(months / 12)}y ago`
}

function toPostPath(slug: string) {
    const normalized = (slug || '').trim().replace(/\/+$/, '')
    if (!normalized) return '/posts'
    if (normalized.startsWith('/posts/') || normalized.startsWith('/blog/')) return normalized
    if (normalized.startsWith('/')) return `/posts${normalized}`.replace(/\/+/g, '/')
    return `/posts/${normalized}`
}

export default function PublicProfile({ username }: PublicProfileProps) {
    const { profile: authProfile } = useAuth()
    const { addWindow } = useApp()
    const { addToast } = useToast()
    const windowCtx = useWindow()
    const goBack = windowCtx?.goBack
    const goForward = windowCtx?.goForward
    const canGoBack = windowCtx?.canGoBack || false
    const canGoForward = windowCtx?.canGoForward || false

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [nodes, setNodes] = useState<NodeDoc[]>([])
    const [posts, setPosts] = useState<PostItem[]>([])
    const [nodesLoading, setNodesLoading] = useState(false)
    const [postsLoading, setPostsLoading] = useState(false)

    const normalizedUsername = useMemo(() => decodeURIComponent(username || '').trim(), [username])
    const isOwner = !!authProfile?.username && authProfile.username.toLowerCase() === normalizedUsername.toLowerCase()
    const displayName = profile?.username || normalizedUsername
    const publicProfilePath = normalizedUsername ? `/profile/${encodeURIComponent(normalizedUsername)}` : '/profile'
    const corpusPath = normalizedUsername ? `/u/${encodeURIComponent(normalizedUsername)}` : '/'

    const copyLink = useCallback(async (path: string, label: string) => {
        if (typeof window === 'undefined') return

        const url = `${window.location.origin}${path}`

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url)
            } else {
                const textArea = document.createElement('textarea')
                textArea.value = url
                textArea.style.position = 'fixed'
                textArea.style.left = '-999999px'
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                document.execCommand('copy')
                document.body.removeChild(textArea)
            }

            addToast(`${label} link copied`, 'success')
        } catch {
            addToast(`failed to copy ${label} link`, 'error')
        }
    }, [addToast])

    const openCorpus = useCallback(() => {
        if (!normalizedUsername) return
        addWindow({
            key: `corpus-${normalizedUsername}`,
            path: corpusPath,
            title: `${displayName}'s corpus`,
        })
    }, [addWindow, corpusPath, displayName, normalizedUsername])

    const openPost = useCallback((post: PostItem) => {
        addWindow({
            key: `post-${post.slug}`,
            path: toPostPath(post.slug),
            title: post.title,
        })
    }, [addWindow])

    const openNodeEditor = useCallback((node: NodeDoc) => {
        if (!isOwner) return
        addWindow({
            key: `node-${node.id}`,
            title: node.title || 'Untitled Node',
            path: '/write',
            icon: <FileText className="size-4" />,
            props: { nodeId: node.id, isCanvas: true },
        })
    }, [addWindow, isOwner])

    const loadProfile = useCallback(async () => {
        if (!normalizedUsername) {
            setProfile(null)
            return
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, cover_url, bio, website, github, linkedin, twitter, pronouns, location, role')
            .ilike('username', normalizedUsername)
            .maybeSingle()

        if (!error && data) {
            setProfile(data as ProfileData)
        } else {
            setProfile(null)
        }
    }, [normalizedUsername])

    const loadNodes = useCallback(async (profileId: string) => {
        setNodesLoading(true)

        const { data, error } = await supabase
            .from('nodes')
            .select('id, title, content, updated_at')
            .eq('author_id', profileId)
            .eq('status', 'published')
            .order('updated_at', { ascending: false })

        if (!error && data) {
            setNodes(data.map((row) => ({
                id: row.id as string,
                title: row.title || 'Untitled',
                updated: relativeTime(row.updated_at),
                preview: (row.content || '').slice(0, 400),
            })))
        } else {
            setNodes([])
        }

        setNodesLoading(false)
    }, [])

    const loadPosts = useCallback(async () => {
        if (!normalizedUsername) {
            setPosts([])
            return
        }

        setPostsLoading(true)

        const { data, error } = await supabase
            .from('posts')
            .select('id, title, slug, excerpt, image_url, created_at, published')
            .ilike('author', normalizedUsername)
            .eq('published', true)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setPosts(data as PostItem[])
        } else {
            setPosts([])
        }

        setPostsLoading(false)
    }, [normalizedUsername])

    const refreshAll = useCallback(async () => {
        setRefreshing(true)
        setLoading(true)
        await loadProfile()
        setRefreshing(false)
        setLoading(false)
    }, [loadProfile])

    useEffect(() => {
        let mounted = true

        const run = async () => {
            setLoading(true)
            await loadProfile()
            if (mounted) setLoading(false)
        }

        run()

        return () => {
            mounted = false
        }
    }, [loadProfile])

    useEffect(() => {
        if (!profile?.id) return
        loadNodes(profile.id)
    }, [loadNodes, profile?.id])

    useEffect(() => {
        loadPosts()
    }, [loadPosts])

    const linkCount = [profile?.website, profile?.github, profile?.linkedin, profile?.twitter].filter(Boolean).length
    const tableRows = [
        { field: 'name', value: displayName },
        { field: 'username', value: `@${displayName}` },
        { field: 'role', value: profile?.role || 'member' },
        { field: 'location', value: profile?.location || profile?.pronouns || 'not set' },
        { field: 'posts', value: `${posts.length} published` },
        { field: 'nodes', value: `${nodes.length} published` },
    ]

    if (loading) {
        return (
            <div className="corpus-root flex items-center justify-center size-full bg-primary">
                <RefreshCw className="size-5 animate-spin opacity-30" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="corpus-root flex flex-col items-center justify-center size-full bg-primary gap-3">
                <IconUser className="size-10 opacity-20" />
                <p className="text-sm font-black lowercase text-primary/50">profile not found</p>
                <p className="text-xs lowercase text-primary/30">no profile exists for &quot;{normalizedUsername}&quot;</p>
            </div>
        )
    }

    return (
        <div className="corpus-root flex flex-col size-full bg-primary text-primary font-sans overflow-hidden">
            <div
                data-scheme="tertiary"
                className="flex w-full items-center px-1.5 py-0.5 select-none gap-2 justify-between bg-primary border-b border-primary shrink-0 z-10 h-10 overflow-x-auto custom-scrollbar no-scrollbar-on-mobile"
            >
                <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-0.5">
                        <OSButton size="sm" onClick={goBack} disabled={!canGoBack} className="p-1 h-8 w-8 !rounded-md">
                            <IconChevronLeft className={`size-[18px] ${canGoBack ? 'opacity-100' : 'opacity-30'}`} />
                        </OSButton>
                        <OSButton size="sm" onClick={goForward} disabled={!canGoForward} className="p-1 h-8 w-8 !rounded-md">
                            <IconChevronRight className={`size-[18px] ${canGoForward ? 'opacity-100' : 'opacity-30'}`} />
                        </OSButton>
                    </div>
                    <div className="hidden sm:block w-px h-5 bg-black/20 dark:bg-white/20 mx-1 flex-shrink-0" />
                    <div className="flex items-center gap-1.5 ml-1 min-w-0">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={displayName} className="size-5 rounded-full object-cover border border-primary/20 shrink-0" />
                        ) : (
                            <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                <span className="text-[9px] font-black text-primary/60">{displayName.charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                        <h1 className="text-[13px] font-bold tracking-tight text-primary leading-none m-0 whitespace-nowrap">
                            {displayName}&apos;s profile
                        </h1>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/30 border border-primary/15 px-1.5 py-0.5 rounded hidden sm:inline">public</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 justify-end flex-shrink-0">
                    {isOwner && (
                        <OSButton size="sm" className="!px-2 h-8 !rounded flex items-center gap-1.5 flex-shrink-0" onClick={openCorpus}>
                            <PenLine className="size-[14px] opacity-70" />
                            <span className="hidden md:inline text-[12px] font-semibold">edit corpus</span>
                        </OSButton>
                    )}
                    <div className="hidden sm:block w-px h-5 bg-black/20 dark:bg-white/20 mx-1 flex-shrink-0" />
                    <Tooltip trigger={<OSButton size="sm" className="p-1.5 h-8 w-8 !rounded" onClick={refreshAll}><RefreshCw className={`size-[16px] opacity-70 ${refreshing ? 'animate-spin' : ''}`} /></OSButton>} side="bottom">refresh profile</Tooltip>
                    <Tooltip trigger={<OSButton size="sm" className="p-1.5 h-8 w-8 !rounded" onClick={() => copyLink(publicProfilePath, 'profile')}><Share className="size-[16px] opacity-70" /></OSButton>} side="bottom">share profile</Tooltip>
                    <Tooltip trigger={<OSButton size="sm" className="p-1.5 h-8 w-8 !rounded" onClick={openCorpus}><PanelsTopLeft className="size-[16px] opacity-70" /></OSButton>} side="bottom">open corpus</Tooltip>
                    {profile.website && (
                        <Tooltip trigger={<a href={profile.website} target="_blank" rel="noopener noreferrer"><OSButton size="sm" className="p-1.5 h-8 w-8 !rounded"><ExternalLink className="size-[16px] opacity-70" /></OSButton></a>} side="bottom">website</Tooltip>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fafcfc] dark:bg-primary">
                <div className="corpus-nodes-wrapper" style={{ marginTop: 'clamp(0.5rem, 2vw, 1.5rem)' }}>
                    <div className="corpus-profile-slot">
                        <div className="corpus-profile-stack">
                            <div className="corpus-profile-visual corpus-profile-cardShadow">
                                <div className="corpus-profile-cover">
                                    {profile.cover_url ? (
                                        <img src={profile.cover_url} alt="cover" />
                                    ) : (
                                        <div className="corpus-profile-coverEmpty" />
                                    )}
                                </div>
                                <div className="corpus-profile-avatar">
                                    {profile.avatar_url ? <img src={profile.avatar_url} alt={displayName} /> : <IconUser className="size-5 text-primary/30" />}
                                </div>
                            </div>

                            <div className="corpus-profile-layerStack">
                                <div className="corpus-profile-tableCard corpus-profile-cardShadow">
                                    <div className="corpus-profile-cardHeading">
                                        <Users className="size-4" />
                                        <span>profile database</span>
                                        <span className="corpus-badge" style={{ marginLeft: 'auto' }}>
                                            <PanelsTopLeft className="size-3" />
                                            <span>database</span>
                                        </span>
                                    </div>

                                    <div className="corpus-profile-tableScroll custom-scrollbar">
                                        <table className="corpus-profile-table">
                                            <thead>
                                                <tr>
                                                    <td>field</td>
                                                    <td>value</td>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tableRows.map((row) => (
                                                    <tr key={row.field}>
                                                        <td>{row.field}</td>
                                                        <td>{row.value}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="corpus-profile-meta">
                                        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, padding: '0.75rem' }}>
                                            {profile.bio
                                                ? <span style={{ opacity: 0.8 }}>{profile.bio}</span>
                                                : <span style={{ opacity: 0.35, fontStyle: 'italic' }}>no bio yet</span>
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="corpus-doc-grid-wrapper">
                    <div className="corpus-doc-tabs">
                        <button className="corpus-doc-tab corpus-doc-tab--active">published nodes <span>{nodes.length}</span></button>
                    </div>
                    {nodesLoading && (
                        <div className="corpus-doc-empty"><RefreshCw className="size-6 animate-spin" style={{ opacity: 0.3 }} /><p>loading nodes...</p></div>
                    )}
                    {!nodesLoading && (
                        <div className="corpus-doc-grid">
                            {nodes.map((node) => (
                                <article key={node.id} className={`corpus-doc-card ${isOwner ? 'cursor-pointer' : ''}`} onClick={isOwner ? () => openNodeEditor(node) : undefined}>
                                    <div className="corpus-doc-media">
                                        <div className="corpus-doc-preview-text">{node.preview}</div>
                                        <div className="corpus-doc-media-fade" />
                                        <div className="corpus-doc-badge"><BookOpen className="size-3" /><span>pub</span></div>
                                    </div>
                                    <div className="corpus-doc-info">
                                        <div><FileText className="size-3.5" /><span>{node.updated}</span></div>
                                        <h3>{node.title}</h3>
                                        <p>{isOwner ? 'click to edit' : 'published node'}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    {!nodesLoading && nodes.length === 0 && (
                        <div className="corpus-doc-empty"><BookOpen className="size-8" style={{ opacity: 0.2 }} /><p>no published nodes yet</p></div>
                    )}
                </div>

                <div className="corpus-doc-grid-wrapper">
                    <div className="corpus-doc-tabs">
                        <button className="corpus-doc-tab corpus-doc-tab--active">published posts <span>{posts.length}</span></button>
                    </div>
                    {postsLoading && (
                        <div className="corpus-doc-empty"><RefreshCw className="size-6 animate-spin" style={{ opacity: 0.3 }} /><p>loading posts...</p></div>
                    )}
                    {!postsLoading && (
                        <div className="corpus-doc-grid">
                            {posts.map((post) => (
                                <article key={post.id} className="corpus-doc-card cursor-pointer" onClick={() => openPost(post)}>
                                    <div className="corpus-doc-media">
                                        {post.image_url ? <img src={post.image_url} alt={post.title} className="size-full object-cover" /> : <div className="corpus-doc-preview-text">{post.excerpt || 'open the full post to read more'}</div>}
                                        <div className="corpus-doc-media-fade" />
                                        <div className="corpus-doc-badge"><ArrowUpRight className="size-3" /><span>post</span></div>
                                    </div>
                                    <div className="corpus-doc-info">
                                        <div><BookOpen className="size-3.5" /><span>{relativeTime(post.created_at)}</span></div>
                                        <h3>{post.title}</h3>
                                        <p>open post</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    {!postsLoading && posts.length === 0 && (
                        <div className="corpus-doc-empty"><BookOpen className="size-8" style={{ opacity: 0.2 }} /><p>no published posts yet</p></div>
                    )}
                </div>
            </div>
        </div>
    )
}
