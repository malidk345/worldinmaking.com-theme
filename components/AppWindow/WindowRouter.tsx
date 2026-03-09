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
import RichTextEditor from 'components/AdminPanel/RichTextEditor'
import { AppWindow } from '../../context/Window'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { Save, Share, Image as ImageIcon, Palette, Hash, CheckCircle, ChevronDown, FileText, Flame, Rocket, Lightbulb, PenTool, Brain, Wrench, Sparkles, LayoutTemplate, Database, CalendarHeart } from 'lucide-react'
import OSButton from 'components/OSButton'
import { Popover } from 'components/RadixUI/Popover'
import { sanitizeHtml, toSlug } from '../../utils/security'
import Loading from 'components/Loading'

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

export default function WindowRouter({ item }: { item: AppWindow }) {
    const rawPath: string = item.path || ''
    const path: string = rawPath.replace(/\/+$/, '') || '/'

    const topicMatch = path.match(/^\/questions\/topic\/([^/]+)/)
    if (topicMatch) return <CommunityTopicRouteView slug={topicMatch[1]} />

    const permalinkMatch = path.match(/^\/questions\/([^/]+)/)
    if (permalinkMatch) return <CommunityQuestionRouteView permalink={permalinkMatch[1]} />

    if (path === '/questions') return <CommunityMainRouteView />

    const corpusMatch = path.match(/^\/u\/([^/]+)/)
    if (corpusMatch) return <PublicProfile username={corpusMatch[1]} />

    if (path === '/posts' || path === '/blog') return <PostsView />

    const blogMatch = path.match(/^\/(blog|posts)\/([^/]+)/)
    if (blogMatch) return <BlogRouteView slug={blogMatch[2]} />

    if (path === '/search') {
        const initialFilter = item.props?.initialFilter as string | undefined
        return <WindowSearchUI initialFilter={initialFilter} />
    }

    const profileMatch = path.match(/^\/profile\/([^/]+)/)
    if (profileMatch) return <PublicProfile username={profileMatch[1]} />

    if (path === '/admin') return <AdminPanel />

    if (path === '/write') {
        return <WriteRouteView nodeId={item.props?.nodeId as string | undefined} readOnly={Boolean(item.props?.readOnly)} />
    }

    if (path === '/write-post') {
        return <WritePostRouteView postId={item.props?.postId as string | undefined} />
    }

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
        if (selectedChannelId) fetchPosts(selectedChannelId)
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

    return <ForumPageLayout questions={posts.map(adaptPost)} loading={loading} />
}

function CommunityQuestionRouteView({ permalink }: { permalink: string }) {
    const { posts, loading, fetchPosts } = useCommunity()
    useEffect(() => {
        if (permalink) fetchPosts(undefined, undefined, permalink)
    }, [fetchPosts, permalink])

    const post = posts.find((p) => p.id.toString() === permalink)
    if (loading && !post) return <Loading label="syncing discussion" />

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

function BlogRouteView({ slug }: { slug: string }) {
    const { posts, loading } = usePosts()
    const post = posts.find((p) => p.slug === slug || p.slug === `/blog/${slug}`)

    if (loading && posts.length === 0) return <Loading fullScreen label="fetching node" />

    if (!post) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-lg font-bold text-primary">post not found</h2>
                <p className="text-secondary text-sm mt-2">The post &quot;{slug}&quot; doesn&apos;t exist.</p>
            </div>
        )
    }

    return <BlogPostView post={post} />
}

function WriteRouteView({ nodeId, readOnly = false }: { nodeId?: string; readOnly?: boolean }) {
    const { user } = useAuth()
    const { addToast } = useToast()
    const [title, setTitle] = useState('untitled node')
    const [content, setContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [nodeStatus, setNodeStatus] = useState<'draft' | 'published'>('draft')

    const [coverImage, setCoverImage] = useState<string | null>(null)
    const [iconIndex, setIconIndex] = useState<number>(0)
    const [tags, setTags] = useState<string[]>([])

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

    const statusConfig = {
        'draft': { label: 'draft', icon: <PenTool className="size-3" />, color: 'text-primary' },
        'published': { label: 'published', icon: <CheckCircle className="size-3" />, color: 'text-emerald-500' },
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
            <div className="flex flex-col size-full overflow-y-auto overflow-x-hidden text-black transition-colors duration-500 bg-[#fafcfc] dark:bg-primary/5">
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
        <div className="flex flex-col size-full overflow-y-auto overflow-x-hidden text-black transition-colors duration-500 bg-[#fafcfc] dark:bg-primary/5">
            <div className="flex-col relative w-full flex-1 flex min-h-0">
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

                        {/* Title Input */}
                        <div className="rounded border border-primary bg-primary p-3 mb-3">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="untitled node"
                                className="bg-transparent border-none text-3xl sm:text-5xl font-black tracking-tight text-primary outline-none placeholder:text-primary/20 w-full transition-all leading-tight lowercase"
                            />
                        </div>

                        {/* Tags */}
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

                    {/* Rich Text Editor */}
                    <div className="w-full flex-1 min-h-[400px]">
                        <RichTextEditor
                            content={content}
                            onChange={setContent}
                            actions={
                                <div className="flex items-center gap-1.5">
                                    <OSButton
                                        size="sm"
                                        onClick={() => {
                                            const url = window.prompt('enter cover image url', coverImage || '')
                                            if (url !== null) setCoverImage(url.trim())
                                        }}
                                        tooltip="cover"
                                    >
                                        <ImageIcon className="size-3.5" />
                                    </OSButton>

                                    <Popover
                                        trigger={
                                            <OSButton size="sm">
                                                <div className="flex items-center gap-1 lowercase text-[10px] font-bold">
                                                    {statusConfig[nodeStatus].icon} {statusConfig[nodeStatus].label}
                                                </div>
                                            </OSButton>
                                        }
                                        dataScheme="primary"
                                        contentClassName="w-32 p-1 border border-primary bg-bg"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map(s => (
                                                <button key={s} onClick={() => setNodeStatus(s as keyof typeof statusConfig)} className="text-left px-2 py-1 text-[10px] font-bold rounded-sm flex items-center gap-2 hover:bg-black/5 text-primary">
                                                    {statusConfig[s as keyof typeof statusConfig].icon} {statusConfig[s as keyof typeof statusConfig].label}
                                                </button>
                                            ))}
                                        </div>
                                    </Popover>

                                    <div className="h-4 w-px bg-black/[0.05] mx-0.5" />

                                    <div className="flex items-center gap-2 ml-2">
                                        {saved && <span className="text-[9px] font-bold tracking-widest text-green-600 uppercase">saved</span>}
                                        <OSButton size="sm" onClick={() => handleSave('draft')} disabled={saving}>
                                            <span className="font-bold text-[10px] tracking-tight">save</span>
                                        </OSButton>
                                        <OSButton variant="primary" size="sm" onClick={() => handleSave('published')} disabled={saving}>
                                            <span className="font-bold text-[10px] tracking-tight">publish</span>
                                        </OSButton>
                                    </div>
                                </div>
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function WritePostRouteView({ postId }: { postId?: string }) {
    const { user, profile } = useAuth()
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
        <div className="flex flex-col size-full overflow-y-auto overflow-x-hidden text-black bg-[#fafcfc] dark:bg-primary/5 transition-colors duration-500">
            <div className="flex-col relative w-full flex-1 flex min-h-0">
                {imageUrl && (
                    <div className="relative w-full h-48 sm:h-64 group bg-black/5 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt={title || 'post cover'} className="w-full h-full object-cover" />
                        <button
                            onClick={() => setImageUrl('')}
                            className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md font-bold lowercase"
                        >
                            remove cover
                        </button>
                    </div>
                )}

                <div className={`w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20 flex-1 flex flex-col min-h-0 ${imageUrl ? 'pt-8' : 'pt-12'}`}>
                    <div className="relative flex flex-col mb-8 shrink-0 gap-3">
                        <div className="rounded border border-primary bg-primary p-3">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value)
                                    if (!currentPostId) setSlug(toSlug(e.target.value))
                                }}
                                placeholder="untitled post"
                                className="bg-transparent border-none text-3xl sm:text-5xl font-black tracking-tight text-primary outline-none placeholder:text-primary/20 w-full transition-all leading-tight lowercase"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded border border-primary bg-primary p-3">
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">slug</div>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(toSlug(e.target.value))}
                                    placeholder="post-slug"
                                    className="bg-transparent border-none outline-none text-sm text-primary placeholder:text-primary/30 w-full"
                                />
                            </div>
                            <div className="rounded border border-primary bg-primary p-3">
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">excerpt</div>
                                <input
                                    type="text"
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    placeholder="short summary for cards and previews"
                                    className="bg-transparent border-none outline-none text-sm text-primary placeholder:text-primary/30 w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-full flex-1 min-h-[400px]">
                        <RichTextEditor
                            content={content}
                            onChange={setContent}
                            actions={
                                <div className="flex items-center gap-1.5">
                                    <OSButton
                                        size="sm"
                                        onClick={() => {
                                            const url = window.prompt('enter post cover image url', imageUrl || '')
                                            if (url !== null) setImageUrl(url.trim())
                                        }}
                                        tooltip="cover image"
                                    >
                                        <ImageIcon className="size-3.5" />
                                    </OSButton>

                                    <Popover
                                        trigger={
                                            <OSButton size="sm">
                                                <div className="flex items-center gap-1 lowercase text-[10px] font-bold">
                                                    {published ? <CheckCircle className="size-3 text-emerald-500" /> : <PenTool className="size-3" />}
                                                    <span>{published ? 'published' : 'draft'}</span>
                                                </div>
                                            </OSButton>
                                        }
                                        dataScheme="primary"
                                        contentClassName="w-32 p-1 border border-primary bg-bg"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <button onClick={() => setPublished(false)} className="text-left px-2 py-1 text-[10px] font-bold rounded-sm flex items-center gap-2 hover:bg-black/5 text-primary">
                                                <PenTool className="size-3" /> draft
                                            </button>
                                            <button onClick={() => setPublished(true)} className="text-left px-2 py-1 text-[10px] font-bold rounded-sm flex items-center gap-2 hover:bg-black/5 text-emerald-600">
                                                <CheckCircle className="size-3" /> published
                                            </button>
                                        </div>
                                    </Popover>

                                    <div className="h-4 w-px bg-black/[0.05] mx-0.5" />

                                    <div className="flex items-center gap-2 ml-2">
                                        {saved && <span className="text-[9px] font-bold tracking-widest text-green-600 uppercase">saved</span>}
                                        <OSButton size="sm" onClick={() => handleSavePost(false)} disabled={saving}>
                                            <span className="font-bold text-[10px] tracking-tight">save</span>
                                        </OSButton>
                                        <OSButton variant="primary" size="sm" onClick={() => handleSavePost(true)} disabled={saving}>
                                            <span className="font-bold text-[10px] tracking-tight">publish</span>
                                        </OSButton>
                                    </div>
                                </div>
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
