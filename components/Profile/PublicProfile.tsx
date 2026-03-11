"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from 'lib/supabase'
import { useAuth } from 'context/AuthContext'
import { useApp } from 'context/App'
import { useWindow } from 'context/Window'
import { useToast } from 'context/ToastContext'
import OSButton from 'components/OSButton'
import Loading from 'components/Loading'
import Tooltip from 'components/RadixUI/Tooltip'
import {
    BookOpen,
    PenLine,
    FileText,
    RefreshCw,
    Share,
    ExternalLink,
    PanelsTopLeft,
    ArrowUpRight,
    Layers,
    Trash2,
} from 'lucide-react'
import {
    IconUser,
    IconChevronLeft,
    IconChevronRight,
    IconSidebarOpen,
    IconSidebarClose,
    IconPlus,
    IconBookmark,
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
    status?: 'published' | 'draft'
}

interface PostItem {
    id: string
    title: string
    slug: string
    excerpt?: string
    image_url?: string
    created_at: string
    published: boolean
    is_approved: boolean
}

interface SavedPostItem {
    post_slug: string
    post_title: string | null
    saved_at: string
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
    const { user, profile: authProfile, updateProfile } = useAuth()
    const { addWindow, isMobile } = useApp()
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
    const [savedPosts, setSavedPosts] = useState<SavedPostItem[]>([])
    const [nodesLoading, setNodesLoading] = useState(false)
    const [postsLoading, setPostsLoading] = useState(false)
    const [savedPostsLoading, setSavedPostsLoading] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
    const [activeSection, setActiveSection] = useState<'overview' | 'nodes-all' | 'nodes-published' | 'nodes-drafts' | 'posts-all' | 'posts-published' | 'posts-drafts' | 'saved-posts'>('overview')
    const [isEditingProfile, setIsEditingProfile] = useState(false)
    const [updatingProfile, setUpdatingProfile] = useState(false)
    const [form, setForm] = useState<Partial<ProfileData>>({
        avatar_url: '',
        cover_url: '',
        bio: '',
        website: '',
        github: '',
        linkedin: '',
        twitter: '',
        pronouns: '',
        location: '',
    })

    const normalizedUsername = useMemo(() => decodeURIComponent(username || '').trim(), [username])
    const isOwner = !!authProfile?.username && authProfile.username.toLowerCase() === normalizedUsername.toLowerCase()
    const displayName = profile?.username || normalizedUsername
    const publicProfilePath = normalizedUsername ? `/profile/${encodeURIComponent(normalizedUsername)}` : '/profile'

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

    const openProfileEditor = useCallback(() => {
        if (!isOwner) return
        setIsEditingProfile(true)
        setActiveSection('overview')
    }, [isOwner])

    const openPost = useCallback((post: PostItem) => {
        addWindow({
            key: `post-${post.slug}`,
            path: toPostPath(post.slug),
            title: post.title,
        })
    }, [addWindow])

    const openNodeEditor = useCallback((node: NodeDoc) => {
        addWindow({
            key: `node-${node.id}`,
            title: node.title || 'Untitled Node',
            path: '/write',
            icon: <FileText className="size-4" />,
            props: { nodeId: node.id, isCanvas: true, readOnly: !isOwner },
        })
    }, [addWindow, isOwner])

    const handleAddNode = useCallback(async () => {
        if (!isOwner || !profile?.id) return

        const { data, error } = await supabase
            .from('nodes')
            .insert({ author_id: profile.id, title: 'Untitled Node', content: '', status: 'draft' })
            .select('id')
            .single()

        if (error || !data) {
            addToast('failed to create node', 'error')
            return
        }

        addWindow({
            key: `node-${data.id}`,
            title: 'Untitled Node',
            path: '/write',
            icon: <FileText className="size-4" />,
            props: { nodeId: data.id, isCanvas: true },
        })
    }, [addToast, addWindow, isOwner, profile?.id])

    const handleDeleteNode = useCallback(async (node: NodeDoc) => {
        if (!isOwner) return
        if (!window.confirm(`delete node "${node.title || 'untitled node'}"?`)) return

        const { error } = await supabase.from('nodes').delete().eq('id', node.id)
        if (error) {
            addToast(`failed to delete node: ${error.message}`, 'error')
            return
        }

        setNodes((prev) => prev.filter((item) => item.id !== node.id))
        addToast('node deleted', 'success')
    }, [addToast, isOwner])

    const handleAddPost = useCallback(() => {
        if (!isOwner) return
        addWindow({
            key: `post-new-${Date.now()}`,
            title: 'Untitled Post',
            path: '/write-post',
            icon: <BookOpen className="size-4" />,
        })
    }, [addWindow, isOwner])

    const handleOpenPost = useCallback((post: PostItem) => {
        openPost(post)
    }, [openPost])

    const handleEditPost = useCallback((post: PostItem) => {
        if (!isOwner) return
        addWindow({
            key: `post-editor-${post.id}`,
            title: post.title || 'Untitled Post',
            path: '/write-post',
            icon: <BookOpen className="size-4" />,
            props: { postId: post.id },
        })
    }, [addWindow, isOwner])

    const openNodeView = useCallback((node: NodeDoc) => {
        addWindow({
            key: `node-view-${node.id}`,
            title: node.title || 'Untitled Node',
            path: `/node/${node.id}`,
            icon: <FileText className="size-4" />,
            props: { nodeId: node.id, readOnly: true },
        })
    }, [addWindow])

    const handleDeletePost = useCallback(async (post: PostItem) => {
        if (!isOwner) return
        if (!window.confirm(`delete post "${post.title || 'untitled post'}"?`)) return

        const { error } = await supabase.from('posts').delete().eq('id', post.id)
        if (error) {
            addToast(`failed to delete post: ${error.message}`, 'error')
            return
        }

        setPosts((prev) => prev.filter((item) => item.id !== post.id))
        addToast('post deleted', 'success')
    }, [addToast, isOwner])

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
            setForm(data as Partial<ProfileData>)
        } else {
            setProfile(null)
        }
    }, [normalizedUsername])

    const loadNodes = useCallback(async (profileId: string) => {
        setNodesLoading(true)

        const { data, error } = await supabase
            .from('nodes')
            .select('id, title, content, updated_at, status')
            .eq('author_id', profileId)
            .order('updated_at', { ascending: false })

        if (!error && data) {
            setNodes(data.map((row) => ({
                id: row.id as string,
                title: row.title || 'Untitled',
                updated: relativeTime(row.updated_at),
                preview: (row.content || '').slice(0, 400),
                status: (row.status as 'published' | 'draft') || 'draft',
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
            .select('id, title, slug, excerpt, image_url, created_at, published, is_approved')
            .ilike('author', normalizedUsername)
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

    useEffect(() => {
        const loadSavedPosts = async () => {
            if (!isOwner || !user?.id) {
                setSavedPosts([])
                return
            }

            setSavedPostsLoading(true)

            const { data, error } = await supabase
                .from('user_saved_posts')
                .select('post_slug, post_title, saved_at')
                .eq('user_id', user.id)
                .order('saved_at', { ascending: false })

            if (!error && data) {
                setSavedPosts(data as SavedPostItem[])
            } else {
                setSavedPosts([])
            }

            setSavedPostsLoading(false)
        }

        void loadSavedPosts()
    }, [isOwner, user?.id])

    useEffect(() => {
        setSidebarOpen(!isMobile)
    }, [isMobile])

    const handleSaveProfile = useCallback(async () => {
        setUpdatingProfile(true)
        const success = await updateProfile(form)

        if (success) {
            setProfile((prev) => prev ? ({ ...prev, ...form } as ProfileData) : prev)
            setIsEditingProfile(false)
            addToast('profile updated successfully', 'success')
        } else {
            addToast('failed to update profile', 'error')
        }

        setUpdatingProfile(false)
    }, [addToast, form, updateProfile])

    const hasProfileChanges =
        (form.avatar_url || '') !== (profile?.avatar_url || '') ||
        (form.cover_url || '') !== (profile?.cover_url || '') ||
        (form.bio || '') !== (profile?.bio || '') ||
        (form.website || '') !== (profile?.website || '') ||
        (form.github || '') !== (profile?.github || '') ||
        (form.linkedin || '') !== (profile?.linkedin || '') ||
        (form.twitter || '') !== (profile?.twitter || '') ||
        (form.location || '') !== (profile?.location || '') ||
        (form.pronouns || '') !== (profile?.pronouns || '')

    const filteredNodes = nodes.filter((node) => {
        if (!isOwner) return node.status === 'published'
        if (activeSection === 'nodes-published') return node.status === 'published'
        if (activeSection === 'nodes-drafts') return node.status === 'draft'
        return true
    })

    const filteredPosts = posts.filter((post) => {
        if (!isOwner) return post.published
        if (activeSection === 'posts-published') return post.published
        if (activeSection === 'posts-drafts') return !post.published
        return true
    })

    const publishedNodeCount = nodes.filter((node) => node.status === 'published').length
    const draftNodeCount = nodes.filter((node) => node.status === 'draft').length
    const publishedPostCount = posts.filter((post) => post.published).length
    const draftPostCount = posts.filter((post) => !post.published).length
    const savedPostCount = savedPosts.length

    const tableRows = [
        { field: 'name', value: displayName },
        { field: 'username', value: `@${displayName}` },
        { field: 'role', value: profile?.role || 'member' },
        { field: 'location', value: profile?.location || profile?.pronouns || 'not set' },
        { field: 'posts', value: `${isOwner ? posts.length : publishedPostCount} ${isOwner ? 'total' : 'published'}` },
        { field: 'nodes', value: `${isOwner ? nodes.length : publishedNodeCount} ${isOwner ? 'total' : 'published'}` },
    ]

    const showNodesSection = !isEditingProfile && (!isOwner || activeSection === 'overview' || activeSection.startsWith('nodes-'))
    const showPostsSection = !isEditingProfile && (!isOwner || activeSection === 'overview' || activeSection.startsWith('posts-'))
    const showSavedPostsSection = isOwner && !isEditingProfile && activeSection === 'saved-posts'
    const nodeSectionLabel = !isOwner
        ? 'published nodes'
        : activeSection === 'nodes-published'
            ? 'published nodes'
            : activeSection === 'nodes-drafts'
                ? 'draft nodes'
                : 'all nodes'
    const postSectionLabel = !isOwner
        ? 'published posts'
        : activeSection === 'posts-published'
            ? 'published posts'
            : activeSection === 'posts-drafts'
                ? 'draft posts'
                : 'all posts'

    if (loading) {
        return <Loading fullScreen label="loading profile" />
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
        <div className="corpus-root flex flex-col size-full bg-[#fafcfc] dark:bg-primary text-primary font-sans overflow-hidden">
            <div
                data-scheme="tertiary"
                className="flex w-auto mx-1 mt-1 items-center px-1.5 py-0.5 select-none gap-2 justify-between bg-primary border border-primary rounded-md shrink-0 z-10 h-10 overflow-x-auto custom-scrollbar no-scrollbar-on-mobile"
            >
                <div className="flex items-center gap-1 flex-shrink-0">
                    {isOwner && (
                        <Tooltip
                            trigger={
                                <OSButton size="sm" onClick={() => setSidebarOpen((prev) => !prev)} active={sidebarOpen} className="p-1 h-8 w-8 !rounded-md">
                                    {sidebarOpen ? <IconSidebarOpen className="size-[18px]" /> : <IconSidebarClose className="size-[18px]" />}
                                </OSButton>
                            }
                            side="bottom"
                        >
                            {sidebarOpen ? 'hide' : 'show'} sidebar
                        </Tooltip>
                    )}

                    <div className="hidden sm:flex items-center gap-0.5">
                        <OSButton size="sm" onClick={goBack} disabled={!canGoBack} className="p-1 h-8 w-8 !rounded-md">
                            <IconChevronLeft className={`size-[18px] ${canGoBack ? 'opacity-100' : 'opacity-30'}`} />
                        </OSButton>
                        <OSButton size="sm" onClick={goForward} disabled={!canGoForward} className="p-1 h-8 w-8 !rounded-md">
                            <IconChevronRight className={`size-[18px] ${canGoForward ? 'opacity-100' : 'opacity-30'}`} />
                        </OSButton>
                    </div>

                    <div className="hidden sm:block w-px h-5 bg-black/20 dark:bg-white/20 mx-1 flex-shrink-0" />

                    {!isOwner && (
                        <div className="flex items-center gap-1.5 ml-1 min-w-0">
                            {profile.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={profile.avatar_url} alt={displayName} className="size-5 rounded-full object-cover border border-primary/20 shrink-0" />
                            ) : (
                                <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                    <span className="text-[9px] font-black text-primary/60">{displayName.charAt(0).toUpperCase()}</span>
                                </div>
                            )}
                            <h1 className="text-[13px] font-bold tracking-tight text-primary leading-none m-0 whitespace-nowrap">{displayName}&apos;s profile</h1>
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/30 border border-primary/15 px-1.5 py-0.5 rounded hidden sm:inline">public</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 justify-end flex-shrink-0">
                    {isOwner && !isEditingProfile && (
                        <>
                            <div className="hidden sm:block w-px h-5 bg-black/20 dark:bg-white/20 mx-1 flex-shrink-0" />
                            <Tooltip trigger={<OSButton size="sm" className="px-2.5 h-8 !rounded-md flex items-center gap-1.5" onClick={handleAddNode}><IconPlus className="size-[14px] opacity-70" /><span className="hidden md:inline text-[12px] font-semibold">new node</span></OSButton>} side="bottom">new node</Tooltip>
                            <Tooltip trigger={<OSButton size="sm" className="px-2.5 h-8 !rounded-md flex items-center gap-1.5" onClick={handleAddPost}><BookOpen className="size-[14px] opacity-70" /><span className="hidden md:inline text-[12px] font-semibold">new post</span></OSButton>} side="bottom">new post</Tooltip>
                            <Tooltip trigger={<OSButton size="sm" className="px-2.5 h-8 !rounded-md flex items-center gap-1.5" onClick={openProfileEditor}><PenLine className="size-[14px] opacity-70" /><span className="hidden md:inline text-[12px] font-semibold">edit profile</span></OSButton>} side="bottom">edit profile</Tooltip>
                        </>
                    )}
                    <div className="hidden sm:block w-px h-5 bg-black/20 dark:bg-white/20 mx-1 flex-shrink-0" />
                    <Tooltip trigger={<OSButton size="sm" className="p-1.5 h-8 w-8 !rounded" onClick={refreshAll}><RefreshCw className={`size-[16px] opacity-70 ${refreshing ? 'animate-spin' : ''}`} /></OSButton>} side="bottom">refresh profile</Tooltip>
                    <Tooltip trigger={<OSButton size="sm" className="p-1.5 h-8 w-8 !rounded" onClick={() => copyLink(publicProfilePath, 'profile')}><Share className="size-[16px] opacity-70" /></OSButton>} side="bottom">share profile</Tooltip>
                    {profile.website && (
                        <Tooltip trigger={<a href={profile.website} target="_blank" rel="noopener noreferrer"><OSButton size="sm" className="p-1.5 h-8 w-8 !rounded"><ExternalLink className="size-[16px] opacity-70" /></OSButton></a>} side="bottom">website</Tooltip>
                    )}
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden relative bg-[#fafcfc] dark:bg-primary">
                {isOwner && (
                    <div className={`shrink-0 flex flex-col border-r border-primary/5 bg-[#fafcfc] dark:bg-black/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full absolute h-full pointer-events-none'}`}>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 min-w-[256px]">
                            <button className="flex items-center gap-2 w-full hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                                <div className="size-6 overflow-hidden rounded bg-primary/10 flex items-center justify-center shrink-0 shadow-sm border border-primary/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {profile.avatar_url ? <img src={profile.avatar_url} alt={displayName} className="size-full object-cover" /> : <span className="text-xs font-black text-primary">{displayName.charAt(0).toUpperCase()}</span>}
                                </div>
                                <span className="text-sm font-bold flex-1 text-left truncate lowercase">my profile</span>
                                <PanelsTopLeft className="size-4 text-primary/40" />
                            </button>

                            <div className="space-y-1">
                                {!isEditingProfile ? (
                                    <>
                                        <OSButton size="sm" className="w-full !h-9 !rounded-md !px-2.5 flex items-center justify-start gap-2" onClick={handleAddNode}>
                                            <IconPlus className="size-[14px] opacity-70" />
                                            <span className="text-[12px] font-semibold">new node</span>
                                        </OSButton>
                                        <OSButton size="sm" className="w-full !h-9 !rounded-md !px-2.5 flex items-center justify-start gap-2" onClick={handleAddPost}>
                                            <BookOpen className="size-[14px] opacity-70" />
                                            <span className="text-[12px] font-semibold">new post</span>
                                        </OSButton>
                                        <OSButton size="sm" className="w-full !h-9 !rounded-md !px-2.5 flex items-center justify-start gap-2" onClick={openProfileEditor}>
                                            <PenLine className="size-[14px] opacity-70" />
                                            <span className="text-[12px] font-semibold">edit profile</span>
                                        </OSButton>
                                    </>
                                ) : (
                                    <div className="rounded-lg border border-primary/10 bg-black/5 dark:bg-white/5 px-2.5 py-2 text-[11px] font-bold lowercase text-primary/60">
                                        editing profile… save and cancel are below
                                    </div>
                                )}
                            </div>

                            <div className="space-y-0.5">
                                {[
                                    { key: 'overview', label: 'overview', icon: <PanelsTopLeft className="size-4 opacity-80" />, count: null },
                                    { key: 'nodes-all', label: 'all nodes', icon: <Layers className="size-4 opacity-80" />, count: nodes.length },
                                    { key: 'nodes-published', label: 'published nodes', icon: <BookOpen className="size-4 opacity-80" />, count: publishedNodeCount },
                                    { key: 'nodes-drafts', label: 'draft nodes', icon: <PenLine className="size-4 opacity-80" />, count: draftNodeCount },
                                    { key: 'posts-all', label: 'all posts', icon: <ArrowUpRight className="size-4 opacity-80" />, count: posts.length },
                                    { key: 'posts-published', label: 'published posts', icon: <BookOpen className="size-4 opacity-80" />, count: publishedPostCount },
                                    { key: 'posts-drafts', label: 'draft posts', icon: <PenLine className="size-4 opacity-80" />, count: draftPostCount },
                                    { key: 'saved-posts', label: 'saved posts', icon: <IconBookmark className="size-4 opacity-80" />, count: savedPostCount },
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => {
                                            setIsEditingProfile(false)
                                            setActiveSection(item.key as typeof activeSection)
                                        }}
                                        className={`flex items-center gap-2.5 w-full p-1.5 px-2.5 rounded-lg transition-colors font-medium text-[13px] ${activeSection === item.key ? 'bg-black/5 dark:bg-white/10 text-primary font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5 text-primary/70 hover:text-primary'}`}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                        {item.count !== null && <span className="ml-auto text-[11px] font-black opacity-40">{item.count}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fafcfc] dark:bg-primary">
                    <div className="corpus-nodes-wrapper" style={{ marginTop: 'clamp(0.5rem, 2vw, 1.5rem)' }}>
                        <div className="corpus-profile-slot">
                            <div className="corpus-profile-stack">
                                <div className="corpus-profile-visual corpus-profile-cardShadow">
                                    <div className="corpus-profile-cover">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {(isEditingProfile ? form.cover_url : profile.cover_url) ? <img src={(isEditingProfile ? form.cover_url : profile.cover_url) || ''} alt="cover" /> : <div className="corpus-profile-coverEmpty" />}
                                    </div>
                                    <div className="corpus-profile-avatar">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {(isEditingProfile ? form.avatar_url : profile.avatar_url) ? <img src={(isEditingProfile ? form.avatar_url : profile.avatar_url) || ''} alt={displayName} /> : <IconUser className="size-5 text-primary/30" />}
                                    </div>
                                </div>

                                <div className="corpus-profile-layerStack">
                                    <div className="corpus-profile-tableCard corpus-profile-cardShadow">
                                        <div className="corpus-profile-cardHeading">
                                            {isEditingProfile ? <PenLine className="size-4" /> : <PanelsTopLeft className="size-4" />}
                                            <span>{isEditingProfile ? 'profile editor' : 'profile'}</span>
                                            <span className="corpus-badge" style={{ marginLeft: 'auto' }}>
                                                <span>{isEditingProfile ? (hasProfileChanges ? 'unsaved' : 'synced') : 'public'}</span>
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
                                                    {isEditingProfile ? (
                                                        <>
                                                            <tr><td>username</td><td><span style={{ opacity: 0.55 }}>@{profile.username || 'anonymous'}</span></td></tr>
                                                            <tr><td>pronouns</td><td><input type="text" value={form.pronouns || ''} onChange={(e) => setForm({ ...form, pronouns: e.target.value })} placeholder="she/her" className="w-full bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30" /></td></tr>
                                                            <tr><td>location</td><td><input type="text" value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="istanbul, TR" className="w-full bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30" /></td></tr>
                                                            <tr><td>website</td><td><input type="text" value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://your-site.com" className="w-full bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30" /></td></tr>
                                                            <tr><td>github</td><td><input type="text" value={form.github || ''} onChange={(e) => setForm({ ...form, github: e.target.value })} placeholder="https://github.com/username" className="w-full bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30" /></td></tr>
                                                            <tr><td>linkedin</td><td><input type="text" value={form.linkedin || ''} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/in/username" className="w-full bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30" /></td></tr>
                                                            <tr><td>twitter</td><td><input type="text" value={form.twitter || ''} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="https://x.com/username" className="w-full bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30" /></td></tr>
                                                            <tr><td>avatar</td><td><input type="text" value={form.avatar_url || ''} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://example.com/photo.png" className="w-full bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30" /></td></tr>
                                                            <tr><td>cover</td><td><input type="text" value={form.cover_url || ''} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://example.com/cover.jpg" className="w-full bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30" /></td></tr>
                                                        </>
                                                    ) : (
                                                        tableRows.map((row) => (
                                                            <tr key={row.field}>
                                                                <td>{row.field}</td>
                                                                <td>{row.value}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="corpus-profile-meta">
                                            {isEditingProfile ? (
                                                <div>
                                                    <textarea
                                                        value={form.bio || ''}
                                                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                                                        placeholder="tell people what you build, write, or care about"
                                                        rows={4}
                                                        className="w-full resize-none bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30"
                                                        style={{ margin: 0, lineHeight: 1.6, padding: '0.75rem' }}
                                                    />
                                                    <div className="flex items-center justify-end gap-2 px-3 py-3 border-t border-primary/10">
                                                        <OSButton type="button" variant="underlineOnHover" size="sm" onClick={() => setIsEditingProfile(false)}>cancel</OSButton>
                                                        <OSButton type="button" variant="primary" size="sm" onClick={handleSaveProfile} disabled={updatingProfile || !hasProfileChanges}>
                                                            {updatingProfile ? 'saving...' : 'save profile'}
                                                        </OSButton>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, padding: '0.75rem' }}>
                                                    {profile.bio ? <span style={{ opacity: 0.8 }}>{profile.bio}</span> : <span style={{ opacity: 0.35, fontStyle: 'italic' }}>no bio yet</span>}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {showNodesSection && (
                            <div className="corpus-doc-grid-wrapper">
                                <div className="corpus-doc-tabs">
                                    <button className="corpus-doc-tab corpus-doc-tab--active">{nodeSectionLabel} <span>{filteredNodes.length}</span></button>
                                </div>
                                {nodesLoading ? (
                                    <div className="corpus-doc-empty"><RefreshCw className="size-6 animate-spin" style={{ opacity: 0.3 }} /><p>loading nodes...</p></div>
                                ) : filteredNodes.length > 0 ? (
                                    <div className="corpus-doc-grid">
                                        {filteredNodes.map((node) => (
                                            <article key={node.id} className="corpus-doc-card relative cursor-pointer" onClick={() => openNodeView(node)}>
                                                {isOwner && (
                                                    <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                openNodeEditor(node)
                                                            }}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/10 bg-white/80 text-primary/60 backdrop-blur hover:text-primary"
                                                            aria-label={`edit ${node.title}`}
                                                            title="edit node"
                                                        >
                                                            <PenLine className="size-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                void handleDeleteNode(node)
                                                            }}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/10 bg-white/80 text-primary/60 backdrop-blur hover:text-red-600"
                                                            aria-label={`delete ${node.title}`}
                                                            title="delete node"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="corpus-doc-media">
                                                    <div className="corpus-doc-preview-text">{node.preview}</div>
                                                    <div className="corpus-doc-media-fade" />
                                                    <div className="corpus-doc-badge"><BookOpen className="size-3" /><span>{node.status === 'draft' ? 'draft' : 'pub'}</span></div>
                                                </div>
                                                <div className="corpus-doc-info">
                                                    <div><FileText className="size-3.5" /><span>{node.updated}</span></div>
                                                    <h3>{node.title}</h3>
                                                    <p>{isOwner ? `click to edit • ${node.status}` : 'published node'}</p>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="corpus-doc-empty"><BookOpen className="size-8" style={{ opacity: 0.2 }} /><p>no {nodeSectionLabel.replace('nodes', '').trim() || 'published'} nodes yet</p></div>
                                )}
                            </div>
                        )}

                        {showPostsSection && (
                            <div className="corpus-doc-grid-wrapper">
                                <div className="corpus-doc-tabs">
                                    <button className="corpus-doc-tab corpus-doc-tab--active">{postSectionLabel} <span>{filteredPosts.length}</span></button>
                                </div>
                                {postsLoading ? (
                                    <div className="corpus-doc-empty"><RefreshCw className="size-6 animate-spin" style={{ opacity: 0.3 }} /><p>loading posts...</p></div>
                                ) : filteredPosts.length > 0 ? (
                                    <div className="corpus-doc-grid">
                                        {filteredPosts.map((post) => (
                                            <article key={post.id} className={`corpus-doc-card relative ${isOwner ? 'cursor-pointer' : ''}`} onClick={() => handleOpenPost(post)}>
                                                {isOwner && (
                                                    <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleEditPost(post)
                                                            }}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/10 bg-white/80 text-primary/60 backdrop-blur hover:text-primary"
                                                            aria-label={`edit ${post.title}`}
                                                            title="edit post"
                                                        >
                                                            <PenLine className="size-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                void handleDeletePost(post)
                                                            }}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/10 bg-white/80 text-primary/60 backdrop-blur hover:text-red-600"
                                                            aria-label={`delete ${post.title}`}
                                                            title="delete post"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="corpus-doc-media">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    {post.image_url ? <img src={post.image_url} alt={post.title} className="size-full object-cover" /> : <div className="corpus-doc-preview-text">{post.excerpt || 'open the full post to read more'}</div>}
                                                    <div className="corpus-doc-media-fade" />
                                                    <div className="corpus-doc-badge"><ArrowUpRight className="size-3" /><span>{post.published ? (post.is_approved ? 'post' : 'pending') : 'draft'}</span></div>
                                                </div>
                                                <div className="corpus-doc-info">
                                                    <div><BookOpen className="size-3.5" /><span>{relativeTime(post.created_at)}</span></div>
                                                    <h3>{post.title}</h3>
                                                    <p>{isOwner ? 'click to edit' : 'open post'}</p>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="corpus-doc-empty"><BookOpen className="size-8" style={{ opacity: 0.2 }} /><p>no {postSectionLabel.replace('posts', '').trim() || 'published'} posts yet</p></div>
                                )}
                            </div>
                        )}

                        {showSavedPostsSection && (
                            <div className="corpus-doc-grid-wrapper">
                                <div className="corpus-doc-tabs">
                                    <button className="corpus-doc-tab corpus-doc-tab--active">saved posts <span>{savedPostCount}</span></button>
                                </div>
                                {savedPostsLoading ? (
                                    <div className="corpus-doc-empty"><RefreshCw className="size-6 animate-spin" style={{ opacity: 0.3 }} /><p>loading saved posts...</p></div>
                                ) : savedPosts.length > 0 ? (
                                    <div className="corpus-doc-grid">
                                        {savedPosts.map((savedPost) => (
                                            <article
                                                key={`${savedPost.post_slug}-${savedPost.saved_at}`}
                                                className="corpus-doc-card cursor-pointer"
                                                onClick={() => openPost({ id: savedPost.post_slug, title: savedPost.post_title || savedPost.post_slug, slug: savedPost.post_slug, created_at: savedPost.saved_at, published: true, is_approved: true })}
                                            >
                                                <div className="corpus-doc-media">
                                                    <div className="corpus-doc-preview-text">{savedPost.post_title || savedPost.post_slug}</div>
                                                    <div className="corpus-doc-media-fade" />
                                                    <div className="corpus-doc-badge"><IconBookmark className="size-3" /><span>saved</span></div>
                                                </div>
                                                <div className="corpus-doc-info">
                                                    <div><BookOpen className="size-3.5" /><span>{relativeTime(savedPost.saved_at)}</span></div>
                                                    <h3>{savedPost.post_title || savedPost.post_slug}</h3>
                                                    <p>open saved post</p>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="corpus-doc-empty"><IconBookmark className="size-8" style={{ opacity: 0.2 }} /><p>no saved posts yet</p></div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
