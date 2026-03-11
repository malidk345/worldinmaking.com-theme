"use client"

import React, { useEffect, useState } from 'react'
import ForumPageLayout from 'components/Forum/ForumPageLayout'
import ForumQuestionDetail from 'components/Forum/ForumQuestionDetail'
import AdminPanel from 'components/AdminPanel'
import { WindowSearchUI } from 'components/Search/SearchUI'
import { usePosts } from '../../hooks/usePosts'
import { useCommunity } from '../../hooks/useCommunity'
import BlogPostView from 'components/ReaderView/BlogPostView'
import ReaderView from 'components/ReaderView'
import PublicProfile from 'components/Profile/PublicProfile'
import PostsView from 'components/Posts'
import RichTextEditor from 'components/AdminPanel/RichTextEditor'
import { AppWindow } from '../../context/Window'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { Share, Image as ImageIcon, Palette, Hash, CheckCircle, ChevronDown, FileText, Flame, Rocket, Lightbulb, PenTool, Brain, Wrench, Sparkles, LayoutTemplate, Database, CalendarHeart } from 'lucide-react'
import OSButton from 'components/OSButton'
import { Popover } from 'components/RadixUI/Popover'
import { sanitizeHtml, toSlug } from '../../utils/security'

interface AdaptablePost {
    id: number | string
    title: string
    content?: string
    created_at: string
    author_id?: string | number
    profiles?: { username?: string; avatar_url?: string } | { username?: string; avatar_url?: string }[]
    _count?: { likes?: number }
    total_votes?: number
}

const adaptPost = (p: AdaptablePost) => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
    return {
        id: p.id,
        permalink: p.id.toString(),
        subject: p.title,
        body: p.content || '',
        createdAt: p.created_at,
        profile: {
            id: p.author_id || 0,
            firstName: profile?.username || 'anonymous',
            lastName: '',
            avatar: profile?.avatar_url || null,
        },
        replies: [],
        topics: [],
        pinnedTopics: [],
        resolved: false,
        archived: false,
        upvotes: p.total_votes ?? p._count?.likes ?? 0,
        userVote: 0,
    }
}

/**
 * Routes window content based on item.path.
 * This replaces item.element so every window gets proper React content.
 */
function WindowRouterInner({ item }: { item: AppWindow }) {
    const rawPath: string = item.path || ''
    const path: string = rawPath.replace(/\/+$/, '') || '/'

    // /questions/topic/:slug
    const topicMatch = path.match(/^\/questions\/topic\/([^/]+)/)
    if (topicMatch) {
        return <CommunityTopicRouteView slug={topicMatch[1]} />
    }

    // /questions/:permalink
    const permalinkMatch = path.match(/^\/questions\/([^/]+)/)
    if (permalinkMatch) {
        return <CommunityQuestionRouteView permalink={permalinkMatch[1]} />
    }
    // /questions
    if (path === '/questions') {
        return <CommunityMainRouteView />
    }

    // /u/:username (legacy alias for profile)
    const corpusMatch = path.match(/^\/u\/([^/]+)/)
    if (corpusMatch) {
        return <PublicProfile username={corpusMatch[1]} />
    }

    // /posts or /blog
    if (path === '/posts' || path === '/blog') {
        return <PostsView />
    }

    // /posts/:slug or /blog/:slug — fetch from Supabase via usePosts
    // Supporting both /posts/ and /blog/ for backward compatibility/flexibility
    const blogMatch = path.match(/^\/(blog|posts)\/([^/]+)/)
    if (blogMatch) {
        return <BlogRouteView slug={blogMatch[2]} />
    }

    // /search
    if (path === '/search') {
        const initialFilter = item.props?.initialFilter as string | undefined
        return <WindowSearchUI initialFilter={initialFilter} />
    }

    // /profile/:username
    const profileMatch = path.match(/^\/profile\/([^/]+)/)
    if (profileMatch) {
        return <PublicProfile username={profileMatch[1]} />
    }

    // /admin
    if (path === '/admin') {
        return <AdminPanel item={item} />
    }

    // /node/:id (Published Read-Only Node View)
    const nodeMatch = path.match(/^\/node\/([^/]+)/)
    if (nodeMatch) {
         return <NodePublishedRouteView nodeId={nodeMatch[1]} />
    }

    // /write (New Node / Canvas Experience)
    if (path === '/write') {
        return <WriteRouteView nodeId={item.props?.nodeId as string | undefined} item={item} readOnly={Boolean(item.props?.readOnly)} />
    }

    // /write-post (User Post Editor)
    if (path === '/write-post') {
        return <WritePostRouteView postId={item.props?.postId as string | undefined} item={item} />
    }

    // Fallback for any other path
    if (item.element && typeof item.element === 'object' && React.isValidElement(item.element)) {
        return <>{item.element}</>
    }

    return <div className="p-8 text-primary lowercase">content for {item.key}</div>
}


function CommunityMainRouteView() {
    const { channels, posts, loading, fetchPosts, createPost } = useCommunity()
    const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null)

    useEffect(() => {
        if (channels.length > 0 && !selectedChannelId) {
            setSelectedChannelId(channels[0].id)
        }
    }, [channels, selectedChannelId])

    useEffect(() => {
        if (selectedChannelId) {
            fetchPosts(selectedChannelId)
        }
    }, [selectedChannelId, fetchPosts])

    const handleCreatePost = (data: { subject: string; body: string }) => {
        if (selectedChannelId) createPost(selectedChannelId, data.subject, data.body)
    }

    return (
        <ForumPageLayout
            questions={posts.map(adaptPost)}
            loading={loading}
            activeChannelId={selectedChannelId}
            onChannelChange={setSelectedChannelId}
            onSubmit={handleCreatePost}
        />
    )
}

function CommunityTopicRouteView({ slug }: { slug: string }) {
    const { posts, loading, fetchPosts } = useCommunity()

    useEffect(() => {
        if (slug) fetchPosts(undefined, slug)
    }, [slug, fetchPosts])

    return (
        <ForumPageLayout
            questions={posts.map(adaptPost)}
            loading={loading}
        />
    )
}

import Loading from 'components/Loading'

function CommunityQuestionRouteView({ permalink }: { permalink: string }) {
    const { posts, loading, fetchPosts } = useCommunity()

    useEffect(() => {
        if (permalink) {
            fetchPosts(undefined, undefined, permalink)
        }
    }, [fetchPosts, permalink])

    const post = posts.find((p) => p.id.toString() === permalink)

    if (loading && !post) {
        return <Loading label="syncing discussion" />
    }

    if (!post) {
        return (
            <div className="p-8 text-center text-primary lowercase">
                <h2 className="text-lg font-black">node not found</h2>
                <p className="opacity-40 mt-2">the discussion thread could not be located.</p>
            </div>
        )
    }

    return <ForumQuestionDetail question={adaptPost(post)} />
}

/** Separate component so usePosts hook can be called within the router */
function BlogRouteView({ slug }: { slug: string }) {
    const { posts, loading } = usePosts()
    const post = posts.find((p) => p.slug === slug || p.slug === `/blog/${slug}`)

    if (loading && posts.length === 0) {
        return <Loading fullScreen label="fetching node" />
    }

    if (!post) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-lg font-bold text-primary">post not found</h2>
                <p className="text-secondary text-sm mt-2">The post &quot;{slug}&quot; doesn&apos;t exist.</p>
            </div>
        )
    }

    return (
        <BlogPostView
            post={post}
        />
    )
}

/** Node published route view */
function NodePublishedRouteView({ nodeId }: { nodeId: string }) {
    const [title, setTitle] = useState('fetching node...')
    const [content, setContent] = useState('')
    const [author, setAuthor] = useState<{username: string, avatar_url: string}|null>(null)
    const [date, setDate] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!nodeId) return
        const load = async () => {
            const { data } = await supabase
                .from('nodes')
                .select(`
                    title, 
                    content, 
                    updated_at,
                    profiles:author_id ( username, avatar_url )
                `)
                .eq('id', nodeId)
                .single()
            
            if (data) {
                setTitle(data.title || 'untitled node')
                setContent(data.content || '')
                setDate(data.updated_at)
                const profiles = data.profiles as { username: string; avatar_url: string } | { username: string; avatar_url: string }[] | null
                if (profiles && !Array.isArray(profiles)) {
                    setAuthor(profiles)
                } else if (Array.isArray(profiles)) {
                    setAuthor(profiles[0])
                }
            } else {
                setTitle('node not found')
            }
            setLoading(false)
        }
        load()
    }, [nodeId])

    if (loading) {
        return <Loading fullScreen label="loading node..." />
    }

    const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0
    const readTime = Math.max(1, Math.ceil(wordCount / 200))

    const body = {
        type: 'plain' as const,
        content: content,
        date: date,
        contributors: author ? [{ 
            name: author.username || 'anonymous', 
            image: author.avatar_url, 
            username: author.username 
        }] : [],
        tags: [{ label: 'node' }],
        wordCount,
        readTime
    }

    return (
        <ReaderView
            title={title}
            body={body}
            showQuestions={true}
            commentThreadSlug={`node-${nodeId}`}
        >
            <div className="prose prose-sm sm:prose-base max-w-none text-primary dark:prose-invert node-canvas-preview" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
        </ReaderView>
    )
}

/** Node editor route view */
function WriteRouteView({ nodeId, item, readOnly = false }: { nodeId?: string; item: AppWindow; readOnly?: boolean }) {
    const { user } = useAuth()
    const { addToast } = useToast()
    const [title, setTitle] = useState('untitled node')
    const [content, setContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [nodeStatus, setNodeStatus] = useState<'draft' | 'published'>('draft')

    const [coverImage, setCoverImage] = useState<string | null>(null)
    const [iconIndex] = useState<number>(0)
    const [theme, setTheme] = useState<'default' | 'yellow' | 'green' | 'blue'>('default')
    const [nodeType, setNodeType] = useState<'canvas' | 'list' | 'journal'>('canvas')
    const [, setTags] = useState<string[]>([])

    // Load existing node from Supabase when nodeId is provided
    useEffect(() => {
        if (!nodeId) return
        const load = async () => {
            const { data } = await supabase
                .from('nodes')
                .select('title, content, status')
                .eq('id', nodeId)
                .single()
            if (data) {
                setTitle(data.title || 'untitled node')
                setContent(data.content || '')
                setNodeStatus((data.status as 'draft' | 'published') || 'draft')
            }
        }
        load()
    }, [nodeId])

    const handleSave = async (publishStatus: 'draft' | 'published' = 'draft') => {
        if (!nodeId) {
            addToast('no node id — open from my profile to edit', 'error')
            return
        }
        if (!user) {
            addToast('you must be logged in to save', 'error')
            return
        }
        setSaving(true)
        const { error } = await supabase
            .from('nodes')
            .update({ title, content, status: publishStatus, updated_at: new Date().toISOString() })
            .eq('id', nodeId)
        if (error) {
            addToast('failed to save: ' + error.message, 'error')
        } else {
            setNodeStatus(publishStatus)
            setSaved(true)
            addToast(publishStatus === 'published' ? 'node published!' : 'draft saved', 'success')
            setTimeout(() => setSaved(false), 2500)
        }
        setSaving(false)
    }

    const themeClasses = {
        'default': 'bg-[#fafcfc] dark:bg-primary/5',
        'yellow': 'bg-amber-50 dark:bg-amber-950/20',
        'green': 'bg-emerald-50 dark:bg-emerald-950/20',
        'blue': 'bg-sky-50 dark:bg-sky-950/20',
    }

    const statusConfig = {
        'draft': { label: 'draft', icon: <PenTool className="size-3" />, color: 'text-primary' },
        'published': { label: 'published', icon: <CheckCircle className="size-3" />, color: 'text-emerald-500' },
    }

    const typeConfig = {
        'canvas': { label: 'canvas', icon: <LayoutTemplate className="size-3.5 text-blue-500" /> },
        'list': { label: 'data list', icon: <Database className="size-3.5 text-purple-500" /> },
        'journal': { label: 'journal', icon: <CalendarHeart className="size-3.5 text-rose-500" /> },
    }

    const ICONS = [
        { IconNode: FileText, color: "text-blue-500" },
        { IconNode: Flame, color: "text-orange-500" },
        { IconNode: Rocket, color: "text-purple-500" },
        { IconNode: Lightbulb, color: "text-yellow-500" },
        { IconNode: PenTool, color: "text-pink-500" },
        { IconNode: Brain, color: "text-rose-500" },
        { IconNode: Wrench, color: "text-slate-500" },
        { IconNode: Sparkles, color: "text-amber-400" },
    ]

    if (readOnly) {
        return (
            <div className={`flex flex-col size-full overflow-hidden text-black transition-colors duration-500 ${themeClasses[theme]}`}>
                <aside className="sticky top-0 z-50 shrink-0">
                    <div data-scheme="tertiary" className="mx-1 mt-1 flex items-center justify-between gap-3 rounded-md border border-primary bg-primary px-3 py-1.5">
                        <div className="flex items-center gap-2 lowercase text-primary/70 text-sm font-semibold">
                            {statusConfig[nodeStatus].icon}
                            <span>{statusConfig[nodeStatus].label} node</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <OSButton size="sm" onClick={() => navigator.clipboard.writeText(window.location.href).then(() => addToast('node link copied', 'success')).catch(() => addToast('failed to copy node link', 'error'))}>
                                <div className="flex items-center gap-1.5 lowercase">
                                    <Share className="size-4" />
                                    <span className="hidden md:inline font-semibold">share</span>
                                </div>
                            </OSButton>
                        </div>
                    </div>
                </aside>

                <div className="flex-col relative w-full flex-1 flex min-h-0">
                    {coverImage && (
                        <div className="relative w-full h-48 sm:h-64 group bg-black/5 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                    )}

                    <div className={`w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20 flex-1 flex flex-col min-h-0 ${coverImage ? 'pt-8' : 'pt-12'}`}>
                        <div className="relative flex flex-col mb-8 shrink-0">
                            <div className={`relative ${coverImage ? '-mt-16 sm:-mt-20 mb-4' : 'mb-2'}`}>
                                <div className={`rounded-lg p-3 -ml-3 block w-fit ${coverImage ? 'bg-white/10 backdrop-blur-xl shadow-lg border border-white/20 z-10' : ''}`}>
                                    {React.createElement(ICONS[iconIndex].IconNode, { className: `size-12 sm:size-16 ${ICONS[iconIndex].color}` })}
                                </div>
                            </div>

                            <div className="rounded border border-primary bg-primary p-3 mb-3">
                                <h1 className="m-0 text-3xl sm:text-5xl font-black tracking-tight text-primary leading-tight lowercase">{title}</h1>
                            </div>
                        </div>

                        <div className="w-full flex-1 min-h-[400px] rounded border border-primary bg-primary p-4 sm:p-6 overflow-auto">
                            {content ? (
                                <div className="prose prose-sm sm:prose-base max-w-none text-primary dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
                            ) : (
                                <p className="m-0 text-sm text-primary/40 lowercase">no content yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`flex flex-col size-full overflow-hidden text-black transition-colors duration-500 ${themeClasses[theme]}`}>
            <aside className="sticky top-0 z-50 shrink-0">
                <div id={`window-inner-header-${item.key}`} className="pointer-events-auto" />
            </aside>

            {/* Scrollable Document Area Container */}
            <div className="flex-col relative w-full flex-1 flex min-h-0">
                {/* Cover Image */}
                {coverImage && (
                    <div className="relative w-full h-48 sm:h-64 group bg-black/5 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                        <button
                            onClick={() => setCoverImage(null)}
                            className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md font-bold lowercase"
                        >
                            remove cover
                        </button>
                    </div>
                )}

                {/* Main Node Content Area */}
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20 flex-1 flex flex-col min-h-0 pt-6 gap-3">
                    {/* Title Input — framed, lowercase */}
                    <div className="shrink-0 rounded-md border border-primary bg-primary/5 p-3">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="untitled node"
                            className="bg-transparent border-none cq-title font-extrabold tracking-tight text-primary outline-none placeholder:text-primary/10 w-full transition-all lowercase px-0"
                        />
                    </div>

                    {/* Rich Text Editor */}
                    <div className="w-full flex-1 min-h-[400px]">
                        <RichTextEditor
                            placeholder="type here..."
                            content={content}
                            onChange={setContent}
                            toolkitPosition="header"
                            windowKey={item.key}
                            onSaveDraft={() => handleSave('draft')}
                            onPublish={() => handleSave('published')}
                            isSaving={saving}
                            isPublished={nodeStatus === 'published'}
                            isSaved={saved}
                            leftElements={[
                                {
                                    type: 'container',
                                    children: (
                                        <div className="flex items-center gap-2 pl-1 pr-2 lowercase text-primary/70 text-[11px] font-bold">
                                            {statusConfig[nodeStatus].icon}
                                            <span className="hidden xs:inline">{statusConfig[nodeStatus].label} {nodeType} node</span>
                                        </div>
                                    )
                                }
                            ]}
                            extraElements={[
                                {
                                    type: 'button',
                                    label: 'cover',
                                    icon: <ImageIcon className="size-3.5" />,
                                    onClick: () => {
                                        const url = window.prompt('enter cover image url')
                                        if (url && url.trim()) setCoverImage(url.trim())
                                    },
                                    hideLabel: true,
                                },
                                {
                                    type: 'container',
                                    children: (
                                        <div className="flex items-center gap-1">
                                            <Popover
                                                trigger={
                                                    <OSButton size="sm">
                                                        <div className="flex items-center gap-1.5 lowercase">
                                                            {statusConfig[nodeStatus].icon}
                                                            <span className="hidden md:inline font-bold">{statusConfig[nodeStatus].label}</span>
                                                            <ChevronDown className="size-3 opacity-50 hidden md:block" />
                                                        </div>
                                                    </OSButton>
                                                }
                                                dataScheme="primary"
                                                contentClassName="w-40 p-1 border border-primary bg-bg"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map(s => (
                                                        <button key={s} onClick={() => setNodeStatus(s as keyof typeof statusConfig)} className={`text-left px-2 py-1.5 text-xs font-bold rounded-sm flex items-center gap-2 hover:bg-black/5 ${statusConfig[s as keyof typeof statusConfig].color}`}>
                                                            {statusConfig[s as keyof typeof statusConfig].icon} {statusConfig[s as keyof typeof statusConfig].label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </Popover>

                                            <Popover
                                                trigger={
                                                    <OSButton size="sm">
                                                        <div className="flex items-center gap-1.5 lowercase">
                                                            {typeConfig[nodeType].icon}
                                                            <span className="hidden md:inline font-bold">{typeConfig[nodeType].label}</span>
                                                            <ChevronDown className="size-3 opacity-50 hidden md:block" />
                                                        </div>
                                                    </OSButton>
                                                }
                                                dataScheme="primary"
                                                contentClassName="w-40 p-1 border border-primary bg-bg"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map(t => (
                                                        <button key={t} onClick={() => setNodeType(t as keyof typeof typeConfig)} className="text-left px-2 py-1.5 text-xs font-bold rounded-sm flex items-center gap-2 hover:bg-black/5 text-primary">
                                                            {typeConfig[t as keyof typeof typeConfig].icon} {typeConfig[t as keyof typeof typeConfig].label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </Popover>
                                        </div>
                                    ),
                                },
                                {
                                    type: 'button',
                                    label: 'tag',
                                    icon: <Hash className="size-3.5" />,
                                    onClick: () => {
                                        const t = window.prompt('add a new tag')
                                        if (t && t.trim()) setTags(prev => [...prev, t.trim().toLowerCase()])
                                    },
                                    hideLabel: true,
                                },
                                {
                                    type: 'container',
                                    children: (
                                        <Popover
                                            trigger={
                                                <OSButton size="sm" title="theme">
                                                    <Palette className="size-3.5" />
                                                </OSButton>
                                            }
                                            dataScheme="primary"
                                            contentClassName="w-48 p-2 border border-primary bg-bg"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black lowercase tracking-widest text-primary/40 px-2 py-1">node theme</span>
                                                {(Object.keys(themeClasses) as Array<keyof typeof themeClasses>).map(t => (
                                                    <button key={t} onClick={() => setTheme(t as keyof typeof themeClasses)} className="text-left px-2 py-1.5 text-xs font-bold hover:bg-black/5 rounded-md lowercase">
                                                        {t} canvas
                                                    </button>
                                                ))}
                                            </div>
                                        </Popover>
                                    ),
                                }
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function WritePostRouteView({ postId, item }: { postId?: string, item: AppWindow }) {
    const { user, profile, isAdmin } = useAuth()
    const { addToast } = useToast()
    const [currentPostId, setCurrentPostId] = useState<string | undefined>(postId)
    const [title, setTitle] = useState('untitled post')
    const [slug, setSlug] = useState('')
    const [excerpt, setExcerpt] = useState('')
    const [content, setContent] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [published, setPublished] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (!currentPostId) return
        const load = async () => {
            const { data } = await supabase
                .from('posts')
                .select('id, title, slug, excerpt, content, image_url, published')
                .eq('id', currentPostId)
                .single()

            if (data) {
                setTitle(data.title || 'untitled post')
                setSlug(data.slug || '')
                setExcerpt(data.excerpt || '')
                setContent(data.content || '')
                setImageUrl(data.image_url || '')
                setPublished(Boolean(data.published))
            }
        }
        load()
    }, [currentPostId])

    const handleSavePost = async (nextPublished: boolean) => {
        if (!user || !profile?.username) {
            addToast('you must be logged in to save posts', 'error')
            return
        }

        const finalTitle = title.trim() || 'untitled post'
        const finalSlug = toSlug(slug || finalTitle)
        const finalExcerpt = (excerpt || content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150)).trim()

        setSaving(true)

        const postPayload = {
            title: finalTitle,
            slug: finalSlug,
            content,
            excerpt: finalExcerpt || null,
            image_url: imageUrl || null,
            published: nextPublished,
            author: profile.username,
            author_avatar: profile.avatar_url || '',
            is_approved: isAdmin,
        }

        if (currentPostId) {
            const { error } = await supabase
                .from('posts')
                .update(postPayload)
                .eq('id', currentPostId)

            if (error) {
                addToast(`failed to save post: ${error.message}`, 'error')
                setSaving(false)
                return
            }
        } else {
            const { data, error } = await supabase
                .from('posts')
                .insert(postPayload)
                .select('id')
                .single()

            if (error || !data) {
                addToast(`failed to create post: ${error?.message || 'unknown error'}`, 'error')
                setSaving(false)
                return
            }

            setCurrentPostId(data.id as string)
        }

        setPublished(nextPublished)
        setSaved(true)
        addToast(nextPublished ? 'post published!' : 'post saved as draft', 'success')
        setTimeout(() => setSaved(false), 2500)
        setSaving(false)
    }

    return (
        <div className="flex flex-col size-full overflow-hidden text-black bg-[#fafcfc] dark:bg-primary/5 transition-colors duration-500">
            <aside className="sticky top-0 z-50 shrink-0">
                <div id={`window-inner-header-${item.key}`} className="pointer-events-auto" />
            </aside>

            <div className="flex-col relative w-full flex-1 flex min-h-0">
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20 flex-1 flex flex-col min-h-0 pt-6 gap-3">
                    {/* Title Input — framed, lowercase */}
                    <div className="shrink-0 rounded-md border border-primary bg-primary/5 p-3">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value)
                                if (!currentPostId) setSlug(toSlug(e.target.value))
                            }}
                            placeholder="untitled post"
                            className="bg-transparent border-none cq-title font-extrabold tracking-tight text-primary outline-none placeholder:text-primary/10 w-full transition-all lowercase px-0"
                        />
                    </div>

                    <div className="w-full flex-1 min-h-[400px]">
                        <RichTextEditor
                            placeholder="type here..."
                            content={content}
                            onChange={setContent}
                            toolkitPosition="header"
                            windowKey={item.key}
                            onSaveDraft={() => handleSavePost(false)}
                            onPublish={() => handleSavePost(true)}
                            isSaving={saving}
                            isPublished={published}
                            isSaved={saved}
                            leftElements={[
                                {
                                    type: 'container',
                                    children: (
                                        <div className="flex items-center gap-2 pl-1 pr-2 lowercase text-primary/70 text-[11px] font-bold">
                                            {published ? <CheckCircle className="size-3.5 text-emerald-500" /> : <PenTool className="size-3.5" />}
                                            <span className="hidden xs:inline">{published ? 'published' : 'draft'} post</span>
                                        </div>
                                    )
                                }
                            ]}
                            extraElements={[
                                {
                                    type: 'button',
                                    label: 'cover',
                                    icon: <ImageIcon className="size-3.5" />,
                                    onClick: () => {
                                        const url = window.prompt('enter post cover image url', imageUrl || '')
                                        if (url !== null) setImageUrl(url.trim())
                                    },
                                    hideLabel: true,
                                },
                                {
                                    type: 'container',
                                    children: (
                                        <Popover
                                            trigger={
                                                <OSButton size="sm">
                                                    <div className="flex items-center gap-1.5 lowercase">
                                                        {published ? <CheckCircle className="size-3.5 text-emerald-500" /> : <PenTool className="size-3.5" />}
                                                        <span className="hidden md:inline font-bold">{published ? 'published' : 'draft'}</span>
                                                        <ChevronDown className="size-3 opacity-50 hidden md:block" />
                                                    </div>
                                                </OSButton>
                                            }
                                            dataScheme="primary"
                                            contentClassName="w-40 p-1 border border-primary bg-bg"
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <button onClick={() => setPublished(false)} className="text-left px-2 py-1.5 text-xs font-bold rounded-sm flex items-center gap-2 hover:bg-black/5 text-primary">
                                                    <PenTool className="size-3" /> draft
                                                </button>
                                                <button onClick={() => setPublished(true)} className="text-left px-2 py-1.5 text-xs font-bold rounded-sm flex items-center gap-2 hover:bg-black/5 text-emerald-600">
                                                    <CheckCircle className="size-3" /> published
                                                </button>
                                            </div>
                                        </Popover>
                                    ),
                                }
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

const WindowRouter = React.memo(WindowRouterInner, (prev, next) => {
    return prev.item.path === next.item.path && 
           prev.item.key === next.item.key &&
           JSON.stringify(prev.item.meta) === JSON.stringify(next.item.meta) &&
           JSON.stringify(prev.item.props) === JSON.stringify(next.item.props)
})
WindowRouter.displayName = 'WindowRouter'

export default WindowRouter
