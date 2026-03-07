"use client"

import React, { useEffect, useState } from 'react'
import ForumPageLayout from 'components/Forum/ForumPageLayout'
import ForumQuestionDetail from 'components/Forum/ForumQuestionDetail'
import AdminPanel from 'components/AdminPanel'
import { WindowSearchUI } from 'components/Search/SearchUI'
import { usePosts } from '../../hooks/usePosts'
import { useCommunity } from '../../hooks/useCommunity'
import BlogPostView from 'components/ReaderView/BlogPostView'
import PublicProfile from 'components/Profile/PublicProfile'
import PostsView from 'components/Posts'
import CorpusView from 'components/Corpus'
import RichTextEditor, { loadDraftFromStorage, saveDraftToStorage } from 'components/AdminPanel/RichTextEditor'
import { AppWindow } from '../../context/Window'
import { Save, Image as ImageIcon, Palette, Hash, Circle, CheckCircle, Clock, Map, ChevronDown, FileText, Flame, Rocket, Lightbulb, PenTool, Brain, Wrench, Sparkles, LayoutTemplate, Database, CalendarHeart } from 'lucide-react'
import OSButton from 'components/OSButton'
import { Popover } from 'components/RadixUI/Popover'
import { Toolbar } from 'components/RadixUI/Toolbar'

const adaptPost = (p: { id: number | string; title: string; content?: string; created_at: string; author_id?: string | number; profiles?: { username?: string; avatar_url?: string } | { username?: string; avatar_url?: string }[] }) => {
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
    }
}

/**
 * Routes window content based on item.path.
 * This replaces item.element so every window gets proper React content.
 */
export default function WindowRouter({ item }: { item: AppWindow }) {
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

    // /u/:username (User Corpus / Profile)
    const corpusMatch = path.match(/^\/u\/([^/]+)/)
    if (corpusMatch) {
        // Will import Corpus component dynamically or directly
        return <CorpusView username={corpusMatch[1]} />
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
        return <AdminPanel />
    }

    // /write (New Node / Canvas Experience)
    if (path === '/write') {
        return <WriteRouteView />
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

/** New Canvas/Write View for Corpus documents */
function WriteRouteView() {
    const [title, setTitle] = useState('untitled node')
    const [content, setContent] = useState('')
    const [saved, setSaved] = useState(false)

    const [coverImage, setCoverImage] = useState<string | null>(null)
    const [iconIndex, setIconIndex] = useState<number>(0)
    const [theme, setTheme] = useState<'default' | 'yellow' | 'green' | 'blue'>('default')
    const [status, setStatus] = useState<'todo' | 'in-progress' | 'done'>('todo')
    const [nodeType, setNodeType] = useState<'canvas' | 'list' | 'journal'>('canvas')
    const [tags, setTags] = useState<string[]>(['draft'])

    useEffect(() => {
        const draft = loadDraftFromStorage()
        if (draft && draft.title) {
            setTitle(draft.title)
            setContent(draft.content)
            // Ideally we would load custom fields from draft as well, but keeping simple for demo
        }
    }, [])

    const handleSave = () => {
        saveDraftToStorage({
            title,
            content,
            excerpt: '',
            category: 'Node',
            imageUrl: coverImage || '',
            slug: 'node-' + Date.now(),
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const themeClasses = {
        'default': 'bg-[#fafcfc] dark:bg-primary/5',
        'yellow': 'bg-amber-50 dark:bg-amber-950/20',
        'green': 'bg-emerald-50 dark:bg-emerald-950/20',
        'blue': 'bg-sky-50 dark:bg-sky-950/20',
    }

    const statusConfig = {
        'todo': { label: 'todo', icon: <Circle className="size-3" />, color: 'text-primary' },
        'in-progress': { label: 'in progress', icon: <Clock className="size-3" />, color: 'text-amber-500' },
        'done': { label: 'done', icon: <CheckCircle className="size-3" />, color: 'text-emerald-500' },
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

    return (
        <div className={`flex flex-col size-full overflow-y-auto overflow-x-hidden text-black transition-colors duration-500 ${themeClasses[theme]}`}>
            {/* Header Toolbar — same pattern as Editor/index.tsx */}
            <aside data-scheme="secondary" className="bg-primary p-2 border-b border-primary sticky top-0 z-50">
                <Toolbar
                    elements={[
                        /* Cover — prompts for URL */
                        ...(!coverImage ? [{
                            type: 'button' as const,
                            label: 'cover',
                            icon: <ImageIcon className="size-4" />,
                            onClick: () => {
                                const url = window.prompt('enter cover image url')
                                if (url && url.trim()) setCoverImage(url.trim())
                            },
                            size: 'md' as const,
                            hideLabel: true,
                            className: 'md:!px-2',
                        }] : []),

                        /* Separator */
                        { type: 'separator' as const },

                        /* Status Popover */
                        {
                            type: 'container' as const,
                            children: (
                                <Popover
                                    trigger={
                                        <OSButton size="md">
                                            <div className="flex items-center gap-1.5 lowercase">
                                                {statusConfig[status].icon}
                                                <span className="hidden md:inline">{statusConfig[status].label}</span>
                                                <ChevronDown className="size-3 opacity-50 hidden md:block" />
                                            </div>
                                        </OSButton>
                                    }
                                    dataScheme="primary"
                                    contentClassName="w-40 p-1 border border-primary bg-bg"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map(s => (
                                            <button key={s} onClick={() => setStatus(s as keyof typeof statusConfig)} className={`text-left px-2 py-1.5 text-xs font-bold rounded-sm flex items-center gap-2 hover:bg-black/5 ${statusConfig[s as keyof typeof statusConfig].color}`}>
                                                {statusConfig[s as keyof typeof statusConfig].icon} {statusConfig[s as keyof typeof statusConfig].label}
                                            </button>
                                        ))}
                                    </div>
                                </Popover>
                            ),
                        },

                        /* Node Type Popover */
                        {
                            type: 'container' as const,
                            children: (
                                <Popover
                                    trigger={
                                        <OSButton size="md">
                                            <div className="flex items-center gap-1.5 lowercase">
                                                {typeConfig[nodeType].icon}
                                                <span className="hidden md:inline">{typeConfig[nodeType].label}</span>
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
                            ),
                        },

                        /* Separator */
                        { type: 'separator' as const },

                        /* Add Tag */
                        {
                            type: 'button' as const,
                            label: 'tag',
                            icon: <Hash className="size-4" />,
                            onClick: () => {
                                const t = window.prompt('add a new tag')
                                if (t && t.trim()) setTags(prev => [...prev, t.trim().toLowerCase()])
                            },
                            size: 'md' as const,
                            hideLabel: true,
                        },

                        /* Theme Popover */
                        {
                            type: 'container' as const,
                            children: (
                                <Popover
                                    trigger={
                                        <OSButton size="md">
                                            <div className="flex items-center gap-1.5 lowercase">
                                                <Palette className="size-4" />
                                                <span className="hidden md:inline">theme</span>
                                                <ChevronDown className="size-3 opacity-50 hidden md:block" />
                                            </div>
                                        </OSButton>
                                    }
                                    dataScheme="primary"
                                    contentClassName="w-48 p-2 border border-primary bg-bg"
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 px-2 py-1">node theme</span>
                                        {(Object.keys(themeClasses) as Array<keyof typeof themeClasses>).map(t => (
                                            <button key={t} onClick={() => setTheme(t as keyof typeof themeClasses)} className="text-left px-2 py-1.5 text-xs font-bold hover:bg-black/5 rounded-md lowercase">
                                                {t} canvas
                                            </button>
                                        ))}
                                    </div>
                                </Popover>
                            ),
                        },

                        /* Publish — far right via ml-auto container */
                        {
                            type: 'container' as const,
                            className: 'ml-auto flex items-center gap-2',
                            children: (
                                <>
                                    {saved && <span className="text-[10px] font-bold tracking-widest text-green-600 uppercase transition-opacity duration-300 hidden sm:inline">saved</span>}
                                    <OSButton variant="primary" size="md" onClick={handleSave} icon={<Save className="size-4" />}>
                                        <span className="hidden md:inline font-semibold lowercase">publish</span>
                                    </OSButton>
                                </>
                            ),
                        },
                    ]}
                />
            </aside>

            {/* Scrollable Document Area Container */}
            <div className="flex-col relative w-full flex-1 flex min-h-0">
                {/* Cover Image */}
                {coverImage && (
                    <div className="relative w-full h-48 sm:h-64 group bg-black/5 shrink-0">
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
                <div className={`w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20 flex-1 flex flex-col min-h-0 ${coverImage ? 'pt-8' : 'pt-12'}`}>

                    {/* Header (Icon + Title) */}
                    <div className="relative flex flex-col mb-8 shrink-0">
                        <div className={`relative ${coverImage ? '-mt-16 sm:-mt-20 mb-4' : 'mb-2'}`}>
                            <button
                                onClick={() => setIconIndex(Math.floor(Math.random() * ICONS.length))}
                                className={`hover:bg-black/5 rounded-lg transition-colors p-3 -ml-3 block w-fit ${coverImage ? 'bg-white/10 backdrop-blur-xl shadow-lg border border-white/20 z-10' : ''}`}
                            >
                                {React.createElement(ICONS[iconIndex].IconNode, { className: `size-12 sm:size-16 ${ICONS[iconIndex].color}` })}
                            </button>
                        </div>

                        {/* Title Input — framed like the toolbar */}
                        <div className="rounded border border-primary bg-primary p-3 mb-3">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="untitled node"
                                className="bg-transparent border-none text-3xl sm:text-5xl font-black tracking-tight text-primary outline-none placeholder:text-primary/20 w-full transition-all leading-tight lowercase"
                            />
                        </div>

                        {/* Tags — display only, add via toolbar */}
                        {tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {tags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                                        className="px-1.5 py-0.5 bg-primary/10 text-primary font-bold text-[10px] rounded uppercase tracking-wider hover:bg-red-100 hover:text-red-600 transition-colors"
                                        title="click to remove"
                                    >
                                        {tag} ×
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Rich Text Editor - Normal State */}
                    <div className="w-full flex-1 min-h-[400px]">
                        <RichTextEditor
                            content={content}
                            onChange={setContent}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
