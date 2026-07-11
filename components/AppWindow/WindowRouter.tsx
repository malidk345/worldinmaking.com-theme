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
import ContactContent from 'components/Contact/ContactContent'
import LoginContent from 'components/Login/LoginContent'
import { AppWindow } from '../../context/Window'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTranslation } from 'hooks/useTranslation'
import { supabase } from '../../lib/supabase'
import { Share, CheckCircle, FileText, Flame, Rocket, Lightbulb, PenTool, Brain, Wrench, Sparkles, LayoutTemplate, Database, CalendarHeart } from 'lucide-react'
import OSButton from 'components/OSButton'

import { sanitizeHtml, toSlug } from '../../utils/security'
import BlueprintsExplorer from 'components/Blueprints/BlueprintsExplorer'
import BlueprintPostView from 'components/Blueprints/BlueprintPostView'
import ArchiveExplorer from 'components/ArchiveExplorer'
import ForumAvatar from 'components/Forum/ForumAvatar'
import ForumRichText from 'components/Forum/ForumRichText'
import PostLexicalEditor from 'components/Forum/PostLexicalEditor'
import PostEditor from "components/PostEditor"

interface AdaptablePost {
    id: number | string
    title: string
    content?: string
    created_at: string
    author_id?: string | number
    profiles?: { username?: string; avatar_url?: string } | { username?: string; avatar_url?: string }[]
    _count?: { replies?: number, likes?: number, views?: number }
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
        replyCount: p._count?.replies ?? 0,
        topics: [],
        pinnedTopics: [],
        resolved: false,
        archived: false,
        upvotes: p.total_votes ?? p._count?.likes ?? 0,
        views: p._count?.views ?? 0,
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

    // /blueprints
    if (path === '/blueprints') {
        return <BlueprintsExplorer />
    }

    // /blueprints/post/:slug
    const blueprintMatch = path.match(/^\/blueprints\/post\/([^/]+)/)
    if (blueprintMatch) {
        return <BlueprintPostView slug={blueprintMatch[1]} />
    }

    // /search
    if (path === '/search') {
        const initialFilter = item.props?.initialFilter as string | undefined
        return <WindowSearchUI initialFilter={initialFilter} />
    }

    // /login
    if (path === '/login') {
        return <LoginContent />
    }

    // /contact
    if (path === '/contact') {
        return <ContactContent />
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

    // /archive
    if (path === '/archive') {
        return <ArchiveExplorer />
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
        return <PostEditor postId={item.props?.postId as string | undefined} item={item} />
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
    const { lang } = useTranslation()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let adaptedPost: any = null;
    const decodedSlug = decodeURIComponent(slug);
    
    for (const p of posts) {
        const isOriginalMatch = p.slug === decodedSlug || p.slug === slug || p.slug === `/blog/${slug}` || p.slug === `/blog/${decodedSlug}`
        let isTranslationMatch = false
        
        if (p.translations) {
            for (const l of Object.keys(p.translations)) {
                const transSlug = p.translations[l]?.slug
                if (transSlug === decodedSlug || transSlug === slug) {
                    isTranslationMatch = true
                    break
                }
            }
        }

        if (isOriginalMatch || isTranslationMatch) {
            const targetLang = lang === 'tr' ? 'tr' : 'en'
            const translation = p.translations?.[targetLang]

            if (translation) {
                adaptedPost = {
                    ...p,
                    title: translation.title || p.title,
                    content: translation.content || p.content,
                    excerpt: translation.excerpt || p.excerpt,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    htmlContent: (translation as any).htmlContent || (p as any).htmlContent,
                    language: targetLang,
                    originalLanguage: p.language || 'en',
                }
            } else {
                adaptedPost = { ...p }
            }
            break
        }
    }

    if (loading && posts.length === 0) {
        return <Loading fullScreen label="fetching node" />
    }

    if (!adaptedPost) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-lg font-bold text-primary">post not found</h2>
                <p className="text-secondary text-sm mt-2">The post &quot;{slug}&quot; doesn&apos;t exist.</p>
            </div>
        )
    }

    return (
        <BlogPostView
            post={adaptedPost}
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
    const { user, profile } = useAuth()
    const { addToast } = useToast()
    const { t } = useTranslation()
    const [title, setTitle] = useState('untitled node')
    const [content, setContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [nodeStatus, setNodeStatus] = useState<'draft' | 'published'>('draft')

    const [coverImage, setCoverImage] = useState<string | null>(null)
    const [iconIndex, setIconIndex] = useState<number>(0)
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
            addToast(t('appwindow.no_node_id'), 'error')
            return
        }
        if (!user) {
            addToast(t('appwindow.login_required_save'), 'error')
            return
        }
        setSaving(true)
        const { error } = await supabase
            .from('nodes')
            .update({ title, content, status: publishStatus, updated_at: new Date().toISOString() })
            .eq('id', nodeId)
        if (error) {
            addToast(t('appwindow.save_failed') + ': ' + error.message, 'error')
        } else {
            setNodeStatus(publishStatus)
            setSaved(true)
            addToast(publishStatus === 'published' ? t('appwindow.publish_success') : t('appwindow.draft_success'), 'success')
            setTimeout(() => setSaved(false), 2500)
        }
        setSaving(false)
    }

    const themeClasses = {
        'default': 'bg-white dark:bg-white',
        'yellow': 'bg-amber-50 dark:bg-amber-950/20',
        'green': 'bg-emerald-50 dark:bg-emerald-950/20',
        'blue': 'bg-sky-50 dark:bg-sky-950/20',
    }

    const statusConfig = {
        'draft': { label: t('profile.draft'), icon: <PenTool className="size-3" />, color: 'text-primary' },
        'published': { label: t('profile.pub'), icon: <CheckCircle className="size-3" />, color: 'text-emerald-500' },
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
                                <div className={`rounded-lg p-3 -ml-3 block w-fit ${coverImage ? 'bg-white/10 supports-[backdrop-filter]:backdrop-blur-xl shadow-lg border border-white/20 z-10' : ''}`}>
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

            {/* Document Area Container */}
            <div className="flex-col relative w-full flex-1 flex min-h-0">
                {/* Cover Image */}
                {coverImage && (
                    <div className="relative w-full h-32 sm:h-40 group bg-black/5 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                        <button
                            onClick={() => setCoverImage(null)}
                            className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity supports-[backdrop-filter]:backdrop-blur-md font-bold lowercase"
                        >
                            remove cover
                        </button>
                    </div>
                )}                {/* Main Node Content Area */}
                <div className="w-full max-w-4xl mx-auto px-2 sm:px-6 pb-4 sm:pb-6 flex-1 flex flex-col min-h-0 pt-4 sm:pt-6 gap-3">
                    <div className="relative bg-white/40 dark:bg-black/40 supports-[backdrop-filter]:backdrop-blur-[40px] rounded-[24px] md:rounded-[32px] p-3 sm:p-6 border border-black/5 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col gap-3 sm:gap-4 flex-1 h-full min-h-0">
                        {/* Meta Bar */}
                        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5 select-none">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden border border-black/10 dark:border-white/10 shadow-sm">
                                    <ForumAvatar className="w-full h-full" image={profile?.avatar_url} />
                                </div>
                                <span className="text-[10px] font-bold text-primary/50 lowercase">@{profile?.username || 'writer'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {coverImage ? (
                                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10 lowercase">has cover</span>
                                ) : (
                                    <span className="text-[9px] font-black text-primary/30 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5 lowercase">no cover</span>
                                )}
                            </div>
                        </div>

                        {/* iOS 26 Style Properties Bar */}
                        <div className="bg-white/30 dark:bg-black/30 rounded-[20px] border border-black/5 dark:border-white/5 p-3 flex flex-col gap-2.5 select-none shrink-0">
                            <div className="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/5">
                                <span className="text-[9px] font-black lowercase tracking-widest text-primary/45">node properties</span>
                                <span className="text-[9px] font-black text-primary/30 uppercase">ios 26 canvas</span>
                            </div>
                            
                            {/* Scrollable Properties Content */}
                            <div className="flex flex-row overflow-x-auto no-scrollbar gap-4 pb-0.5 flex-nowrap items-start">
                                {/* Status Property */}
                                <div className="flex flex-col gap-1 shrink-0 min-w-[100px]">
                                    <span className="text-[9px] font-bold text-primary/40 lowercase">status</span>
                                    <div className="flex bg-black/5 dark:bg-white/5 p-0.5 rounded-full border border-black/5 dark:border-white/5">
                                        {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setNodeStatus(s)}
                                                className={`px-3 py-1 rounded-full text-[9px] font-black lowercase transition-all duration-300 flex items-center gap-1.5
                                                    ${nodeStatus === s 
                                                        ? 'bg-white dark:bg-black text-primary shadow-sm border border-black/5 dark:border-white/5' 
                                                        : 'text-primary/40 hover:text-primary'}`}
                                            >
                                                {statusConfig[s].icon}
                                                {statusConfig[s].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Type Property */}
                                <div className="flex flex-col gap-1 shrink-0 min-w-[140px]">
                                    <span className="text-[9px] font-bold text-primary/40 lowercase">layout type</span>
                                    <div className="flex bg-black/5 dark:bg-white/5 p-0.5 rounded-full border border-black/5 dark:border-white/5">
                                        {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setNodeType(t)}
                                                className={`px-3 py-1 rounded-full text-[9px] font-black lowercase transition-all duration-300 flex items-center gap-1.5
                                                    ${nodeType === t 
                                                        ? 'bg-white dark:bg-black text-primary shadow-sm border border-black/5 dark:border-white/5' 
                                                        : 'text-primary/40 hover:text-primary'}`}
                                            >
                                                {typeConfig[t].icon}
                                                {typeConfig[t].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Theme Property */}
                                <div className="flex flex-col gap-1 shrink-0">
                                    <span className="text-[9px] font-bold text-primary/40 lowercase">theme</span>
                                    <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5 gap-1">
                                        {(Object.keys(themeClasses) as Array<keyof typeof themeClasses>).map(t => {
                                            const themeDotClasses = {
                                                'default': 'bg-slate-200 dark:bg-slate-800',
                                                'yellow': 'bg-amber-100 dark:bg-amber-900',
                                                'green': 'bg-emerald-100 dark:bg-emerald-900',
                                                'blue': 'bg-sky-100 dark:bg-sky-900',
                                            }
                                            return (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setTheme(t)}
                                                    title={`${t} theme`}
                                                    className={`size-6 rounded-full transition-all duration-300 border flex items-center justify-center
                                                        ${theme === t 
                                                            ? 'border-primary ring-2 ring-primary/20 scale-105 shadow-sm' 
                                                            : 'border-transparent hover:scale-105'}`}
                                                >
                                                    <span className={`size-3.5 rounded-full ${themeDotClasses[t]}`} />
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Icon Picker Property */}
                                <div className="flex flex-col gap-1 shrink-0">
                                    <span className="text-[9px] font-bold text-primary/40 lowercase">canvas icon</span>
                                    <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5 gap-1">
                                        {ICONS.map((ico, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setIconIndex(idx)}
                                                className={`size-6 rounded-full transition-all duration-300 border flex items-center justify-center
                                                    ${iconIndex === idx 
                                                        ? 'bg-white dark:bg-black border-primary shadow-sm' 
                                                        : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
                                            >
                                                {React.createElement(ico.IconNode, { className: `size-3.5 ${ico.color}` })}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Cover Image Input Property */}
                                <div className="flex flex-col gap-1 shrink-0 min-w-[200px]">
                                    <span className="text-[9px] font-bold text-primary/40 lowercase">cover image url</span>
                                    <input
                                        type="text"
                                        value={coverImage || ''}
                                        onChange={(e) => setCoverImage(e.target.value.trim() || null)}
                                        placeholder="https://images.unsplash.com/..."
                                        className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full px-4 py-1.5 text-[9px] font-bold text-primary outline-none placeholder:text-primary/30 focus:bg-white focus:border-black/10 dark:focus:bg-black/85 dark:focus:border-white/10 shadow-inner w-full transition-all duration-300 lowercase"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="w-full">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="untitled node"
                                className="w-full bg-white/60 dark:bg-black/60 border border-black/5 dark:border-white/5 rounded-full px-4 py-2.5 text-xs md:text-sm text-primary font-bold outline-none placeholder:text-primary/40 focus:bg-white focus:border-black/10 dark:focus:bg-black/80 dark:focus:border-white/10 shadow-inner transition-all duration-300 lowercase"
                            />
                        </div>

                        <ForumRichText
                            initialValue={content}
                            setFieldValue={(key: string, val: string) => setContent(val)}
                            placeholder="type here..."
                            expandHeight={true}
                            mentions={true}
                            boxed={true}
                            borderClass="border-black/10 dark:border-white/10"
                            cta={
                                <div className="flex items-center gap-1.5 w-full">
                                    <OSButton
                                        size="sm"
                                        variant="primary"
                                        disabled={saving}
                                        onClick={() => handleSave(nodeStatus)}
                                    >
                                        <span className="lowercase font-bold">{saving ? t('appwindow.saving') : (nodeStatus === 'published' ? t('appwindow.update') : t('appwindow.publish'))}</span>
                                    </OSButton>
                                    <OSButton
                                        size="sm"
                                        variant="default"
                                        onClick={() => handleSave('draft')}
                                        disabled={saving}
                                        className="opacity-70 hover:opacity-100"
                                    >
                                        <span className="lowercase font-bold">{t('appwindow.save_draft')}</span>
                                    </OSButton>
                                </div>
                            }
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
