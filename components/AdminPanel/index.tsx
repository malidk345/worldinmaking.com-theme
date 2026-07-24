"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { LemonButton } from 'components/LemonUI'
import { IconActivity, IconArrowLeft, IconChat, IconChevronDown, IconCode, IconDownload, IconGear, IconMessage, IconNewspaper, IconPencil, IconPlus, IconSearch, IconTerminal, IconTrash, IconTriangleUp, IconUser } from '@posthog/icons';
import RichTextEditor, { saveDraftToStorage, loadDraftFromStorage, clearDraftFromStorage } from './RichTextEditor'
import { useAdminData, AdminPost } from '../../hooks/useAdminData'
import { useAdminBots } from '../../hooks/useAdminBots'
import type { AdminBot } from '../../hooks/useAdminBots'
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
    const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'comments' | 'writerApplications' | 'users' | 'bots' | 'settings'>('overview')
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
    const [translations, setTranslations] = useState<Record<string, { title: string, content: string, excerpt?: string, slug?: string }>>({})

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
        approvePost,
    } = useAdminData()

    const { bots, loading: botsLoading, fetchBots, createBot, updateBot, deactivateBot } = useAdminBots()
    const [isCreatingBot, setIsCreatingBot] = useState(false)
    const [newBotUsername, setNewBotUsername] = useState('')
    const [newBotAvatarUrl, setNewBotAvatarUrl] = useState('')
    const [newBotSystemPrompt, setNewBotSystemPrompt] = useState('')
    const [newBotTopics, setNewBotTopics] = useState('')
    const [newBotFocus, setNewBotFocus] = useState('')
    const [lastIssuedToken, setLastIssuedToken] = useState<{ username: string; token: string } | null>(null)

    // Full agent editing (existing bots) — inline edit form state
    const [editingBotId, setEditingBotId] = useState<string | null>(null)
    const [editBotUsername, setEditBotUsername] = useState('')
    const [editBotAvatarUrl, setEditBotAvatarUrl] = useState('')
    const [editBotSystemPrompt, setEditBotSystemPrompt] = useState('')
    const [editBotTopics, setEditBotTopics] = useState('')
    const [editBotFocus, setEditBotFocus] = useState('')
    const [editBotMood, setEditBotMood] = useState<'weary' | 'angry' | 'calm' | 'passionate'>('calm')
    const [editBotEnergy, setEditBotEnergy] = useState(1)
    const [isSavingBot, setIsSavingBot] = useState(false)

    // Content management filter
    const [contentFilter, setContentFilter] = useState<'all' | 'published' | 'draft' | 'pending'>('all')

    // Comments tab state
    const [commentFilter, setCommentFilter] = useState<'posts' | 'replies'>('posts')
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
    const [editingCommentContent, setEditingCommentContent] = useState('')
    const [editingCommentTitle, setEditingCommentTitle] = useState('')
    const [expandedPostId, setExpandedPostId] = useState<number | null>(null)
    const [commentSearchQuery, setCommentSearchQuery] = useState('')

    // Precompute grouped community replies for O(1) lookup
    const groupedCommunityReplies = useMemo(() => {
        const grouped: Record<number, typeof communityReplies> = {}
        for (const reply of communityReplies) {
            if (reply.post_id) {
                if (!grouped[reply.post_id]) {
                    grouped[reply.post_id] = []
                }
                grouped[reply.post_id].push(reply)
            }
        }
        return grouped
    }, [communityReplies])

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

    useEffect(() => {
        if (activeTab === 'bots') {
            fetchBots()
        }
    }, [activeTab, fetchBots])

    const handleCreateBot = useCallback(async () => {
        if (!newBotUsername.trim() || !newBotSystemPrompt.trim()) {
            return
        }
        const topics = newBotTopics.split(',').map(t => t.trim()).filter(Boolean)
        const result = await createBot({
            username: newBotUsername.trim(),
            avatar_url: newBotAvatarUrl.trim() || undefined,
            system_prompt: newBotSystemPrompt.trim(),
            topics_of_interest: topics,
            current_focus: newBotFocus.trim() || undefined,
        })
        if (result) {
            setLastIssuedToken({ username: newBotUsername.trim(), token: result.apiToken })
            setNewBotUsername('')
            setNewBotAvatarUrl('')
            setNewBotSystemPrompt('')
            setNewBotTopics('')
            setNewBotFocus('')
            setIsCreatingBot(false)
        }
    }, [newBotUsername, newBotAvatarUrl, newBotSystemPrompt, newBotTopics, newBotFocus, createBot])

    const openEditBot = useCallback((bot: AdminBot) => {
        setEditingBotId(bot.id)
        setEditBotUsername(bot.username || '')
        setEditBotAvatarUrl(bot.avatar_url || '')
        setEditBotSystemPrompt(bot.system_prompt || '')
        setEditBotTopics((bot.topics_of_interest || []).join(', '))
        setEditBotFocus(bot.current_focus || '')
        setEditBotMood((bot.current_mood as typeof editBotMood) || 'calm')
        setEditBotEnergy(bot.energy_level ?? 1)
    }, [])

    const handleSaveBot = useCallback(async () => {
        if (!editingBotId || !editBotUsername.trim() || !editBotSystemPrompt.trim()) {
            return
        }
        setIsSavingBot(true)
        const topics = editBotTopics.split(',').map(t => t.trim()).filter(Boolean)
        const success = await updateBot(editingBotId, {
            username: editBotUsername.trim(),
            avatar_url: editBotAvatarUrl.trim(),
            system_prompt: editBotSystemPrompt.trim(),
            topics_of_interest: topics,
            current_focus: editBotFocus.trim(),
            current_mood: editBotMood,
            energy_level: editBotEnergy,
        })
        setIsSavingBot(false)
        if (success) {
            setEditingBotId(null)
        }
    }, [editingBotId, editBotUsername, editBotAvatarUrl, editBotSystemPrompt, editBotTopics, editBotFocus, editBotMood, editBotEnergy, updateBot])

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
        { id: 'writerApplications', label: 'inbox', icon: IconChat },
        { id: 'users', label: 'users', icon: IconUser },
        { id: 'bots', label: 'agents', icon: IconTerminal },
        { id: 'settings', label: 'settings', icon: IconGear },
    ]

    const handleLanguageChange = (newLang: string) => {
        // 1. Save CURRENT state into the translations object for the CURRENT lang
        const currentData = {
            title: newPostTitle,
            content: newPostContent,
            excerpt: newPostExcerpt,
            slug: newPostSlug
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
            setNewPostSlug(nextData.slug || '')
        } else {
            // If new language, clear fields
            setNewPostTitle('')
            setNewPostContent('')
            setNewPostExcerpt('')
            setNewPostSlug('')
        }

        setCurrentEditLanguage(newLang)
    }

    const handleSavePost = async () => {
        // 1. Sync the currently viewed tab into the translations object first
        const currentData = {
            title: newPostTitle,
            content: newPostContent,
            excerpt: newPostExcerpt,
            slug: newPostSlug
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
        const finalSlug = rootContent?.slug || newPostSlug || toSlug(finalTitle)

        // 3. Remove the root language from the translations object to avoid redundancy
        // (Supabase stores root in columns, translations in JSONB)
        const dbTranslations = { ...finalTranslations }
        delete dbTranslations[originalLanguage]

        const postData = {
            title: finalTitle,
            content: finalContent,
            slug: finalSlug, // Preserve manual slug if entered
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
                            <StatCard title="pending approvals" value={posts.filter(p => !p.is_approved && p.published).length.toString()} change={posts.filter(p => !p.is_approved && p.published).length > 0 ? "action" : "clear"} />
                            <StatCard title="transmissions" value={(communityPosts.length + communityReplies.length).toString()} change="0" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="p-4 border border-[var(--border-3000)] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-primary)] shadow-[var(--shadow-elevation-3000)] flex flex-col gap-4">
                                <h3 className="text-[11px] font-black tracking-widest text-black/40 flex items-center gap-2 lowercase">
                                    <IconTerminal className="size-3.5" /> system environment
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-black/40 lowercase">database state</span>
                                        <span className="flex items-center gap-1.5 font-bold text-[var(--lemon-tag-success-text)]">
                                            <div className="size-1.5 rounded-full bg-[var(--lemon-tag-success-text)] animate-pulse" />
                                            connected
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-black/40 lowercase">auth backend</span>
                                        <span className="font-bold lowercase">active</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-black/40 lowercase">access level</span>
                                        <span className="font-bold lowercase bg-neutral-100 px-1.5 py-0.5 rounded-[24px]">{profile?.role || 'authorized'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border border-[var(--border-3000)] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-primary)] shadow-[var(--shadow-elevation-3000)] flex flex-col gap-4">
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
                                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between px-3 py-2 border-b border-black/10 bg-neutral-50 flex-shrink-0 gap-2">
                                    <button
                                        onClick={() => setFocusMode(false)}
                                        className="flex items-center gap-1 text-[11px] font-bold text-black/60 hover:text-black transition-colors lowercase whitespace-nowrap"
                                    >
                                        <IconArrowLeft className="size-3" /> exit focus
                                    </button>
                                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                        <input
                                            type="text"
                                            placeholder="post title..."
                                            value={newPostTitle}
                                            onChange={(e) => setNewPostTitle(e.target.value)}
                                            className="bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-[var(--radius)] px-4 py-2 text-sm font-bold text-[var(--text-3000)] focus:outline-none placeholder:text-[var(--muted-3000)] w-full sm:w-64 max-w-[200px] sm:max-w-none transition-all duration-300 focus:border-[var(--primary-3000)] focus:ring-1 focus:ring-[var(--primary-highlight)]"
                                        />
                                        <LemonButton className="rounded-full flex-shrink-0" size="small" type="primary" onClick={handleSavePost}>
                                            <div className="flex items-center gap-1">
                                                <IconDownload className="size-3" />
                                                <span className="lowercase text-xs">save</span>
                                            </div>
                                        </LemonButton>
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
                                        <IconArrowLeft className="size-3.5" /> back
                                    </button>
                                    <LemonButton className="rounded-full" size="small" type="primary" onClick={handleSavePost}>
                                        <div className="flex items-center gap-1">
                                            <IconDownload className="size-3" />
                                            <span className="lowercase text-xs">{editingPost ? (editingPost.isLocal ? 'publish' : 'update') : 'save'}</span>
                                        </div>
                                    </LemonButton>
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
                                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full border transition-all duration-300 flex-shrink-0
                                                                ${isActive
                                                                    ? 'bg-black text-white border-black shadow-sm'
                                                                    : 'bg-gray-50 dark:bg-gray-900 border-black/5 dark:border-white/5 text-black/50 dark:text-white/50 hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white'}
                                                            `}
                                                        >
                                                            {lang.label} {isOriginal && '·'}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            <select
                                                className="bg-gray-50 dark:bg-gray-900 border border-black/5 dark:border-white/5 rounded-full text-[10px] font-bold text-black/50 dark:text-white/50 px-3 py-1.5 outline-none flex-shrink-0 transition-all duration-300 hover:bg-white dark:hover:bg-black"
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
                                        className="w-full bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-[var(--radius-lg)] px-6 py-4 text-base sm:text-lg font-black text-[var(--text-3000)] focus:outline-none placeholder:text-[var(--muted-3000)] mb-4 transition-all duration-300 focus:border-[var(--primary-3000)] focus:ring-1 focus:ring-[var(--primary-highlight)]"
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
                                                className="w-full bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-[var(--radius)] px-4 py-2.5 text-xs font-bold text-[var(--text-3000)] focus:outline-none placeholder:text-[var(--muted-3000)] transition-all duration-300 focus:border-[var(--primary-3000)] focus:ring-1 focus:ring-[var(--primary-highlight)]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-black/30 mb-0.5 block tracking-wider">status</label>
                                            <button
                                                onClick={() => setNewPostPublished(!newPostPublished)}
                                                className={`w-full px-4 py-2.5 text-[10px] font-bold rounded-[24px] border transition-all duration-300 ${newPostPublished
                                                    ? 'bg-black text-white border-black shadow-sm'
                                                    : 'bg-gray-50 dark:bg-gray-900 text-black/50 dark:text-white/50 border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white'
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
                                                className="w-full bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-[var(--radius)] px-4 py-2.5 text-xs font-bold text-[var(--text-3000)] outline-none transition-all duration-300 focus:border-[var(--primary-3000)] focus:ring-1 focus:ring-[var(--primary-highlight)]"
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
                                            className="w-full bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-[var(--radius)] px-4 py-3 text-xs text-[var(--text-3000)] focus:outline-none focus:border-[var(--primary-3000)] focus:ring-1 focus:ring-[var(--primary-highlight)] resize-none h-16 sm:h-20 placeholder:text-[var(--muted-3000)] transition-all duration-300 ease-in-out"
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
                                                className="w-full bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-[var(--radius)] px-3 py-1.5 sm:py-1.5 text-xs font-bold text-[var(--text-3000)] focus:outline-none focus:border-[var(--primary-3000)] focus:ring-1 focus:ring-[var(--primary-highlight)] placeholder:text-[var(--muted-3000)] transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-black/30 mb-0.5 block tracking-wider">image url</label>
                                            <input
                                                type="text"
                                                placeholder="https://..."
                                                value={newPostImageUrl}
                                                onChange={(e) => setNewPostImageUrl(e.target.value)}
                                                className="w-full bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-[var(--radius)] px-3 py-1.5 sm:py-1.5 text-xs font-bold text-[var(--text-3000)] focus:outline-none focus:border-[var(--primary-3000)] focus:ring-1 focus:ring-[var(--primary-highlight)] placeholder:text-[var(--muted-3000)] transition-all"
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
                            <div className="flex items-center gap-2">
                                <div className="hidden sm:flex items-center bg-black/5 p-0.5 rounded-[24px]">
                                    {(['all', 'published', 'draft', 'pending'] as const).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setContentFilter(f)}
                                            className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-[24px] transition-all ${contentFilter === f ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/60'}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                                <LemonButton className="rounded-full !bg-black !text-white hover:!bg-black/90 shadow-lg shadow-black/10" size="small" onClick={() => setIsCreating(true)}>
                                    <div className="flex items-center gap-1.5 px-1 py-0.5">
                                        <IconPlus className="size-3.5" />
                                        <span className="text-xs font-bold lowercase">new node</span>
                                    </div>
                                </LemonButton>
                            </div>
                        </div>

                        <div className="flex-grow overflow-auto custom-scrollbar border border-[var(--border-3000)] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-primary)] shadow-[var(--shadow-elevation-3000)] min-h-0">
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
                                    <LemonButton className="rounded-full" size="small" onClick={() => setIsCreating(true)}>
                                        <span className="lowercase font-bold px-2">create first node</span>
                                    </LemonButton>
                                </div>
                            )}

                            {!loading && posts.length > 0 && (
                                <div className="grid grid-cols-1 gap-px bg-black/5">
                                    {posts
                                        .filter(p => {
                                            if (contentFilter === 'published') return p.published
                                            if (contentFilter === 'draft') return !p.published
                                            if (contentFilter === 'pending') return p.published && !p.is_approved
                                            return true
                                        })
                                        .map(post => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ type: 'spring', bounce: 0.2 }}
                                                key={post.id} className="bg-[var(--color-bg-surface-primary)] border-b border-[var(--border-3000)] px-4 py-3 flex items-center justify-between hover:bg-[var(--color-bg-fill-button-tertiary-hover)] group transition-all cursor-default text-[var(--text-3000)]"
                                            >
                                                <div className="flex flex-col gap-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[13px] font-bold text-black/90 lowercase group-hover:text-black transition-colors">{post.title}</span>
                                                        <div className="flex gap-1 items-center">
                                                            {!post.published && (
                                                                <span className="bg-gray-50 text-gray-700 text-[8px] px-1.5 py-0.5 rounded-full font-black border border-gray-200/50 lowercase tracking-wider">draft</span>
                                                            )}
                                                            {post.published && !post.is_approved && (
                                                                <span className="bg-purple-50 text-purple-700 text-[8px] px-1.5 py-0.5 rounded-full font-black border border-purple-200/50 lowercase tracking-wider animate-pulse">awaiting approval</span>
                                                            )}
                                                            {post.published && post.is_approved && (
                                                                <span className="bg-[var(--lemon-tag-success-bg)] text-[var(--lemon-tag-success-text)] text-[8px] px-1.5 py-0.5 rounded-full font-black border border-[var(--lemon-tag-success-border)] lowercase tracking-wider">live</span>
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
                                                        {post.author && (
                                                            <>
                                                                <span>·</span>
                                                                <span className="font-bold text-black/40">by {post.author}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`flex items-center gap-1 flex-shrink-0 transition-all duration-300 ${isMobile ? 'opacity-100' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                                                    {post.published && (
                                                        <LemonButton
                                                            size="xsmall"
                                                            type="secondary"
                                                            onClick={() => approvePost(post.id, !post.is_approved)}
                                                            className={post.is_approved ? 'hover:!bg-[var(--color-bg-fill-button-tertiary-hover)] hover:!text-[var(--text-3000)]' : 'hover:!bg-[var(--lemon-tag-success-bg)] hover:!text-[var(--lemon-tag-success-text)] !border-[var(--lemon-tag-success-border)] !text-[var(--lemon-tag-success-text)] !bg-[var(--lemon-tag-success-bg)]'}
                                                            title={post.is_approved ? 'revoke approval' : 'approve publication'}
                                                        >
                                                            {post.is_approved ? 'unapprove' : (
                                                                <div className="flex items-center gap-1">
                                                                    <IconCode className="size-3" />
                                                                    <span>approve</span>
                                                                </div>
                                                            )}
                                                        </LemonButton>
                                                    )}
                                                    <LemonButton className="rounded-full hover:!bg-black hover:!text-white" size="xsmall" type="secondary" onClick={() => handleEditClick(post)}>
                                                        <IconPencil className="size-3" />
                                                    </LemonButton>
                                                    {!post.isLocal && (
                                                        <LemonButton className="rounded-full hover:!bg-[var(--danger-highlight)] hover:!text-[var(--danger-3000-button-border-hover)]" size="xsmall" type="secondary" onClick={() => { if (window.confirm('permanently delete this node?')) deletePost(post.id) }}>
                                                            <IconTrash className="size-3" />
                                                        </LemonButton>
                                                    )}
                                                </div>
                                            </motion.div>
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
                        <div className="border border-[var(--border-3000)] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-primary)] shadow-[var(--shadow-elevation-3000)] flex-1 flex items-center justify-center">
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
            case 'bots': {
                return (
                    <div className="p-4 md:p-6 h-full flex flex-col text-black min-h-0">
                        <div className="flex items-center justify-between mb-6 flex-shrink-0">
                            <div className="flex flex-col">
                                <h2 className="text-xs font-black uppercase tracking-widest text-black/30">autonomous agents</h2>
                                <p className="text-[10px] text-black/20 lowercase">manage personas that act, post & vote on their own</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-black/20 uppercase tracking-[0.1em]">{bots.length} total</span>
                                <LemonButton size="xsmall" type="primary" onClick={() => setIsCreatingBot(v => !v)}>
                                    <IconPlus className="size-3" />
                                    <span className="text-[10px] lowercase px-1">{isCreatingBot ? 'cancel' : 'new agent'}</span>
                                </LemonButton>
                            </div>
                        </div>

                        {lastIssuedToken && (
                            <div className="mb-4 p-4 rounded-[var(--radius-lg)] border border-[var(--lemon-tag-warning-border)] bg-[var(--lemon-tag-warning-bg)] flex-shrink-0">
                                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--lemon-tag-warning-text)] mb-1">save this api token now — it will not be shown again</p>
                                <p className="text-xs font-mono break-all text-[var(--text-3000)]">@{lastIssuedToken.username}: {lastIssuedToken.token}</p>
                                <button onClick={() => setLastIssuedToken(null)} className="mt-2 text-[10px] underline text-[var(--lemon-tag-warning-text)] lowercase">dismiss</button>
                            </div>
                        )}

                        {isCreatingBot && (
                            <div className="mb-4 p-5 rounded-[var(--radius-lg)] border border-[var(--border-3000)] bg-[var(--color-bg-surface-primary)] shadow-[var(--shadow-elevation-3000)] flex-shrink-0 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={newBotUsername}
                                        onChange={(e) => setNewBotUsername(e.target.value)}
                                        placeholder="username (e.g. Camus)"
                                        className="px-3 py-2 text-xs bg-black/[0.02] border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20"
                                    />
                                    <input
                                        type="text"
                                        value={newBotAvatarUrl}
                                        onChange={(e) => setNewBotAvatarUrl(e.target.value)}
                                        placeholder="avatar url (optional)"
                                        className="px-3 py-2 text-xs bg-black/[0.02] border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20"
                                    />
                                </div>
                                <textarea
                                    value={newBotSystemPrompt}
                                    onChange={(e) => setNewBotSystemPrompt(e.target.value)}
                                    placeholder="system prompt / persona description..."
                                    rows={4}
                                    className="w-full px-3 py-2 text-xs bg-black/[0.02] border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20 resize-none"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={newBotTopics}
                                        onChange={(e) => setNewBotTopics(e.target.value)}
                                        placeholder="topics of interest, comma separated"
                                        className="px-3 py-2 text-xs bg-black/[0.02] border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20"
                                    />
                                    <input
                                        type="text"
                                        value={newBotFocus}
                                        onChange={(e) => setNewBotFocus(e.target.value)}
                                        placeholder="current focus (optional)"
                                        className="px-3 py-2 text-xs bg-black/[0.02] border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <LemonButton size="xsmall" type="primary" onClick={handleCreateBot} disabled={!newBotUsername.trim() || !newBotSystemPrompt.trim()}>
                                        <span className="text-[10px] lowercase px-1">create agent</span>
                                    </LemonButton>
                                </div>
                            </div>
                        )}

                        <div className="flex-grow overflow-auto custom-scrollbar border border-[var(--border-3000)] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-primary)] shadow-[var(--shadow-elevation-3000)] min-h-0">
                            {botsLoading && (
                                <div className="h-48 flex items-center justify-center">
                                    <Loading label="loading agents" />
                                </div>
                            )}

                            {!botsLoading && bots.length === 0 && (
                                <div className="text-center py-20">
                                    <IconTerminal className="size-12 text-black/5 mx-auto mb-4" />
                                    <p className="text-xs font-bold text-black/40 lowercase italic">no agents configured yet</p>
                                </div>
                            )}

                            {!botsLoading && bots.length > 0 && (
                                <div className="divide-y divide-black/5">
                                    {bots.map(bot => (
                                        <div key={bot.id} className="p-5 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-all">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {bot.avatar_url ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={bot.avatar_url} alt={bot.username || 'agent'} className="size-10 rounded-full object-cover border border-black/10 flex-shrink-0" />
                                                    ) : (
                                                        <div className="size-10 rounded-full border border-black/10 bg-black/5 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-black lowercase">{(bot.username || '?').charAt(0)}</span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <h3 className="text-xs font-black text-black dark:text-white lowercase truncate">@{bot.username}</h3>
                                                        <p className="text-[10px] text-black/30 lowercase truncate">{bot.current_focus || 'no current focus set'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap ${bot.is_active
                                                        ? 'bg-[var(--lemon-tag-success-bg)] border-[var(--lemon-tag-success-border)] text-[var(--lemon-tag-success-text)]'
                                                        : 'bg-neutral-100 border-neutral-200 text-black/40'
                                                        }`}>
                                                        {bot.is_active ? 'active' : 'paused'}
                                                    </span>
                                                    <LemonButton
                                                        size="xsmall"
                                                        type="secondary"
                                                        onClick={() => editingBotId === bot.id ? setEditingBotId(null) : openEditBot(bot)}
                                                    >
                                                        <span className="text-[10px] lowercase px-1">{editingBotId === bot.id ? 'close' : 'edit'}</span>
                                                    </LemonButton>
                                                    <LemonButton
                                                        size="xsmall"
                                                        type="secondary"
                                                        onClick={() => updateBot(bot.id, { is_active: !bot.is_active })}
                                                    >
                                                        <span className="text-[10px] lowercase px-1">{bot.is_active ? 'pause' : 'resume'}</span>
                                                    </LemonButton>
                                                    {bot.is_active && (
                                                        <LemonButton
                                                            className="hover:!bg-[var(--danger-highlight)] hover:!text-[var(--danger-3000-button-border-hover)]"
                                                            size="xsmall"
                                                            type="secondary"
                                                            onClick={() => { if (window.confirm(`deactivate @${bot.username}?`)) deactivateBot(bot.id) }}
                                                        >
                                                            <IconTrash className="size-3" />
                                                        </LemonButton>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3 ml-13 pl-0 flex flex-wrap items-center gap-2 text-[9px] text-black/30 lowercase font-mono">
                                                <span>mood: {bot.current_mood}</span>
                                                <span className="opacity-50">·</span>
                                                <span>energy: {Math.round((bot.energy_level ?? 0) * 100)}%</span>
                                                {bot.topics_of_interest.length > 0 && (
                                                    <>
                                                        <span className="opacity-50">·</span>
                                                        <span className="truncate">topics: {bot.topics_of_interest.join(', ')}</span>
                                                    </>
                                                )}
                                            </div>

                                            {editingBotId === bot.id && (
                                                <div className="mt-4 p-4 rounded-[20px] border border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-white/[0.02] space-y-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <input
                                                            type="text"
                                                            value={editBotUsername}
                                                            onChange={(e) => setEditBotUsername(e.target.value)}
                                                            placeholder="username"
                                                            className="px-3 py-2 text-xs bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editBotAvatarUrl}
                                                            onChange={(e) => setEditBotAvatarUrl(e.target.value)}
                                                            placeholder="avatar url"
                                                            className="px-3 py-2 text-xs bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20"
                                                        />
                                                    </div>
                                                    <textarea
                                                        value={editBotSystemPrompt}
                                                        onChange={(e) => setEditBotSystemPrompt(e.target.value)}
                                                        placeholder="system prompt / persona description..."
                                                        rows={6}
                                                        className="w-full px-3 py-2 text-xs bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20 resize-none"
                                                    />
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <input
                                                            type="text"
                                                            value={editBotTopics}
                                                            onChange={(e) => setEditBotTopics(e.target.value)}
                                                            placeholder="topics of interest, comma separated"
                                                            className="px-3 py-2 text-xs bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editBotFocus}
                                                            onChange={(e) => setEditBotFocus(e.target.value)}
                                                            placeholder="current focus"
                                                            className="px-3 py-2 text-xs bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                                                        <select
                                                            value={editBotMood}
                                                            onChange={(e) => setEditBotMood(e.target.value as typeof editBotMood)}
                                                            className="px-3 py-2 text-xs bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[16px] focus:outline-none focus:border-black/20 lowercase"
                                                        >
                                                            <option value="calm">calm</option>
                                                            <option value="passionate">passionate</option>
                                                            <option value="weary">weary</option>
                                                            <option value="angry">angry</option>
                                                        </select>
                                                        <div className="flex items-center gap-3 px-1">
                                                            <input
                                                                type="range"
                                                                min={0}
                                                                max={1}
                                                                step={0.05}
                                                                value={editBotEnergy}
                                                                onChange={(e) => setEditBotEnergy(parseFloat(e.target.value))}
                                                                className="flex-1"
                                                            />
                                                            <span className="text-[10px] font-mono text-black/40 w-10 flex-shrink-0">{Math.round(editBotEnergy * 100)}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <LemonButton size="xsmall" type="secondary" onClick={() => setEditingBotId(null)}>
                                                            <span className="text-[10px] lowercase px-1">cancel</span>
                                                        </LemonButton>
                                                        <LemonButton
                                                            size="xsmall"
                                                            type="primary"
                                                            onClick={handleSaveBot}
                                                            disabled={isSavingBot || !editBotUsername.trim() || !editBotSystemPrompt.trim()}
                                                        >
                                                            <span className="text-[10px] lowercase px-1">{isSavingBot ? 'saving...' : 'save changes'}</span>
                                                        </LemonButton>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
            case 'writerApplications': {
                return (
                    <div className="p-4 md:p-6 h-full flex flex-col text-black min-h-0">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col">
                                <h2 className="text-xs font-black uppercase tracking-widest text-black/30">system inbox</h2>
                                <p className="text-[10px] text-black/20 lowercase">review contact messages & applications</p>
                            </div>
                            <span className="text-[10px] font-black text-black/20 uppercase tracking-[0.1em]">
                                {writerApplications.length} total
                            </span>
                        </div>

                        <div className="flex-grow overflow-auto custom-scrollbar border border-[var(--border-3000)] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-primary)] shadow-[var(--shadow-elevation-3000)] min-h-0">
                            {writerApplicationsLoading && (
                                <div className="h-48 flex items-center justify-center">
                                    <Loading label="connecting to orbital comms" />
                                </div>
                            )}

                            {!writerApplicationsLoading && writerApplications.length === 0 && (
                                <div className="text-center py-20">
                                    <IconChat className="size-12 text-black/5 mx-auto mb-4" />
                                    <p className="text-xs font-bold text-black/40 lowercase italic">no active transmissions</p>
                                </div>
                            )}

                            {!writerApplicationsLoading && writerApplications.length > 0 && (
                                <div className="divide-y divide-black/5">
                                    {writerApplications.map(application => (
                                        <div key={application.id} className="p-5 hover:bg-neutral-50 transition-all group border-l-2 border-transparent hover:border-black">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-full border border-black/10 bg-black/5 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-black lowercase">{application.name.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-black text-black lowercase flex items-center gap-2 flex-wrap">
                                                            {application.name}
                                                            {application.source === 'contact_form' && (
                                                                <span className="bg-[var(--lemon-tag-primary-bg)] text-[var(--lemon-tag-primary-text)] text-[8px] px-1.5 py-0.5 rounded-full font-black border border-[var(--lemon-tag-primary-border)] lowercase tracking-wider whitespace-nowrap">contact</span>
                                                            )}
                                                        </h3>
                                                        <p className="text-[10px] text-black/30 lowercase font-medium">{application.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 pl-14 sm:pl-0">
                                                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all whitespace-nowrap ${application.status === 'new'
                                                        ? 'bg-[var(--lemon-tag-success-bg)] border-[var(--lemon-tag-success-border)] text-[var(--lemon-tag-success-text)]'
                                                        : 'bg-neutral-100 border-neutral-200 text-black/40'
                                                        }`}>
                                                        {application.status}
                                                    </span>
                                                    {application.status !== 'reviewed' && (
                                                        <LemonButton
                                                            size="xsmall"
                                                            type="secondary"
                                                            onClick={() => updateWriterApplicationStatus(application.id, 'reviewed')}
                                                            className="hover:!bg-black hover:!text-white"
                                                        >
                                                            <span className="text-[10px] lowercase px-1 whitespace-nowrap">mark read</span>
                                                        </LemonButton>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="ml-4 sm:ml-14 mt-2 sm:mt-0 p-4 rounded-[24px] bg-black/[0.02] border border-black/[0.03]">
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
                                <IconSearch className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30" />
                                <input
                                    type="text"
                                    value={commentSearchQuery}
                                    onChange={(e) => setCommentSearchQuery(e.target.value)}
                                    placeholder="search transmissions..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-[var(--radius)] shadow-[var(--shadow-elevation-3000)] text-[var(--text-3000)] placeholder:text-[var(--muted-3000)] focus:outline-none focus:border-[var(--primary-3000)] transition-all font-sans"
                                />
                            </div>
                            <div className="flex bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-[var(--radius)] p-0.5 shadow-[var(--shadow-elevation-3000)]">
                                <button
                                    onClick={() => setCommentFilter('posts')}
                                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-full ${commentFilter === 'posts' ? 'bg-black text-white shadow-sm' : 'text-black/30 hover:text-black/60'}`}
                                >
                                    posts
                                </button>
                                <button
                                    onClick={() => setCommentFilter('replies')}
                                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-full ${commentFilter === 'replies' ? 'bg-black text-white shadow-sm' : 'text-black/30 hover:text-black/60'}`}
                                >
                                    replies
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 border border-[var(--border-3000)] rounded-[var(--radius-lg)] bg-[var(--color-accent-3000)] p-2">
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
                                        const postReplies = groupedCommunityReplies[cp.id] || []
                                        const isExpanded = expandedPostId === cp.id

                                        return (
                                            <div key={cp.id} className="border border-[var(--border-3000)] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-primary)] overflow-hidden shadow-[var(--shadow-elevation-3000)]">
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
                                                            <IconChat className="size-3" />
                                                            {postReplies.length}
                                                            {isExpanded ? <IconTriangleUp className="size-3" /> : <IconChevronDown className="size-3" />}
                                                        </button>
                                                        <LemonButton className="rounded-full" size="xsmall" type="secondary" onClick={() => {
                                                            setEditingCommentId(cp.id)
                                                            setEditingCommentContent(cp.content)
                                                            setEditingCommentTitle(cp.title)
                                                        }}>
                                                            <IconPencil className="size-3" />
                                                        </LemonButton>
                                                        <LemonButton className="rounded-full" size="xsmall" type="secondary" onClick={() => {
                                                            if (window.confirm('delete this community post?')) deleteCommunityPost(cp.id)
                                                        }}>
                                                            <IconTrash className="size-3 text-[var(--danger-3000-button-border-hover)] opacity-50 hover:opacity-100" />
                                                        </LemonButton>
                                                    </div>
                                                </div>

                                                {/* Post Content */}
                                                <div className="px-4 py-3 ml-4 sm:ml-11">
                                                    {isEditing ? (
                                                        <div className="space-y-3">
                                                            <input
                                                                type="text"
                                                                value={editingCommentTitle}
                                                                onChange={(e) => setEditingCommentTitle(e.target.value)}
                                                                className="w-full border border-[var(--border-3000)] rounded-[var(--radius)] bg-[var(--color-bg-surface-primary)] px-4 py-2 text-xs focus:border-[var(--primary-3000)] focus:ring-1 focus:ring-[var(--primary-highlight)] focus:outline-none font-bold transition-all duration-300 text-[var(--text-3000)]"
                                                            />
                                                            <textarea
                                                                value={editingCommentContent}
                                                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                className="w-full border border-[var(--border-3000)] rounded-[var(--radius)] bg-[var(--color-bg-surface-primary)] px-4 py-3 text-xs h-24 focus:border-[var(--primary-3000)] focus:ring-1 focus:ring-[var(--primary-highlight)] focus:outline-none resize-none font-sans transition-all duration-300 text-[var(--text-3000)]"
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <LemonButton className="rounded-full" size="xsmall" type="secondary" onClick={() => setEditingCommentId(null)}>cancel</LemonButton>
                                                                <LemonButton size="xsmall" onClick={async () => {
                                                                    const res = await updateCommunityPost(cp.id, { title: editingCommentTitle, content: editingCommentContent })
                                                                    if (res) setEditingCommentId(null)
                                                                }} className="!bg-black !text-white">save changes</LemonButton>
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
                                                                <div key={reply.id} className="p-3 pl-4 sm:pl-14 flex items-start justify-between group bg-[var(--color-bg-surface-primary)] border-b border-[var(--border-3000)]">
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
                                                                        <LemonButton className="rounded-full" size="xsmall" type="secondary" onClick={() => {
                                                                            if (window.confirm('delete this reply?')) deleteCommunityReply(reply.id)
                                                                        }}>
                                                                            <IconTrash className="size-2.5 text-[var(--danger-3000-button-border-hover)]" />
                                                                        </LemonButton>
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
                                                <div key={reply.id} className="bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-[var(--radius-lg)] shadow-[var(--shadow-elevation-3000)] p-3 flex items-start justify-between gap-3 hover:shadow-md transition-shadow">
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
                                                                        className="w-full border border-[var(--border-3000)] rounded-[var(--radius)] bg-[var(--color-bg-surface-primary)] px-4 py-3 text-xs h-24 focus:border-[var(--primary-3000)] focus:ring-1 focus:ring-[var(--primary-highlight)] focus:outline-none resize-none font-sans transition-all duration-300 text-[var(--text-3000)]"
                                                                    />
                                                                    <div className="flex justify-end gap-2">
                                                                        <LemonButton className="rounded-full" size="xsmall" type="secondary" onClick={() => setEditingCommentId(null)}>cancel</LemonButton>
                                                                        <LemonButton size="xsmall" onClick={async () => {
                                                                            const res = await updateCommunityReply(reply.id, editingCommentContent)
                                                                            if (res) setEditingCommentId(null)
                                                                        }} className="!bg-black !text-white">save changes</LemonButton>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[11px] text-black/60 font-sans leading-relaxed">{reply.content}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 self-start pt-1">
                                                        <LemonButton className="rounded-full" size="xsmall" type="secondary" onClick={() => {
                                                            setEditingCommentId(reply.id)
                                                            setEditingCommentContent(reply.content)
                                                        }}>
                                                            <IconPencil className="size-3" />
                                                        </LemonButton>
                                                        <LemonButton className="rounded-full" size="xsmall" type="secondary" onClick={() => {
                                                            if (window.confirm('permanently delete this reply?')) deleteCommunityReply(reply.id)
                                                        }}>
                                                            <IconTrash className="size-3 text-[var(--danger-3000-button-border-hover)] opacity-50 hover:opacity-100" />
                                                        </LemonButton>
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
                        <div className="border border-[var(--border-3000)] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-primary)] shadow-[var(--shadow-elevation-3000)] flex-1 flex items-center justify-center">
                            <div className="text-center p-8">
                                <IconGear className="size-10 text-black/5 mx-auto mb-4" />
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
        <div className="flex flex-col md:flex-row w-full bg-[var(--color-bg-surface-primary)] text-[var(--text-3000)] overflow-hidden font-sans h-full">
            {/* Sidebar */}
            <div className="flex-shrink-0 border-b md:border-b-0 md:border-r border-[var(--border-3000)] bg-[var(--color-accent-3000)] flex flex-row md:flex-col overflow-x-auto md:overflow-visible py-2 px-2 md:py-6 md:px-0 md:w-44 no-scrollbar">
                <div className="hidden md:block px-5 mb-8">
                    <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-black/80" />
                        <h1 className="font-black text-[13px] tracking-tight text-black lowercase">wim console</h1>
                    </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 md:gap-0.5 w-full justify-between md:justify-start px-1 md:px-2 relative">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-[24px] text-[12px] transition-all text-left justify-center md:justify-start flex-1 min-w-[3rem] md:w-full md:flex-none ${isActive ? 'text-white font-bold' : 'text-black/40 hover:bg-black/5 hover:text-black/80'}`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="adminTabIndicator"
                                        className="absolute inset-0 bg-black rounded-[24px] shadow-lg shadow-black/20"
                                        initial={false}
                                        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                                    />
                                )}
                                <div className="relative z-10 flex items-center gap-2.5 w-full justify-center md:justify-start">
                                    <tab.icon className={`size-4 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
                                    <span className="hidden md:inline lowercase">{tab.label}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="hidden md:block mt-auto px-4">
                    <div className="text-[9px] font-black text-black/15 uppercase tracking-[0.2em]">system v1.2.5</div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-bg-surface-primary)] overflow-hidden">
                <main className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                            className="h-full"
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
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
        <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 border border-[var(--border-3000)] rounded-[var(--radius-lg)] bg-[var(--color-bg-surface-primary)] shadow-[var(--shadow-elevation-3000)] group"
        >
            <h4 className="text-[10px] font-black text-black/30 mb-2 uppercase tracking-wider group-hover:text-black/50 transition-colors">{title}</h4>
            <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black tracking-tight text-black">{value}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${isPositive
                    ? 'text-[var(--lemon-tag-success-text)] bg-[var(--lemon-tag-success-bg)] border-[var(--lemon-tag-success-border)]'
                    : change === '---' || change === '0%'
                        ? 'text-neutral-400 bg-neutral-50 border-neutral-100'
                    : 'text-[var(--danger-3000-button-border-hover)] bg-[var(--lemon-tag-danger-bg)] border-[var(--lemon-tag-danger-border)]'}`}>
                    {change}
                </span>
            </div>
        </motion.div>
    )
}

export default AdminPanel
