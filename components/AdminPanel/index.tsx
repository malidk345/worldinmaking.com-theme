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
import { AppWindow } from '../../context/Window'

const AdminPanel = ({ item }: { item?: AppWindow }) => {
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
                    <div className="flex flex-col gap-6 p-4 md:p-6 text-black min-h-0 overflow-auto custom-scrollbar">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <StatCard title="total views" value="---" change="0%" />
                            <StatCard title="active users" value={totalUsers.toString()} change="---" />
                            <StatCard title="total posts" value={posts.length.toString()} change={(posts.length > 0 ? "+" + posts.length : "0")} />
                            <StatCard title="transmissions" value={(communityPosts.length + communityReplies.length).toString()} change="0" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="p-4 border border-black/10 rounded-sm bg-white/50 backdrop-blur-sm flex flex-col gap-4">
                                <h3 className="text-[11px] font-black tracking-widest text-black/40 flex items-center gap-2 lowercase">
                                    <IconTerminal className="size-3.5" /> system environment
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-black/40 lowercase">database state</span>
                                        <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            connected
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-black/40 lowercase">auth backend</span>
                                        <span className="font-bold lowercase">active</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-black/40 lowercase">access level</span>
                                        <span className="font-bold lowercase bg-neutral-100 px-1.5 py-0.5 rounded-sm">{profile?.role || 'authorized'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border border-black/10 rounded-sm bg-white/50 backdrop-blur-sm flex flex-col gap-4">
                                <h3 className="text-[11px] font-black tracking-widest text-black/40 flex items-center gap-2 lowercase">
                                    <IconActivity className="size-3.5" /> recently active
                                </h3>
                                <div className="space-y-3">
                                    {posts.slice(0, 3).map(post => (
                                        <div key={post.id} className="flex items-center justify-between text-xs group cursor-pointer" onClick={() => handleEditClick(post)}>
                                            <span className="truncate max-w-[150px] font-medium group-hover:underline lowercase">{post.title}</span>
                                            <span className="text-black/30 text-[10px] lowercase">{dayjs(post.created_at).format('MMM D')}</span>
                                        </div>
                                    ))}
                                    {posts.length === 0 && <span className="text-xs text-black/20 lowercase italic">no recent activity</span>}
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
                    <div className="p-4 md:p-6 h-full flex flex-col text-black min-h-0">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex flex-col">
                                <h2 className="text-xs font-black uppercase tracking-widest text-black/30">publishing console</h2>
                                <p className="text-[10px] text-black/20 lowercase">manage and curate your nodes</p>
                            </div>
                            <OSButton size="sm" onClick={() => setIsCreating(true)} className="!bg-black !text-white hover:!bg-black/90 shadow-lg shadow-black/10">
                                <div className="flex items-center gap-1.5 px-1 py-0.5">
                                    <Plus className="size-3.5" />
                                    <span className="text-xs font-bold lowercase">new node</span>
                                </div>
                            </OSButton>
                        </div>

                        <div className="flex-grow overflow-auto custom-scrollbar bg-white/50 border border-black/5 rounded-sm shadow-inner min-h-0">
                            {loading && (
                                <div className="h-48 flex items-center justify-center">
                                    <Loading label="indexing your world" />
                                </div>
                            )}

                            {!loading && posts.length === 0 && (
                                <div className="text-center py-20 px-6">
                                    <div className="size-16 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
                                        <IconNewspaper className="size-8 text-black/10" />
                                    </div>
                                    <p className="text-xs font-bold text-black/40 lowercase mb-1">no articles found in the database</p>
                                    <p className="text-[10px] text-black/20 lowercase mb-6">your thinking hasn&apos;t been archived yet</p>
                                    <OSButton size="sm" onClick={() => setIsCreating(true)}>
                                        <span className="lowercase font-bold px-2">create first node</span>
                                    </OSButton>
                                </div>
                            )}

                            {!loading && posts.length > 0 && (
                                <div className="grid grid-cols-1 gap-px bg-black/5">
                                    {posts.map(post => (
                                        <div key={post.id} className="bg-white px-4 py-3 flex items-center justify-between hover:bg-neutral-50 group transition-all cursor-default">
                                            <div className="flex flex-col gap-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[13px] font-bold text-black/90 lowercase group-hover:text-black transition-colors">{post.title}</span>
                                                    <div className="flex gap-1">
                                                        {!post.published && (
                                                            <span className="bg-amber-50 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-full font-black border border-amber-200/50 lowercase tracking-wider">draft</span>
                                                        )}
                                                        {post.isLocal && (
                                                            <span className="bg-neutral-100 text-black/40 text-[8px] px-1.5 py-0.5 rounded-full font-black border border-black/10 lowercase tracking-wider">local</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-black/25 lowercase font-medium">
                                                    <span className="flex items-center gap-1"><IconActivity className="size-3" /> {dayjs(post.created_at).format('MMM D, YYYY')}</span>
                                                    <span>·</span>
                                                    <span className="opacity-60 truncate">/{post.slug}</span>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1 flex-shrink-0 transition-all duration-300 ${isMobile ? 'opacity-100' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                                                <OSButton size="xs" variant="secondary" onClick={() => handleEditClick(post)} className="hover:!bg-black hover:!text-white">
                                                    <Edit className="size-3" />
                                                </OSButton>
                                                {!post.isLocal && (
                                                    <OSButton size="xs" variant="secondary" onClick={() => {
                                                        if (window.confirm('permanently delete this node?')) deletePost(post.id)
                                                    }} className="hover:!bg-rose-50 hover:!text-rose-600">
                                                        <Trash2 className="size-3" />
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
                    <div className="p-4 md:p-6 h-full flex flex-col text-black min-h-0">
                        <div className="flex flex-col mb-6">
                            <h2 className="text-xs font-black uppercase tracking-widest text-black/30">user directory</h2>
                            <p className="text-[10px] text-black/20 lowercase">manage platform access & roles</p>
                        </div>
                        <div className="border border-black/5 rounded-sm flex-1 bg-white/50 shadow-inner flex items-center justify-center">
                            <div className="text-center p-8">
                                <IconUser className="size-10 text-black/5 mx-auto mb-4" />
                                <div className="text-black/30 text-xs font-bold lowercase">
                                    user management matrix coming soon
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            case 'writerApplications': {
                return (
                    <div className="p-4 md:p-6 h-full flex flex-col text-black min-h-0">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col">
                                <h2 className="text-xs font-black uppercase tracking-widest text-black/30">writer transmissions</h2>
                                <p className="text-[10px] text-black/20 lowercase">review applications & messages</p>
                            </div>
                            <span className="text-[10px] font-black text-black/20 uppercase tracking-[0.1em]">
                                {writerApplications.length} total
                            </span>
                        </div>

                        <div className="flex-grow overflow-auto custom-scrollbar border border-black/5 rounded-sm bg-white/50 shadow-inner min-h-0">
                            {writerApplicationsLoading && (
                                <div className="h-48 flex items-center justify-center">
                                    <Loading label="connecting to orbital comms" />
                                </div>
                            )}

                            {!writerApplicationsLoading && writerApplications.length === 0 && (
                                <div className="text-center py-20">
                                    <MessageSquare className="size-12 text-black/5 mx-auto mb-4" />
                                    <p className="text-xs font-bold text-black/40 lowercase italic">no active transmissions</p>
                                </div>
                            )}

                            {!writerApplicationsLoading && writerApplications.length > 0 && (
                                <div className="divide-y divide-black/5">
                                    {writerApplications.map(application => (
                                        <div key={application.id} className="p-5 hover:bg-neutral-50 transition-all group border-l-2 border-transparent hover:border-black">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-full border border-black/10 bg-black/5 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-black lowercase">{application.name.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-black text-black lowercase">{application.name}</h3>
                                                        <p className="text-[10px] text-black/30 lowercase font-medium">{application.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${application.status === 'new'
                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                        : 'bg-neutral-100 border-neutral-200 text-black/40'
                                                        }`}>
                                                        {application.status}
                                                    </span>
                                                    {application.status !== 'reviewed' && (
                                                        <OSButton
                                                            size="xs"
                                                            variant="secondary"
                                                            onClick={() => updateWriterApplicationStatus(application.id, 'reviewed')}
                                                            className="hover:!bg-black hover:!text-white"
                                                        >
                                                            <span className="text-[10px] lowercase px-1">mark read</span>
                                                        </OSButton>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="ml-14 p-4 rounded-sm bg-black/[0.02] border border-black/[0.03]">
                                                <p className="text-xs leading-relaxed text-black/70 whitespace-pre-wrap font-sans">
                                                    {application.message}
                                                </p>
                                            </div>
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
                    <div className="p-4 md:p-6 h-full flex flex-col text-black min-h-0">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 flex-shrink-0">
                            <div className="flex flex-col">
                                <h2 className="text-xs font-black uppercase tracking-widest text-black/30">community moderation</h2>
                                <p className="text-[10px] text-black/20 lowercase">moderate discussions & responses</p>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-black/20 uppercase tracking-wider">
                                <span>{communityPosts.length} posts</span>
                                <span className="opacity-50">·</span>
                                <span>{communityReplies.length} replies</span>
                            </div>
                        </div>

                        {/* Search + Filter Bar */}
                        <div className="flex gap-2 mb-4 flex-shrink-0">
                            <div className="flex-1 relative">
                                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30" />
                                <input
                                    type="text"
                                    value={commentSearchQuery}
                                    onChange={(e) => setCommentSearchQuery(e.target.value)}
                                    placeholder="search transmissions..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-black/5 rounded-sm text-black placeholder:text-black/20 focus:outline-none focus:border-black/20 transition-all font-sans"
                                />
                            </div>
                            <div className="flex bg-white border border-black/5 rounded-sm p-0.5 shadow-sm">
                                <button
                                    onClick={() => setCommentFilter('posts')}
                                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-[1px] ${commentFilter === 'posts' ? 'bg-black text-white shadow-sm' : 'text-black/30 hover:text-black/60'}`}
                                >
                                    posts
                                </button>
                                <button
                                    onClick={() => setCommentFilter('replies')}
                                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-[1px] ${commentFilter === 'replies' ? 'bg-black text-white shadow-sm' : 'text-black/30 hover:text-black/60'}`}
                                >
                                    replies
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 bg-white/30 border border-black/5 rounded-sm shadow-inner p-2">
                            {communityLoading ? (
                                <div className="h-48 flex items-center justify-center">
                                    <Loading label="scanning neural networks" />
                                </div>
                            ) : commentFilter === 'posts' ? (
                                filteredCommunityPosts.length === 0 ? (
                                    <div className="text-center text-black/20 text-xs py-12 italic lowercase font-medium">no community posts indexed</div>
                                ) : (
                                    filteredCommunityPosts.map(cp => {
                                        const isEditing = editingCommentId === cp.id && commentFilter === 'posts'
                                        const postReplies = communityReplies.filter(r => r.post_id === cp.id)
                                        const isExpanded = expandedPostId === cp.id

                                        return (
                                            <div key={cp.id} className="border border-black/5 rounded-sm bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                                {/* Post Header */}
                                                <div className="p-3 flex items-start justify-between gap-2 border-b border-black/[0.02]">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="size-8 rounded-full border border-black/5 bg-black/5 flex-shrink-0 overflow-hidden">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={getProfile(cp.profiles)?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getProfile(cp.profiles)?.username}`}
                                                                alt=""
                                                                className="size-full object-cover grayscale opacity-80"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-black text-black/80 lowercase">{getProfile(cp.profiles)?.username}</span>
                                                                <span className="text-[9px] text-black/20 font-medium">{dayjs(cp.created_at).format('MMM D, h:ma')}</span>
                                                            </div>
                                                            <h3 className="text-[11px] font-bold text-black/60 truncate lowercase">{cp.title}</h3>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <button
                                                            onClick={() => setExpandedPostId(isExpanded ? null : cp.id)}
                                                            className={`flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full transition-all ${isExpanded ? 'bg-black text-white' : 'bg-neutral-50 text-black/40 hover:bg-neutral-100'}`}
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
                                                        <OSButton size="xs" variant="secondary" onClick={() => {
                                                            if (window.confirm('delete this community post?')) deleteCommunityPost(cp.id)
                                                        }}>
                                                            <Trash2 className="size-3 text-rose-500/50 hover:text-rose-500" />
                                                        </OSButton>
                                                    </div>
                                                </div>

                                                {/* Post Content */}
                                                <div className="px-4 py-3 ml-11">
                                                    {isEditing ? (
                                                        <div className="space-y-3">
                                                            <input
                                                                type="text"
                                                                value={editingCommentTitle}
                                                                onChange={(e) => setEditingCommentTitle(e.target.value)}
                                                                className="w-full bg-neutral-50 border border-black/5 rounded-sm px-3 py-2 text-xs focus:outline-none font-bold"
                                                            />
                                                            <textarea
                                                                value={editingCommentContent}
                                                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                className="w-full bg-neutral-50 border border-black/5 rounded-sm p-3 text-xs h-24 focus:outline-none resize-none font-sans"
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <OSButton size="xs" variant="secondary" onClick={() => setEditingCommentId(null)}>cancel</OSButton>
                                                                <OSButton size="xs" onClick={async () => {
                                                                    const res = await updateCommunityPost(cp.id, { title: editingCommentTitle, content: editingCommentContent })
                                                                    if (res) setEditingCommentId(null)
                                                                }} className="!bg-black !text-white">save changes</OSButton>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-black/60 font-sans leading-relaxed line-clamp-3">{cp.content}</p>
                                                    )}
                                                </div>

                                                {/* Expanded Replies */}
                                                {isExpanded && (
                                                    <div className="bg-neutral-50 border-t border-black/[0.03] divide-y divide-black/[0.03]">
                                                        {postReplies.length === 0 ? (
                                                            <div className="p-4 text-center text-[9px] font-black uppercase tracking-widest text-black/15">no transmissions found</div>
                                                        ) : (
                                                            postReplies.map(reply => (
                                                                <div key={reply.id} className="p-3 pl-14 flex items-start justify-between group bg-white/50">
                                                                    <div className="flex gap-3">
                                                                        <div className="size-6 rounded-full border border-black/5 bg-black/5 flex-shrink-0 overflow-hidden">
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img
                                                                                src={getProfile(reply.profiles)?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getProfile(reply.profiles)?.username}`}
                                                                                alt=""
                                                                                className="size-full object-cover grayscale opacity-70"
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-black text-black/70 lowercase">{getProfile(reply.profiles)?.username}</span>
                                                                                <span className="text-[8px] text-black/20 font-medium">{dayjs(reply.created_at).format('MMM D, h:ma')}</span>
                                                                            </div>
                                                                            <p className="text-[11px] text-black/50 font-sans leading-relaxed">{reply.content}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                                        <OSButton size="xs" variant="secondary" onClick={() => {
                                                                            if (window.confirm('delete this reply?')) deleteCommunityReply(reply.id)
                                                                        }}>
                                                                            <Trash2 className="size-2.5 text-rose-400" />
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
                                /* Replies Tab Styling - Concise */
                                filteredCommunityReplies.length === 0 ? (
                                    <div className="text-center text-black/20 text-xs py-12 italic lowercase font-medium">no community replies found</div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredCommunityReplies.map(reply => {
                                            const isEditing = editingCommentId === reply.id && commentFilter === 'replies'

                                            return (
                                                <div key={reply.id} className="bg-white border border-black/5 rounded-sm p-3 flex items-start justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-md transition-shadow">
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className="size-8 rounded-full border border-black/5 bg-black/5 flex-shrink-0 overflow-hidden">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={getProfile(reply.profiles)?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getProfile(reply.profiles)?.username}`}
                                                                alt=""
                                                                className="size-full object-cover grayscale opacity-70"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-[11px] font-black text-black/80 lowercase">{getProfile(reply.profiles)?.username}</span>
                                                                <span className="text-[9px] text-black/20 font-medium">{dayjs(reply.created_at).format('MMM D, h:ma')}</span>
                                                            </div>
                                                            {isEditing ? (
                                                                <div className="mt-2 space-y-2">
                                                                    <textarea
                                                                        value={editingCommentContent}
                                                                        onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                        className="w-full bg-neutral-50 border border-black/5 rounded-sm p-3 text-xs h-24 focus:outline-none resize-none font-sans"
                                                                    />
                                                                    <div className="flex justify-end gap-2">
                                                                        <OSButton size="xs" variant="secondary" onClick={() => setEditingCommentId(null)}>cancel</OSButton>
                                                                        <OSButton size="xs" onClick={async () => {
                                                                            const res = await updateCommunityReply(reply.id, editingCommentContent)
                                                                            if (res) setEditingCommentId(null)
                                                                        }} className="!bg-black !text-white">save changes</OSButton>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[11px] text-black/60 font-sans leading-relaxed">{reply.content}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 self-start pt-1">
                                                        <OSButton size="xs" variant="secondary" onClick={() => {
                                                            setEditingCommentId(reply.id)
                                                            setEditingCommentContent(reply.content)
                                                        }}>
                                                            <Edit className="size-3" />
                                                        </OSButton>
                                                        <OSButton size="xs" variant="secondary" onClick={() => {
                                                            if (window.confirm('permanently delete this reply?')) deleteCommunityReply(reply.id)
                                                        }}>
                                                            <Trash2 className="size-3 text-rose-500/50 hover:text-rose-500" />
                                                        </OSButton>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )
            }
            case 'settings': {
                return (
                    <div className="p-4 md:p-6 h-full flex flex-col text-black min-h-0">
                        <div className="flex flex-col mb-6">
                            <h2 className="text-xs font-black uppercase tracking-widest text-black/30">console configuration</h2>
                            <p className="text-[10px] text-black/20 lowercase">adjust system level parameters</p>
                        </div>
                        <div className="border border-black/5 rounded-sm flex-1 bg-white/50 shadow-inner flex items-center justify-center">
                            <div className="text-center p-8">
                                <Settings className="size-10 text-black/5 mx-auto mb-4" />
                                <div className="text-black/30 text-xs font-bold lowercase">
                                    system preferences coming in orbital update
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
        <div className="flex h-full w-full bg-[#f8fafb] text-black overflow-hidden font-sans">
            {/* Sidebar */}
            <div className={`flex-shrink-0 border-r border-black/5 bg-white/50 backdrop-blur-md flex flex-col ${isMobile ? 'w-12 items-center py-4' : 'w-44 py-6'}`}>
                {!isMobile && (
                    <div className="px-5 mb-8">
                        <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-black/80" />
                            <h1 className="font-black text-[13px] tracking-tight text-black lowercase">wim console</h1>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-0.5 px-2 w-full">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-[12px] transition-all text-left w-full
                                ${activeTab === tab.id
                                    ? 'bg-black text-white font-bold shadow-md shadow-black/10'
                                    : 'text-black/40 hover:bg-black/5 hover:text-black/80'}
                                ${isMobile ? 'justify-center px-0' : ''}
                            `}
                        >
                            <tab.icon className={`size-4 flex-shrink-0 ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`} />
                            {!isMobile && <span className="lowercase">{tab.label}</span>}
                        </button>
                    ))}
                </div>

                <div className="mt-auto px-4">
                    <div className="text-[9px] font-black text-black/15 uppercase tracking-[0.2em]">system v1.2.5</div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafb] overflow-hidden">
                <main className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {renderContent()}
                </main>

                {/* Global Inner Footer - for RichTextEditor toolkit etc */}
                <div className="sticky bottom-0 z-50 w-full pointer-events-none pb-1 mt-auto px-1.5">
                    <div id={`window-inner-footer-${item?.key || app?.focusedWindow?.key}`} className="pointer-events-auto" />
                </div>
            </div>
        </div>
    )
}

const StatCard = ({ title, value, change }: { title: string, value: string, change: string }) => {
    const isPositive = change.startsWith('+')
    return (
        <div className="p-4 border border-black/10 rounded-sm bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-lg hover:shadow-black/5 transition-all group">
            <h4 className="text-[10px] font-black text-black/30 mb-2 uppercase tracking-wider group-hover:text-black/50 transition-colors">{title}</h4>
            <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black tracking-tight text-black">{value}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${isPositive
                    ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                    : change === '---' || change === '0%'
                        ? 'text-neutral-400 bg-neutral-50 border-neutral-100'
                        : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                    {change}
                </span>
            </div>
        </div>
    )
}

export default AdminPanel
