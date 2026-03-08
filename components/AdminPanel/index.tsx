"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { IconNewspaper, IconUser, IconActivity, IconTerminal, IconMessage } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { Edit, Save, Settings, Trash2, Plus, ArrowLeft, MessageSquare, ChevronDown, ChevronUp, Search } from 'lucide-react'
import RichTextEditor, { saveDraftToStorage, loadDraftFromStorage, clearDraftFromStorage } from './RichTextEditor'
import { useAdminData, AdminPost } from '../../hooks/useAdminData'
import { useAuth } from '../../context/AuthContext'
import { toSlug } from '../../utils/security'
import dayjs from 'dayjs'
import { useApp } from 'context/App'

// Helper to normalize profiles from Supabase joins (can be object or array)
const getProfile = (profiles: unknown) => {
    if (!profiles) return null
    if (Array.isArray(profiles)) return (profiles[0] as { username?: string; avatar_url?: string }) || null
    return profiles as { username?: string; avatar_url?: string }
}

import Loading from 'components/Loading'

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'comments' | 'writerApplications' | 'users' | 'settings'>('overview')
    const [isCreating, setIsCreating] = useState(false)
    const [editingPost, setEditingPost] = useState<AdminPost | null>(null)
    const [focusMode, setFocusMode] = useState(false)
    const [draftRestored, setDraftRestored] = useState(false)

    // Editor State
    const [originalLanguage, setOriginalLanguage] = useState('en')
    const [currentEditLanguage, setCurrentEditLanguage] = useState('en')
    const [newPostTitle, setNewPostTitle] = useState('')
    const [newPostContent, setNewPostContent] = useState('')
    const [newPostExcerpt, setNewPostExcerpt] = useState('')
    const [newPostCategory, setNewPostCategory] = useState('')
    const [newPostImageUrl, setNewPostImageUrl] = useState('')
    const [newPostSlug, setNewPostSlug] = useState('')
    const [newPostPublished, setNewPostPublished] = useState(true)
    const [translations, setTranslations] = useState<Record<string, { title: string, content: string, excerpt?: string }>>({})

    // Auto-save: debounced draft persistence
    const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const triggerAutoSave = useCallback(() => {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
        autoSaveRef.current = setTimeout(() => {
            if (newPostTitle || newPostContent) {
                saveDraftToStorage({
                    title: newPostTitle,
                    content: newPostContent,
                    excerpt: newPostExcerpt,
                    category: newPostCategory,
                    imageUrl: newPostImageUrl,
                    slug: newPostSlug,
                })
            }
        }, 3000)
    }, [newPostTitle, newPostContent, newPostExcerpt, newPostCategory, newPostImageUrl, newPostSlug])

    // Trigger auto-save whenever editor fields change
    useEffect(() => {
        if (isCreating && (newPostTitle || newPostContent)) {
            triggerAutoSave()
        }
        return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
    }, [newPostTitle, newPostContent, newPostExcerpt, newPostCategory, newPostImageUrl, newPostSlug, isCreating, triggerAutoSave])

    // Load draft on entering content creation
    useEffect(() => {
        if (isCreating && !editingPost && !draftRestored) {
            const draft = loadDraftFromStorage()
            if (draft && (draft.title || draft.content)) {
                const savedTime = dayjs(draft.savedAt).format('HH:mm, MMM D')
                const restore = window.confirm(`unsaved draft found (${savedTime}). would you like to restore it?`)
                if (restore) {
                    setNewPostTitle(draft.title)
                    setNewPostContent(draft.content)
                    setNewPostExcerpt(draft.excerpt)
                    setNewPostCategory(draft.category)
                    setNewPostImageUrl(draft.imageUrl)
                    setNewPostSlug(draft.slug)
                } else {
                    clearDraftFromStorage()
                }
            }
            setDraftRestored(true)
        }
        if (!isCreating) setDraftRestored(false)
    }, [isCreating, editingPost, draftRestored])

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
        totalUsers,
        fetchTotalUsers,
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

    // Fetch initial overview data
    useEffect(() => {
        if (activeTab === 'overview') {
            fetchPosts()
            fetchCommunityPosts()
            fetchCommunityReplies()
            fetchTotalUsers()
        }
    }, [activeTab, fetchPosts, fetchCommunityPosts, fetchCommunityReplies, fetchTotalUsers])

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

    if (!isAdmin) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500 font-semibold lowercase">access denied</p>
                <p className="text-gray-600 text-sm mt-2 lowercase">you do not have permission to access the admin panel.</p>
            </div>
        )
    }

    const SUPPORTED_LANGS: { code: string; label: string }[] = [
        { code: 'en', label: 'english' },
        { code: 'tr', label: 'turkish' },
        { code: 'de', label: 'german' },
        { code: 'es', label: 'spanish' },
    ]

    const TABS: { id: typeof activeTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'overview', label: 'overview', icon: IconActivity },
        { id: 'content', label: 'content', icon: IconNewspaper },
        { id: 'comments', label: 'comments', icon: IconMessage },
        { id: 'writerApplications', label: 'wim writers', icon: MessageSquare },
        { id: 'users', label: 'users', icon: IconUser },
        { id: 'settings', label: 'settings', icon: Settings },
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
            slug: newPostSlug || toSlug(finalTitle), // Preserve manual slug if entered
            author: profile?.username || user?.email?.split('@')[0] || 'unknown',
            author_avatar: profile?.avatar_url || '',
            published: newPostPublished,
            excerpt: finalExcerpt || finalContent.replace(/<[^>]*>/g, ' ').slice(0, 150) + '...',
            language: originalLanguage,
            translations: dbTranslations,
            category: newPostCategory,
            image_url: newPostImageUrl
        }

        let success: boolean;
        if (editingPost && !editingPost.isLocal) {
            success = await updatePost(editingPost.id, postData)
        } else {
            success = await createPost(postData)
        }

        if (success) {
            clearDraftFromStorage()
            setFocusMode(false)
            setIsCreating(false)
            setEditingPost(null)
            setNewPostTitle('')
            setNewPostContent('')
            setNewPostExcerpt('')
            setNewPostCategory('')
            setNewPostImageUrl('')
            setNewPostSlug('')
            setNewPostPublished(true)
            setTranslations({})
            setOriginalLanguage('en')
            setCurrentEditLanguage('en')
            fetchPosts()
        }
    }

    const handleEditClick = (post: AdminPost) => {
        setEditingPost(post)
        setNewPostTitle(post.title)
        setNewPostContent(post.content)
        setNewPostExcerpt(post.excerpt || '')
        setNewPostCategory(post.category || '')
        setNewPostImageUrl(post.image_url || '')
        setNewPostSlug(post.slug || '')
        setNewPostPublished(post.published ?? true)
        setTranslations(post.translations || {})
        setOriginalLanguage(post.language || 'en')
        setCurrentEditLanguage(post.language || 'en')
        setIsCreating(true)
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': {
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 text-primary">
                        <StatCard title="total views" value="---" change="0%" />
                        <StatCard title="active users" value={totalUsers.toString()} change="---" />
                        <StatCard title="total posts" value={posts.length.toString()} change={(posts.length > 0 ? "+" + posts.length : "0")} />
                        <StatCard title="community messages" value={(communityPosts.length + communityReplies.length).toString()} change="0" />

                        <div className="col-span-full mt-4 p-4 border border-primary rounded bg-accent/5">
                            <h3 className="text-sm font-bold mb-2 flex items-center gap-2 lowercase">
                                <IconTerminal className="size-4" /> system status
                            </h3>
                            <div className="space-y-2 text-xs font-mono lowercase">
                                <div className="flex justify-between">
                                    <span className="opacity-40">database:</span>
                                    <span className="text-green-500">connected</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="opacity-40">auth backend:</span>
                                    <span className="text-green-500">active</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="opacity-40">admin role:</span>
                                    <span>{profile?.role || 'authorized'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            case 'content': {
                if (isCreating) {
                    return (
                        <div className={`${focusMode ? 'fixed inset-0 z-[9999] bg-white' : 'p-3 sm:p-4 h-full'} flex flex-col text-black overflow-y-auto custom-scrollbar`}>
                            {/* Focus Mode Header */}
                            {focusMode && (
                                <div className="flex items-center justify-between px-3 py-2 border-b border-black/10 bg-neutral-50 flex-shrink-0">
                                    <button
                                        onClick={() => setFocusMode(false)}
                                        className="flex items-center gap-1 text-[11px] font-bold text-black/60 hover:text-black transition-colors lowercase"
                                    >
                                        <ArrowLeft className="size-3" /> exit focus
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="post title..."
                                            value={newPostTitle}
                                            onChange={(e) => setNewPostTitle(e.target.value)}
                                            className="bg-transparent border-b border-black/15 py-1 text-sm font-bold text-black focus:outline-none placeholder:text-black/25 w-36 sm:w-64"
                                        />
                                        <OSButton size="sm" variant="primary" onClick={handleSavePost}>
                                            <div className="flex items-center gap-1">
                                                <Save className="size-3" />
                                                <span className="lowercase text-xs">save</span>
                                            </div>
                                        </OSButton>
                                    </div>
                                </div>
                            )}

                            {/* Normal Header */}
                            {!focusMode && (
                                <div className="flex justify-between items-center mb-3 sm:mb-4">
                                    <button
                                        onClick={() => {
                                            setFocusMode(false)
                                            setIsCreating(false)
                                            setEditingPost(null)
                                            setNewPostTitle('')
                                            setNewPostContent('')
                                            setNewPostExcerpt('')
                                            setNewPostCategory('')
                                            setNewPostImageUrl('')
                                            setNewPostSlug('')
                                            setNewPostPublished(true)
                                            setTranslations({})
                                        }}
                                        className="flex items-center gap-1.5 text-xs font-bold text-black/60 hover:text-black transition-colors lowercase"
                                    >
                                        <ArrowLeft className="size-3.5" /> back
                                    </button>
                                    <OSButton size="sm" variant="primary" onClick={handleSavePost}>
                                        <div className="flex items-center gap-1">
                                            <Save className="size-3" />
                                            <span className="lowercase text-xs">{editingPost ? (editingPost.isLocal ? 'publish' : 'update') : 'save'}</span>
                                        </div>
                                    </OSButton>
                                </div>
                            )}

                            {/* Form Fields - hidden in focus mode */}
                            {!focusMode && (
                                <>
                                    {/* Multi-language Tabs */}
                                    <div className="mb-2.5">
                                        <label className="text-[9px] font-black uppercase text-black/30 mb-0.5 block tracking-wider">language</label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1 overflow-x-auto">
                                                {SUPPORTED_LANGS.map(lang => {
                                                    const isOriginal = lang.code === originalLanguage
                                                    const hasTranslation = translations[lang.code] || isOriginal
                                                    const isActive = currentEditLanguage === lang.code

                                                    if (!hasTranslation && !isActive) return null

                                                    return (
                                                        <button
                                                            key={lang.code}
                                                            onClick={() => handleLanguageChange(lang.code)}
                                                            className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-sm border transition-all flex-shrink-0
                                                                ${isActive
                                                                    ? 'bg-black text-white border-black'
                                                                    : 'bg-neutral-50 border-black/10 text-black/40 hover:bg-black/5 hover:text-black/70'}
                                                            `}
                                                        >
                                                            {lang.label} {isOriginal && '·'}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            <select
                                                className="bg-neutral-50 border border-black/10 rounded-sm text-[10px] font-bold text-black/50 px-2 py-1 outline-none flex-shrink-0"
                                                value=""
                                                onChange={(e) => {
                                                    if (e.target.value) handleLanguageChange(e.target.value)
                                                }}
                                            >
                                                <option value="" disabled>+ add</option>
                                                {SUPPORTED_LANGS.filter(l => l.code !== originalLanguage && !translations[l.code]).map(lang => (
                                                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <input
                                        type="text"
                                        placeholder="post title..."
                                        value={newPostTitle}
                                        onChange={(e) => {
                                            setNewPostTitle(e.target.value)
                                            if (!editingPost && !newPostSlug) {
                                                setNewPostSlug(toSlug(e.target.value))
                                            }
                                        }}
                                        className="w-full bg-transparent border-b border-black/10 py-1.5 text-base sm:text-lg font-black text-black focus:outline-none placeholder:text-black/20 mb-2.5"
                                    />

                                    {/* Compact Row: slug + status + language */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2.5">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-[9px] font-black uppercase text-black/30 mb-0.5 block tracking-wider">slug</label>
                                            <input
                                                type="text"
                                                placeholder="my-post-url"
                                                value={newPostSlug}
                                                onChange={(e) => setNewPostSlug(e.target.value)}
                                                className="w-full bg-neutral-50 border border-black/10 rounded-sm px-2 py-1 text-xs font-bold text-black focus:outline-none placeholder:text-black/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-black/30 mb-0.5 block tracking-wider">status</label>
                                            <button
                                                onClick={() => setNewPostPublished(!newPostPublished)}
                                                className={`w-full px-2 py-1 text-[10px] font-bold rounded-sm border transition-colors ${newPostPublished
                                                    ? 'bg-black text-white border-black'
                                                    : 'bg-neutral-100 text-black/50 border-black/10'
                                                    }`}
                                            >
                                                {newPostPublished ? '● published' : '○ draft'}
                                            </button>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-black/30 mb-0.5 block tracking-wider">language</label>
                                            <select
                                                value={originalLanguage}
                                                onChange={(e) => setOriginalLanguage(e.target.value)}
                                                className="w-full bg-neutral-50 border border-black/10 rounded-sm px-2 py-1 text-xs font-bold text-black outline-none"
                                            >
                                                {SUPPORTED_LANGS.map(l => (
                                                    <option key={l.code} value={l.code}>{l.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Excerpt */}
                                    <div className="mb-2.5">
                                        <label className="text-[9px] font-black uppercase text-black/30 mb-0.5 block tracking-wider">excerpt</label>
                                        <textarea
                                            placeholder="short description for seo..."
                                            value={newPostExcerpt}
                                            onChange={(e) => setNewPostExcerpt(e.target.value)}
                                            className="w-full bg-neutral-50 border border-black/10 rounded-sm px-2 py-1 text-xs text-black focus:outline-none resize-none h-12 placeholder:text-black/20"
                                        />
                                    </div>

                                    {/* Category + Image URL */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-black/30 mb-0.5 block tracking-wider">category</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. technology"
                                                value={newPostCategory}
                                                onChange={(e) => setNewPostCategory(e.target.value)}
                                                className="w-full bg-neutral-50 border border-black/10 rounded-sm px-2 py-1 text-xs font-bold text-black focus:outline-none placeholder:text-black/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-black/30 mb-0.5 block tracking-wider">image url</label>
                                            <input
                                                type="text"
                                                placeholder="https://..."
                                                value={newPostImageUrl}
                                                onChange={(e) => setNewPostImageUrl(e.target.value)}
                                                className="w-full bg-neutral-50 border border-black/10 rounded-sm px-2 py-1 text-xs font-bold text-black focus:outline-none placeholder:text-black/20"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Editor - always visible */}
                            <div className={`${focusMode ? 'flex-1 p-3 sm:p-4' : 'flex-1 min-h-[200px] sm:min-h-[300px]'} flex flex-col`}>
                                {!focusMode && <label className="text-[9px] font-black uppercase text-black/30 mb-0.5 block tracking-wider">content</label>}
                                <RichTextEditor
                                    content={newPostContent}
                                    onChange={setNewPostContent}
                                    focusMode={focusMode}
                                    onToggleFocusMode={() => setFocusMode(prev => !prev)}
                                />
                            </div>
                        </div >
                    )
                }

                return (
                    <div className="p-3 sm:p-4 h-full flex flex-col text-black">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-xs font-black uppercase tracking-wider text-black/50">manage content</h2>
                            <OSButton size="sm" variant="primary" onClick={() => setIsCreating(true)}>
                                <div className="flex items-center gap-1">
                                    <Plus className="size-3" />
                                    <span className="text-xs">new post</span>
                                </div>
                            </OSButton>
                        </div>

                        <div className="flex-grow overflow-y-auto custom-scrollbar border border-black/10 rounded-sm bg-white">
                            {loading && (
                                <Loading label="indexing content" />
                            )}

                            {!loading && posts.length === 0 && (
                                <div className="text-center p-6 sm:p-8">
                                    <IconNewspaper className="size-6 text-black/15 mx-auto mb-2" />
                                    <div className="text-black/30 text-xs font-bold lowercase">
                                        no articles found
                                    </div>
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="mt-3 text-[11px] font-bold text-black/50 hover:text-black hover:underline lowercase"
                                    >
                                        + create your first post
                                    </button>
                                </div>
                            )}

                            {!loading && posts.length > 0 && (
                                <div className="divide-y divide-black/5">
                                    {posts.map(post => (
                                        <div key={post.id} className="px-3 py-2.5 flex items-center justify-between hover:bg-neutral-50 group transition-colors">
                                            <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-black text-black lowercase truncate">{post.title}</span>
                                                    {!post.published && (
                                                        <span className="bg-neutral-100 text-black/40 text-[9px] px-1 py-px rounded-sm font-black border border-black/10 uppercase tracking-wider shrink-0">draft</span>
                                                    )}
                                                    {post.isLocal && (
                                                        <span className="bg-neutral-100 text-black/40 text-[9px] px-1 py-px rounded-sm font-black border border-black/10 uppercase tracking-wider shrink-0">local</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[9px] text-black/30 lowercase">
                                                    <span>{dayjs(post.created_at).format('MMM D, YYYY')}</span>
                                                    <span>·</span>
                                                    <span className="truncate">/{post.slug}</span>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1 transition-opacity shrink-0 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <OSButton size="xs" variant="secondary" onClick={() => handleEditClick(post)}>
                                                    <Edit className="size-3 text-black/60" />
                                                </OSButton>
                                                {!post.isLocal && (
                                                    <OSButton size="xs" variant="secondary" onClick={() => deletePost(post.id)}>
                                                        <Trash2 className="size-3 text-black/40" />
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
            }
            case 'users': {
                return (
                    <div className="p-4 h-full flex flex-col text-primary">
                        <h2 className="text-sm font-bold mb-4 lowercase">manage users</h2>
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
            }
            case 'writerApplications': {
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
                                    <MessageSquare className="size-8 text-primary/20 mx-auto mb-2" />
                                    <div className="text-primary/40 italic text-sm font-medium lowercase">
                                        no transmissions found
                                    </div>
                                </div>
                            )}

                            {!writerApplicationsLoading && writerApplications.length > 0 && (
                                <div className="divide-y divide-primary/10">
                                    {writerApplications.map(application => (
                                        <div key={application.id} className="p-4 hover:bg-primary/[0.03] transition-colors space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 border border-primary/20 rounded-sm bg-accent/5">
                                                        <MessageSquare className="size-4" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-black lowercase">{application.name}</h3>
                                                        <p className="text-[10px] opacity-40 lowercase">{application.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${application.status === 'new'
                                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                                        : 'bg-green-500/10 border-green-500/20 text-green-500 opacity-60'
                                                        }`}>
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
            }
            case 'comments': {
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
                            <h2 className="text-sm font-bold lowercase">community comments</h2>
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
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <div className="size-8 rounded border border-primary/20 bg-accent/5 flex-shrink-0 overflow-hidden">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={getProfile(cp.profiles)?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getProfile(cp.profiles)?.username}`}
                                                                alt=""
                                                                className="size-full object-cover grayscale"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black">{getProfile(cp.profiles)?.username}</span>
                                                                <span className="text-[10px] opacity-40">{dayjs(cp.created_at).format('MMM D, h:mm a')}</span>
                                                            </div>
                                                            <h3 className="text-xs font-bold text-primary/90 truncate">{cp.title}</h3>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button
                                                            onClick={() => setExpandedPostId(isExpanded ? null : cp.id)}
                                                            className="flex items-center gap-1 text-[10px] font-bold text-muted hover:text-primary transition-colors px-1.5 py-0.5"
                                                        >
                                                            <MessageSquare className="size-3" />
                                                            {postReplies.length}
                                                            {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                                                        </button>
                                                        <OSButton size="xs" variant="secondary" onClick={() => {
                                                            setEditingCommentId(cp.id)
                                                            setEditingCommentContent(cp.content)
                                                            setEditingCommentTitle(cp.title)
                                                        }}>
                                                            <Edit className="size-3" />
                                                        </OSButton>
                                                        <OSButton size="xs" variant="secondary" onClick={() => deleteCommunityPost(cp.id)}>
                                                            <Trash2 className="size-3 text-red-500" />
                                                        </OSButton>
                                                    </div>
                                                </div>

                                                {/* Post Content */}
                                                <div className="px-3 pb-3 pl-14">
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                value={editingCommentTitle}
                                                                onChange={(e) => setEditingCommentTitle(e.target.value)}
                                                                className="w-full bg-primary border border-primary/30 rounded px-2 py-1 text-xs focus:outline-none"
                                                            />
                                                            <textarea
                                                                value={editingCommentContent}
                                                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                className="w-full bg-primary border border-primary/30 rounded p-2 text-xs h-24 focus:outline-none resize-none"
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <OSButton size="xs" variant="secondary" onClick={() => setEditingCommentId(null)}>cancel</OSButton>
                                                                <OSButton size="xs" variant="primary" onClick={async () => {
                                                                    const res = await updateCommunityPost(cp.id, { title: editingCommentTitle, content: editingCommentContent })
                                                                    if (res) setEditingCommentId(null)
                                                                }}>save</OSButton>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-primary/80 line-clamp-3">{cp.content}</p>
                                                    )}
                                                </div>

                                                {/* Expanded Replies */}
                                                {isExpanded && (
                                                    <div className="border-t border-primary/10 bg-black/5 divide-y divide-primary/5">
                                                        {postReplies.length === 0 ? (
                                                            <div className="p-4 text-center text-[10px] italic text-muted">no replies yet</div>
                                                        ) : (
                                                            postReplies.map(reply => (
                                                                <div key={reply.id} className="p-3 pl-14 flex items-start justify-between group">
                                                                    <div className="flex gap-3">
                                                                        <div className="size-6 rounded-sm border border-primary/20 bg-accent/5 flex-shrink-0 overflow-hidden">
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img
                                                                                src={getProfile(reply.profiles)?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getProfile(reply.profiles)?.username}`}
                                                                                alt=""
                                                                                className="size-full object-cover grayscale"
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-black">{getProfile(reply.profiles)?.username}</span>
                                                                                <span className="text-[9px] opacity-40">{dayjs(reply.created_at).format('MMM D, h:mm a')}</span>
                                                                            </div>
                                                                            <p className="text-xs text-primary/80">{reply.content}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <OSButton size="xs" variant="secondary" onClick={() => deleteCommunityReply(reply.id)}>
                                                                            <Trash2 className="size-2.5 text-red-500" />
                                                                        </OSButton>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )
                            ) : (
                                /* Replies Tab */
                                filteredCommunityReplies.length === 0 ? (
                                    <div className="text-center text-muted text-sm py-12 italic">no community replies found</div>
                                ) : (
                                    filteredCommunityReplies.map(reply => {
                                        const isEditing = editingCommentId === reply.id && commentFilter === 'replies'

                                        return (
                                            <div key={reply.id} className="border border-primary rounded bg-primary/40 p-3 flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="size-8 rounded border border-primary/20 bg-accent/5 flex-shrink-0 overflow-hidden">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={getProfile(reply.profiles)?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getProfile(reply.profiles)?.username}`}
                                                            alt=""
                                                            className="size-full object-cover grayscale"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black">{getProfile(reply.profiles)?.username}</span>
                                                            <span className="text-[10px] opacity-40">{dayjs(reply.created_at).format('MMM D, h:mm a')}</span>
                                                        </div>
                                                        {isEditing ? (
                                                            <div className="mt-2 space-y-2">
                                                                <textarea
                                                                    value={editingCommentContent}
                                                                    onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                    className="w-full bg-primary border border-primary/30 rounded p-2 text-xs h-24 focus:outline-none resize-none"
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <OSButton size="xs" variant="secondary" onClick={() => setEditingCommentId(null)}>cancel</OSButton>
                                                                    <OSButton size="xs" variant="primary" onClick={async () => {
                                                                        const res = await updateCommunityReply(reply.id, editingCommentContent)
                                                                        if (res) setEditingCommentId(null)
                                                                    }}>save</OSButton>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-primary/80">{reply.content}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <OSButton size="xs" variant="secondary" onClick={() => {
                                                        setEditingCommentId(reply.id)
                                                        setEditingCommentContent(reply.content)
                                                    }}>
                                                        <Edit className="size-3" />
                                                    </OSButton>
                                                    <OSButton size="xs" variant="secondary" onClick={() => deleteCommunityReply(reply.id)}>
                                                        <Trash2 className="size-3 text-red-500" />
                                                    </OSButton>
                                                </div>
                                            </div>
                                        )
                                    })
                                )
                            )}
                        </div>
                    </div>
                )
            }
            case 'settings': {
                return (
                    <div className="p-4 h-full flex flex-col text-primary">
                        <h2 className="text-sm font-bold mb-4">system settings</h2>
                        <div className="border border-primary rounded flex-1 bg-accent/5 flex items-center justify-center">
                            <div className="text-center p-4">
                                <Settings className="size-8 text-primary/20 mx-auto mb-2" />
                                <div className="text-primary/40 italic text-sm font-medium">
                                    configuration panel
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
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
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
