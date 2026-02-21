"use client"

import React, { useState, useEffect } from 'react'
import { IconNewspaper, IconUser, IconActivity, IconTerminal, IconMessage } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { Edit, Save, Settings, Trash2, Plus, ArrowLeft, Mail, MessageSquare, ChevronDown, ChevronUp, Search } from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import { useAdminData } from '../../hooks/useAdminData'
import { useAuth } from '../../context/AuthContext'
import { toSlug } from '../../utils/security'
import dayjs from 'dayjs'
import { useApp } from 'context/App'

// Helper to normalize profiles from Supabase joins (can be object or array)
const getProfile = (profiles: any) => {
    if (!profiles) return null
    if (Array.isArray(profiles)) return profiles[0] || null
    return profiles
}

import Loading from 'components/Loading'

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'comments' | 'writerApplications' | 'users' | 'settings'>('overview')
    const [isCreating, setIsCreating] = useState(false)
    const [editingPost, setEditingPost] = useState<any>(null)

    // Editor State
    const [originalLanguage, setOriginalLanguage] = useState('en')
    const [currentEditLanguage, setCurrentEditLanguage] = useState('en')
    const [newPostTitle, setNewPostTitle] = useState('')
    const [newPostContent, setNewPostContent] = useState('')
    const [newPostExcerpt, setNewPostExcerpt] = useState('')
    const [translations, setTranslations] = useState<Record<string, { title: string, content: string, excerpt?: string }>>({})

    const { user, profile, isAdmin } = useAuth()
    const {
        posts,
        fetchPosts,
        createPost,
        updatePost,
        deletePost,
        loading,
        writerApplications,
        writerApplicationsLoading,
        fetchWriterApplications,
        updateWriterApplicationStatus,
        communityPosts,
        communityReplies,
        communityLoading,
        fetchCommunityPosts,
        updateCommunityPost,
        deleteCommunityPost,
        fetchCommunityReplies,
        updateCommunityReply,
        deleteCommunityReply,
    } = useAdminData()

    // Comments tab state
    const [commentFilter, setCommentFilter] = useState<'posts' | 'replies'>('posts')
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
    const [editingCommentContent, setEditingCommentContent] = useState('')
    const [editingCommentTitle, setEditingCommentTitle] = useState('')
    const [expandedPostId, setExpandedPostId] = useState<number | null>(null)
    const [commentSearchQuery, setCommentSearchQuery] = useState('')

    if (!isAdmin) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500 font-semibold">Access Denied</p>
                <p className="text-gray-600 text-sm mt-2">You do not have permission to access the admin panel.</p>
            </div>
        )
    }

    const SUPPORTED_LANGS = [
        { code: 'en', label: 'English' },
        { code: 'tr', label: 'Turkish' },
        { code: 'de', label: 'German' },
        { code: 'es', label: 'Spanish' },
    ]

    useEffect(() => {
        if (activeTab === 'content') {
            fetchPosts()
        }
    }, [activeTab, fetchPosts])

    useEffect(() => {
        if (activeTab === 'writerApplications') {
            fetchWriterApplications()
        }
    }, [activeTab, fetchWriterApplications])

    useEffect(() => {
        if (activeTab === 'comments') {
            fetchCommunityPosts()
            fetchCommunityReplies()
        }
    }, [activeTab, fetchCommunityPosts, fetchCommunityReplies])

    // useApp() can be undefined if accessed outside of provider, adding fallback just in case
    const app = useApp()
    const isMobile = app?.isMobile || false

    const TABS = [
        { id: 'overview', label: 'Overview', icon: IconActivity },
        { id: 'content', label: 'Content', icon: IconNewspaper },
        { id: 'comments', label: 'Comments', icon: IconMessage },
        { id: 'writerApplications', label: 'WIM writers', icon: Mail },
        { id: 'users', label: 'Users', icon: IconUser },
        { id: 'settings', label: 'Settings', icon: Settings },
    ]

    const handleLanguageChange = (newLang: string) => {
        // 1. Save CURRENT state into the translations object for the CURRENT lang
        const currentData = {
            title: newPostTitle,
            content: newPostContent,
            excerpt: newPostExcerpt
        }

        setTranslations(prev => ({
            ...prev,
            [currentEditLanguage]: currentData
        }))

        // 2. Load DATA for the NEW language from translations state
        // Note: Because setTranslations is async, we use the translations from current render
        // but we need to consider if we're switching away from the just-edited content
        const nextData = newLang === currentEditLanguage ? currentData : translations[newLang]

        if (nextData) {
            setNewPostTitle(nextData.title || '')
            setNewPostContent(nextData.content || '')
            setNewPostExcerpt(nextData.excerpt || '')
        } else {
            // If new language, clear fields
            setNewPostTitle('')
            setNewPostContent('')
            setNewPostExcerpt('')
        }

        setCurrentEditLanguage(newLang)
    }

    const handleSavePost = async () => {
        // 1. Sync the currently viewed tab into the translations object first
        const currentData = {
            title: newPostTitle,
            content: newPostContent,
            excerpt: newPostExcerpt
        }

        const finalTranslations = {
            ...translations,
            [currentEditLanguage]: currentData
        }

        // 2. Determine the "Root" content (the one for originalLanguage)
        // This ensures the main DB columns always store the primary language content
        const rootContent = finalTranslations[originalLanguage] || (currentEditLanguage === originalLanguage ? currentData : null)

        if (!rootContent?.title) {
            // Fallback: If root is missing, use current tab's content as root
            // But ideally we should warn the user
        }

        const finalTitle = rootContent?.title || newPostTitle
        const finalContent = rootContent?.content || newPostContent
        const finalExcerpt = rootContent?.excerpt || newPostExcerpt

        // 3. Remove the root language from the translations object to avoid redundancy
        // (Supabase stores root in columns, translations in JSONB)
        const dbTranslations = { ...finalTranslations }
        delete dbTranslations[originalLanguage]

        const postData = {
            title: finalTitle,
            content: finalContent,
            slug: editingPost?.slug || toSlug(finalTitle), // Preserve slug on updates, only generate on new
            author: profile?.username || user?.email?.split('@')[0] || 'Unknown',
            author_avatar: profile?.avatar_url || '',
            published: true,
            excerpt: finalExcerpt || finalContent.replace(/<[^>]*>/g, ' ').slice(0, 150) + '...',
            language: originalLanguage,
            translations: dbTranslations
        }

        let success;
        if (editingPost && !editingPost.isLocal) {
            success = await updatePost(editingPost.id, postData)
        } else {
            success = await createPost(postData)
        }

        if (success) {
            setIsCreating(false)
            setEditingPost(null)
            setNewPostTitle('')
            setNewPostContent('')
            setNewPostExcerpt('')
            setTranslations({})
            setOriginalLanguage('en')
            setCurrentEditLanguage('en')
            fetchPosts()
        }
    }

    const handleEditClick = (post: any) => {
        setEditingPost(post)
        setNewPostTitle(post.title)
        setNewPostContent(post.content)
        setNewPostExcerpt(post.excerpt || '')
        setTranslations(post.translations || {})
        setOriginalLanguage(post.language || 'en')
        setCurrentEditLanguage(post.language || 'en')
        setIsCreating(true)
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 text-primary">
                        <StatCard title="Total Views" value="12,450" change="+12%" />
                        <StatCard title="Active Users" value="845" change="+5%" />
                        <StatCard title="New Posts" value="24" change="+2" />
                        <StatCard title="Avg. Read Time" value="4m 12s" change="-1%" />

                        <div className="col-span-full mt-4 p-4 border border-primary rounded bg-accent/5">
                            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                                <IconTerminal className="size-4" /> system status
                            </h3>
                            <div className="space-y-2 text-xs font-mono">
                                <div className="flex justify-between">
                                    <span className="text-muted">database:</span>
                                    <span className="text-green-500">connected</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">build status:</span>
                                    <span className="text-green-500">passing</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">last deploy:</span>
                                    <span>2 mins ago</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            case 'content':
                if (isCreating) {
                    return (
                        <div className="p-4 h-full flex flex-col text-primary overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <button
                                    onClick={() => {
                                        setIsCreating(false)
                                        setEditingPost(null)
                                        setNewPostTitle('')
                                        setNewPostContent('')
                                        setTranslations({})
                                    }}
                                    className="flex items-center gap-2 text-sm font-bold hover:text-primary/70 transition-colors"
                                >
                                    <ArrowLeft className="size-4" /> Back to List
                                </button>
                                <OSButton size="sm" variant="primary" onClick={handleSavePost}>
                                    <div className="flex items-center gap-1">
                                        <Save className="size-3" />
                                        <span>{editingPost ? (editingPost.isLocal ? 'Publish to Cloud' : 'Update Post') : 'Save Post'}</span>
                                    </div>
                                </OSButton>
                            </div>

                            {/* Multi-language Tabs */}
                            <div className="flex items-center gap-2 mb-4 border-b border-primary pb-px overflow-x-auto">
                                <div className="flex gap-1">
                                    {SUPPORTED_LANGS.map(lang => {
                                        const isOriginal = lang.code === originalLanguage
                                        const hasTranslation = translations[lang.code] || isOriginal
                                        const isActive = currentEditLanguage === lang.code

                                        if (!hasTranslation && !isActive) return null

                                        return (
                                            <button
                                                key={lang.code}
                                                onClick={() => handleLanguageChange(lang.code)}
                                                className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-widest border-t border-x rounded-t-sm transition-all
                                                    ${isActive
                                                        ? 'bg-accent/30 border-primary border-b-transparent translate-y-px z-10'
                                                        : 'bg-accent/5 border-transparent hover:bg-accent/10 opacity-60'}
                                                `}
                                            >
                                                {lang.label} {isOriginal && '(Primary)'}
                                            </button>
                                        )
                                    })}
                                </div>

                                <select
                                    className="ml-auto bg-accent/10 border border-primary/20 rounded-sm text-[10px] font-bold px-2 py-1 outline-none"
                                    value=""
                                    onChange={(e) => {
                                        if (e.target.value) handleLanguageChange(e.target.value)
                                    }}
                                >
                                    <option value="" disabled>+ Add Translation</option>
                                    {SUPPORTED_LANGS.filter(l => l.code !== originalLanguage && !translations[l.code]).map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">post title ({currentEditLanguage})</label>
                                        <input
                                            type="text"
                                            placeholder="Post Title..."
                                            value={newPostTitle}
                                            onChange={(e) => setNewPostTitle(e.target.value)}
                                            className="w-full bg-transparent border-b border-primary py-2 text-xl font-black focus:outline-none placeholder:opacity-30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">original language</label>
                                        <select
                                            value={originalLanguage}
                                            onChange={(e) => setOriginalLanguage(e.target.value)}
                                            className="w-full bg-accent/10 border border-primary/20 rounded px-3 py-2 text-sm font-bold outline-none"
                                        >
                                            {SUPPORTED_LANGS.map(l => (
                                                <option key={l.code} value={l.code}>{l.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex-1 min-h-[400px] flex flex-col">
                                    <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">content ({currentEditLanguage})</label>
                                    <RichTextEditor content={newPostContent} onChange={setNewPostContent} />
                                </div>
                            </div>
                        </div>
                    )
                }

                return (
                    <div className="p-4 h-full flex flex-col text-primary">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold lowercase">manage content</h2>
                            <OSButton size="sm" variant="primary" onClick={() => setIsCreating(true)}>
                                <div className="flex items-center gap-1">
                                    <Plus className="size-3" />
                                    <span>new post</span>
                                </div>
                            </OSButton>
                        </div>

                        <div className="flex-grow overflow-y-auto custom-scrollbar border border-primary rounded bg-primary/40">
                            {loading && (
                                <Loading label="indexing content" />
                            )}

                            {!loading && posts.length === 0 && (
                                <div className="text-center p-8">
                                    <IconNewspaper className="size-8 text-primary/20 mx-auto mb-2" />
                                    <div className="text-primary/40 italic text-sm font-medium lowercase">
                                        no articles found
                                    </div>
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="mt-4 text-xs font-bold text-primary hover:underline lowercase"
                                    >
                                        + create your first post
                                    </button>
                                </div>
                            )}

                            {!loading && posts.length > 0 && (
                                <div className="divide-y divide-primary/10">
                                    {posts.map(post => (
                                        <div key={post.id} className="p-3 flex items-center justify-between hover:bg-primary/[0.05] group transition-colors">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black lowercase">{post.title}</span>
                                                    {post.isLocal && (
                                                        <span className="bg-blue-50 text-blue-500 text-[10px] px-1.5 py-0.5 rounded font-black border border-blue-200 uppercase tracking-tighter">read-only file</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] opacity-40 lowercase">
                                                    <span>{dayjs(post.created_at).format('MMM D, YYYY')}</span>
                                                    <span>•</span>
                                                    <span>/{post.slug}</span>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1 transition-opacity ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <OSButton size="xs" variant="secondary" onClick={() => handleEditClick(post)}>
                                                    <Edit className="size-3" />
                                                </OSButton>
                                                {!post.isLocal && (
                                                    <OSButton size="xs" variant="secondary" onClick={() => deletePost(post.id)}>
                                                        <Trash2 className="size-3 text-red-500" />
                                                    </OSButton>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            case 'users':
                return (
                    <div className="p-4 h-full flex flex-col text-primary">
                        <h2 className="text-sm font-bold mb-4">manage users</h2>
                        <div className="border border-primary rounded flex-1 bg-primary/40 flex items-center justify-center">
                            <div className="text-center p-4">
                                <IconUser className="size-8 text-primary/20 mx-auto mb-2" />
                                <div className="text-primary/40 italic text-sm font-medium">
                                    user management module
                                </div>
                            </div>
                        </div>
                    </div>
                )
            case 'writerApplications':
                return (
                    <div className="p-4 h-full flex flex-col text-primary">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold lowercase">wim writer applications</h2>
                            <span className="text-[10px] tracking-widest font-bold text-primary/50 uppercase">
                                {writerApplications.length} messages
                            </span>
                        </div>

                        <div className="flex-grow overflow-y-auto custom-scrollbar border border-primary rounded bg-primary/40">
                            {writerApplicationsLoading && (
                                <Loading label="retrieving transmissions" />
                            )}

                            {!writerApplicationsLoading && writerApplications.length === 0 && (
                                <div className="text-center p-8">
                                    <Mail className="size-8 text-primary/20 mx-auto mb-2" />
                                    <div className="text-primary/40 italic text-sm font-medium lowercase">
                                        no writer applications yet
                                    </div>
                                </div>
                            )}

                            {!writerApplicationsLoading && writerApplications.length > 0 && (
                                <div className="divide-y divide-primary/10">
                                    {writerApplications.map(application => (
                                        <div key={application.id} className="p-4 space-y-3 hover:bg-primary/[0.02] transition-colors">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="text-sm font-black lowercase">{application.name}</div>
                                                    <div className="text-xs opacity-60">{application.email}</div>
                                                    <div className="text-[10px] opacity-40 lowercase">
                                                        {dayjs(application.created_at).format('MMM D, YYYY • HH:mm')}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] px-2 py-1 rounded border font-bold uppercase tracking-wider ${application.status === 'reviewed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                        {application.status}
                                                    </span>
                                                    {application.status !== 'reviewed' && (
                                                        <OSButton
                                                            size="xs"
                                                            variant="secondary"
                                                            onClick={() => updateWriterApplicationStatus(application.id, 'reviewed')}
                                                        >
                                                            mark reviewed
                                                        </OSButton>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-sm leading-relaxed text-primary/80 whitespace-pre-wrap">
                                                {application.message}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            case 'comments':
                const filteredCommunityPosts = communityPosts.filter(p => {
                    if (!commentSearchQuery) return true
                    const q = commentSearchQuery.toLowerCase()
                    return (
                        p.title?.toLowerCase().includes(q) ||
                        p.content?.toLowerCase().includes(q) ||
                        getProfile(p.profiles)?.username?.toLowerCase().includes(q) ||
                        p.post_slug?.toLowerCase().includes(q)
                    )
                })

                const filteredCommunityReplies = communityReplies.filter(r => {
                    if (!commentSearchQuery) return true
                    const q = commentSearchQuery.toLowerCase()
                    return (
                        r.content?.toLowerCase().includes(q) ||
                        getProfile(r.profiles)?.username?.toLowerCase().includes(q)
                    )
                })

                return (
                    <div className="p-4 h-full flex flex-col text-primary overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h2 className="text-sm font-bold">community comments</h2>
                            <div className="flex items-center gap-2 text-xs text-muted">
                                <span>{communityPosts.length} posts</span>
                                <span>·</span>
                                <span>{communityReplies.length} replies</span>
                            </div>
                        </div>

                        {/* Search + Filter Bar */}
                        <div className="flex gap-2 mb-4 flex-shrink-0">
                            <div className="flex-1 relative">
                                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    type="text"
                                    value={commentSearchQuery}
                                    onChange={(e) => setCommentSearchQuery(e.target.value)}
                                    placeholder="search comments..."
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-primary rounded bg-primary text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                            </div>
                            <div className="flex border border-primary rounded overflow-hidden">
                                <button
                                    onClick={() => setCommentFilter('posts')}
                                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${commentFilter === 'posts' ? 'bg-accent/40 text-primary shadow-inner ring-1 ring-primary/10' : 'bg-primary text-primary/60 hover:bg-accent/10 hover:text-primary'}`}
                                >
                                    posts
                                </button>
                                <button
                                    onClick={() => setCommentFilter('replies')}
                                    className={`px-3 py-1.5 text-xs font-bold transition-colors border-l border-primary ${commentFilter === 'replies' ? 'bg-accent/40 text-primary shadow-inner ring-1 ring-primary/10' : 'bg-primary text-primary/60 hover:bg-accent/10 hover:text-primary'}`}
                                >
                                    replies
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                            {communityLoading ? (
                                <Loading label="scanning discussions" />
                            ) : commentFilter === 'posts' ? (
                                filteredCommunityPosts.length === 0 ? (
                                    <div className="text-center text-muted text-sm py-12 italic">no community posts found</div>
                                ) : (
                                    filteredCommunityPosts.map(cp => {
                                        const isEditing = editingCommentId === cp.id && commentFilter === 'posts'
                                        const postReplies = communityReplies.filter(r => r.post_id === cp.id)
                                        const isExpanded = expandedPostId === cp.id

                                        return (
                                            <div key={cp.id} className="border border-primary rounded bg-primary/40">
                                                {/* Post Header */}
                                                <div className="p-3 flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className="text-xs font-bold text-primary">
                                                                {getProfile(cp.profiles)?.username || 'anonymous'}
                                                            </span>
                                                            <span className="text-[10px] text-muted">
                                                                {dayjs(cp.created_at).format('MMM D, YYYY HH:mm')}
                                                            </span>
                                                            {cp.post_slug && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 font-mono">
                                                                    {cp.post_slug}
                                                                </span>
                                                            )}
                                                            {postReplies.length > 0 && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">
                                                                    {postReplies.length} {postReplies.length === 1 ? 'reply' : 'replies'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {isEditing ? (
                                                            <div className="space-y-2 mt-2">
                                                                <input
                                                                    type="text"
                                                                    value={editingCommentTitle}
                                                                    onChange={(e) => setEditingCommentTitle(e.target.value)}
                                                                    className="w-full px-2 py-1 text-sm border border-primary rounded bg-primary text-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                                                    placeholder="title"
                                                                />
                                                                <textarea
                                                                    value={editingCommentContent}
                                                                    onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                    rows={4}
                                                                    className="w-full px-2 py-1 text-sm border border-primary rounded bg-white text-primary resize-y font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
                                                                />
                                                                <div className="flex gap-1.5">
                                                                    <OSButton
                                                                        size="xs"
                                                                        variant="primary"
                                                                        onClick={async () => {
                                                                            await updateCommunityPost(cp.id, {
                                                                                title: editingCommentTitle,
                                                                                content: editingCommentContent
                                                                            })
                                                                            setEditingCommentId(null)
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-1"><Save className="size-3" /> save</div>
                                                                    </OSButton>
                                                                    <OSButton
                                                                        size="xs"
                                                                        variant="secondary"
                                                                        onClick={() => setEditingCommentId(null)}
                                                                    >
                                                                        cancel
                                                                    </OSButton>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {cp.title && !cp.title.startsWith('comment_') && (
                                                                    <h4 className="text-sm font-bold mb-0.5">{cp.title}</h4>
                                                                )}
                                                                <p className="text-xs text-primary/70 line-clamp-2 break-all">
                                                                    {cp.content?.replace(/<[^>]*>/g, '').slice(0, 200)}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>

                                                    {!isEditing && (
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            {postReplies.length > 0 && (
                                                                <button
                                                                    onClick={() => setExpandedPostId(isExpanded ? null : cp.id)}
                                                                    className="p-1 rounded hover:bg-accent/20 transition-colors text-muted hover:text-primary"
                                                                    title="show replies"
                                                                >
                                                                    {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    setEditingCommentId(cp.id)
                                                                    setEditingCommentTitle(cp.title || '')
                                                                    setEditingCommentContent(cp.content || '')
                                                                }}
                                                                className="p-1 rounded hover:bg-blue-50 transition-colors text-muted hover:text-blue-600"
                                                                title="edit"
                                                            >
                                                                <Edit className="size-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm(`Delete this comment by ${getProfile(cp.profiles)?.username || 'anonymous'}? This will also delete ${postReplies.length} replies.`)) {
                                                                        await deleteCommunityPost(cp.id)
                                                                    }
                                                                }}
                                                                className="p-1 rounded hover:bg-red-50 transition-colors text-muted hover:text-red-600"
                                                                title="delete"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expanded Replies */}
                                                {isExpanded && postReplies.length > 0 && (
                                                    <div className="border-t border-primary/10 bg-accent/5">
                                                        {postReplies.map(reply => {
                                                            const isEditingReply = editingCommentId === reply.id && commentFilter === 'posts'
                                                            return (
                                                                <div key={reply.id} className="px-3 py-2 border-b border-primary/5 last:border-b-0 flex items-start gap-2">
                                                                    <MessageSquare className="size-3 mt-1 text-muted flex-shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-0.5">
                                                                            <span className="text-[11px] font-bold">{getProfile(reply.profiles)?.username || 'anonymous'}</span>
                                                                            <span className="text-[10px] text-muted">{dayjs(reply.created_at).format('MMM D, HH:mm')}</span>
                                                                        </div>
                                                                        {isEditingReply ? (
                                                                            <div className="space-y-1.5">
                                                                                <textarea
                                                                                    value={editingCommentContent}
                                                                                    onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                                    rows={2}
                                                                                    className="w-full px-2 py-1 text-xs border border-primary rounded bg-primary text-primary resize-y font-mono focus:outline-none"
                                                                                />
                                                                                <div className="flex gap-1">
                                                                                    <OSButton size="xs" variant="primary" onClick={async () => {
                                                                                        await updateCommunityReply(reply.id, editingCommentContent)
                                                                                        setEditingCommentId(null)
                                                                                    }}>
                                                                                        <div className="flex items-center gap-1"><Save className="size-3" /> save</div>
                                                                                    </OSButton>
                                                                                    <OSButton size="xs" variant="secondary" onClick={() => setEditingCommentId(null)}>cancel</OSButton>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-xs text-primary/70 break-all">
                                                                                {reply.content?.replace(/<[^>]*>/g, '').slice(0, 150)}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    {!isEditingReply && (
                                                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingCommentId(reply.id)
                                                                                    setEditingCommentContent(reply.content || '')
                                                                                }}
                                                                                className="p-0.5 rounded hover:bg-blue-50 transition-colors text-muted hover:text-blue-600"
                                                                            >
                                                                                <Edit className="size-3" />
                                                                            </button>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    if (confirm('Delete this reply?')) {
                                                                                        await deleteCommunityReply(reply.id)
                                                                                    }
                                                                                }}
                                                                                className="p-0.5 rounded hover:bg-red-50 transition-colors text-muted hover:text-red-600"
                                                                            >
                                                                                <Trash2 className="size-3" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )
                            ) : (
                                /* Replies Tab */
                                filteredCommunityReplies.length === 0 ? (
                                    <div className="text-center text-muted text-sm py-12 italic">no replies found</div>
                                ) : (
                                    filteredCommunityReplies.map(reply => {
                                        const isEditing = editingCommentId === reply.id
                                        const parentPost = communityPosts.find(p => p.id === reply.post_id)

                                        return (
                                            <div key={reply.id} className="border border-primary rounded bg-accent/5 p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className="text-xs font-bold">{getProfile(reply.profiles)?.username || 'anonymous'}</span>
                                                            <span className="text-[10px] text-muted">{dayjs(reply.created_at).format('MMM D, YYYY HH:mm')}</span>
                                                            {parentPost && (
                                                                <span className="text-[10px] text-muted italic">
                                                                    → reply to "{parentPost.title?.replace(/<[^>]*>/g, '').slice(0, 40)}"
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isEditing ? (
                                                            <div className="space-y-2 mt-1">
                                                                <textarea
                                                                    value={editingCommentContent}
                                                                    onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                    rows={3}
                                                                    className="w-full px-2 py-1 text-sm border border-primary rounded bg-primary text-primary resize-y font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
                                                                />
                                                                <div className="flex gap-1.5">
                                                                    <OSButton
                                                                        size="xs"
                                                                        variant="primary"
                                                                        onClick={async () => {
                                                                            await updateCommunityReply(reply.id, editingCommentContent)
                                                                            setEditingCommentId(null)
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-1"><Save className="size-3" /> save</div>
                                                                    </OSButton>
                                                                    <OSButton
                                                                        size="xs"
                                                                        variant="secondary"
                                                                        onClick={() => setEditingCommentId(null)}
                                                                    >
                                                                        cancel
                                                                    </OSButton>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-primary/70 line-clamp-2 break-all">
                                                                {reply.content?.replace(/<[^>]*>/g, '').slice(0, 200)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {!isEditing && (
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingCommentId(reply.id)
                                                                    setEditingCommentContent(reply.content || '')
                                                                }}
                                                                className="p-1 rounded hover:bg-blue-50 transition-colors text-muted hover:text-blue-600"
                                                                title="edit"
                                                            >
                                                                <Edit className="size-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm('Delete this reply?')) {
                                                                        await deleteCommunityReply(reply.id)
                                                                    }
                                                                }}
                                                                className="p-1 rounded hover:bg-red-50 transition-colors text-muted hover:text-red-600"
                                                                title="delete"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )
                            )}
                        </div>
                    </div>
                )
            case 'settings':
                return (
                    <div className="p-4 h-full flex flex-col text-primary">
                        <h2 className="text-sm font-bold mb-4">system settings</h2>
                        <div className="border border-primary rounded flex-1 bg-accent/5 flex items-center justify-center">
                            <div className="text-center p-4">
                                <Settings className="size-8 text-primary/20 mx-auto mb-2" />
                                <div className="text-primary/40 italic text-sm font-medium">
                                    System configuration
                                </div>
                            </div>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="flex h-full w-full bg-primary text-primary overflow-hidden">
            {/* Sidebar */}
            <div className={`flex-shrink-0 border-r border-primary bg-accent/10 flex flex-col ${isMobile ? 'w-12 items-center py-2' : 'w-48 py-4'}`}>
                {!isMobile && (
                    <div className="px-4 mb-6">
                        <h1 className="font-bold text-sm tracking-wide opacity-50">admin</h1>
                    </div>
                )}

                <div className="flex flex-col gap-1 px-2 w-full">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left w-full
                                ${activeTab === tab.id
                                    ? 'bg-accent/20 text-primary font-bold shadow-sm ring-1 ring-primary/10'
                                    : 'text-muted hover:bg-accent/10 hover:text-primary'}
                                ${isMobile ? 'justify-center' : ''}
                            `}
                        >
                            <tab.icon className="size-4 flex-shrink-0" />
                            {!isMobile && <span>{tab.label}</span>}
                        </button>
                    ))}
                </div>

                <div className="mt-auto p-2">
                    <div className="text-[10px] text-center text-muted opacity-50">v1.2.0</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-primary/20 h-full relative">
                {renderContent()}
            </div>
        </div>
    )
}

const StatCard = ({ title, value, change }: { title: string, value: string, change: string }) => {
    const isPositive = change.startsWith('+')
    return (
        <div className="p-3 border border-primary rounded bg-accent/10 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-xs text-muted mb-1">{title}</h4>
            <div className="flex items-end justify-between">
                <span className="text-xl font-black tracking-tight">{value}</span>
                <span className={`text-xs font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {change}
                </span>
            </div>
        </div>
    )
}

export default AdminPanel
