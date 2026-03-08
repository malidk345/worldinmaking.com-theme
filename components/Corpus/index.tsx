"use client"

import React, { useState, useEffect } from 'react'
import OSButton from '../OSButton'
import './styles.css'
import {
    FileText,
    ChevronDown, RefreshCw, Share, MoreHorizontal,
    Globe, BookOpen, PenLine, Layers,
    LogOut
} from 'lucide-react'
import {
    IconSidebarOpen,
    IconSidebarClose,
    IconChevronLeft,
    IconChevronRight,
    IconPlus,
    IconUser,
} from '@posthog/icons'
import { Popover } from 'components/RadixUI/Popover'
import Tooltip from 'components/RadixUI/Tooltip'
import { useWindow } from '../../context/Window'
import { useApp } from '../../context/App'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'

interface ProfileData {
    id?: string
    username: string
    avatar_url?: string
    cover_url?: string
    bio?: string
    website?: string
    github?: string
    location?: string
    role?: string
    pronouns?: string
    linkedin?: string
    twitter?: string
}

interface NodeDoc {
    id: string
    title: string
    updated: string
    status: 'published' | 'draft'
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

export default function CorpusView({ username }: { username: string }) {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [activeTab, setActiveTab] = useState<'all' | 'published' | 'drafts'>('all')
    const [docs, setDocs] = useState<NodeDoc[]>([])
    const [docsLoading, setDocsLoading] = useState(false)
    const [posts, setPosts] = useState<PostItem[]>([])
    const [postsLoading, setPostsLoading] = useState(false)
    const windowContext = useWindow()
    const goBack = windowContext?.goBack
    const goForward = windowContext?.goForward
    const canGoBack = windowContext?.canGoBack || false
    const canGoForward = windowContext?.canGoForward || false

    const app = useApp()
    const { profile: authProfile, updateProfile: authUpdateProfile, signOut } = useAuth()
    const { addToast } = useToast()
    const [isEditing, setIsEditing] = useState(false)
    const [updating, setUpdating] = useState(false)

    const [form, setForm] = useState<Partial<ProfileData>>({
        bio: '',
        website: '',
        github: '',
        linkedin: '',
        twitter: '',
        location: '',
        pronouns: '',
        avatar_url: '',
        cover_url: ''
    })

    useEffect(() => {
        const loadProfile = async () => {
            if (!username) return
            const { data } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, cover_url, bio, website, github, linkedin, twitter, location, role, pronouns')
                .ilike('username', decodeURIComponent(username))
                .maybeSingle()
            if (data) {
                setProfile(data as ProfileData)
                setForm(data as Partial<ProfileData>)
            }
        }
        loadProfile()
    }, [username])

    // Load nodes once profile id is known
    useEffect(() => {
        if (!profile?.id) return
        const loadNodes = async () => {
            setDocsLoading(true)
            const { data, error } = await supabase
                .from('nodes')
                .select('id, title, content, status, updated_at')
                .eq('author_id', profile.id)
                .order('updated_at', { ascending: false })
            if (!error && data) {
                setDocs(data.map(row => ({
                    id: row.id as string,
                    title: row.title || 'Untitled',
                    updated: relativeTime(row.updated_at),
                    status: (row.status as 'published' | 'draft') || 'draft',
                    preview: (row.content || '').slice(0, 400)
                })))
            }
            setDocsLoading(false)
        }
        loadNodes()
    }, [profile?.id])

    // Load blog posts by this username
    useEffect(() => {
        if (!username) return
        const loadPosts = async () => {
            setPostsLoading(true)
            const decoded = decodeURIComponent(username)
            const { data } = await supabase
                .from('posts')
                .select('id, title, slug, excerpt, image_url, created_at, published')
                .ilike('author', decoded)
                .order('created_at', { ascending: false })
            if (data) {
                setPosts(data as PostItem[])
            }
            setPostsLoading(false)
        }
        loadPosts()
    }, [username])

    const isOwner = !!authProfile?.username &&
        (authProfile.username.toLowerCase() === decodeURIComponent(username).toLowerCase() ||
            authProfile.username.toLowerCase() === profile?.username?.toLowerCase())

    const handleSaveProfile = async () => {
        setUpdating(true)
        const success = await authUpdateProfile(form)
        if (success) {
            setProfile(prev => prev ? { ...prev, ...form } : { ...form } as ProfileData)
            setIsEditing(false)
            addToast('profile updated successfully', 'success')
        } else {
            addToast('failed to update profile', 'error')
        }
        setUpdating(false)
    }

    const handleAddNode = async () => {
        if (!profile?.id) return
        // Insert to Supabase first so we get a real nodeId
        const { data, error } = await supabase
            .from('nodes')
            .insert({ author_id: profile.id, title: 'Untitled Node', content: '', status: 'draft' })
            .select('id')
            .single()
        if (error || !data) {
            addToast('failed to create node', 'error')
            return
        }
        const newDoc: NodeDoc = {
            id: data.id as string,
            title: 'Untitled Node',
            updated: 'just now',
            status: 'draft',
            preview: ''
        }
        setDocs(prev => [newDoc, ...prev])
        app?.addWindow({
            key: `node-${data.id}`,
            title: 'Untitled Node',
            path: '/write',
            icon: <FileText className="size-4" />,
            props: { nodeId: data.id, isCanvas: true }
        })
    }

    const handleOpenNode = (doc: NodeDoc) => {
        app?.addWindow({
            key: `node-${doc.id}`,
            title: doc.title || 'Untitled Node',
            path: '/write',
            icon: <FileText className="size-4" />,
            props: { nodeId: doc.id, isCanvas: true }
        })
    }

    const filteredDocs = docs.filter(doc => {
        if (activeTab === 'published') return doc.status === 'published'
        if (activeTab === 'drafts') return doc.status === 'draft'
        return true
    })

    const displayName = profile?.username || decodeURIComponent(username)
    const publishedCount = docs.filter(d => d.status === 'published').length
    const draftCount = docs.filter(d => d.status === 'draft').length

    const mainIconBtnClass = "p-2 h-8 w-8 !rounded-md"
    const interactionBtnClass = "p-1.5 h-8 w-8 !rounded"

    return (
        <div className="corpus-root flex flex-col size-full bg-primary text-primary font-sans overflow-hidden">
            {/* Global Top Bar */}
            <div data-scheme="tertiary" className="flex w-full items-center px-1.5 py-0.5 select-none gap-2 justify-between bg-primary border-b border-primary shrink-0 z-10 h-10 overflow-x-auto custom-scrollbar no-scrollbar-on-mobile">
                {/* LEFT */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <Tooltip trigger={
                        <OSButton size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} active={sidebarOpen} className={mainIconBtnClass}>
                            {sidebarOpen ? <IconSidebarOpen className="size-[18px]" /> : <IconSidebarClose className="size-[18px]" />}
                        </OSButton>
                    }>
                        {sidebarOpen ? 'hide' : 'show'} sidebar
                    </Tooltip>

                    <div className="hidden sm:flex items-center gap-0.5 ml-1 pl-1 border-l border-black/10 dark:border-white/10 h-5">
                        <OSButton size="sm" onClick={goBack} disabled={!canGoBack} className="p-1 h-8 w-8 !rounded-md">
                            <IconChevronLeft className={`size-[18px] ${canGoBack ? 'opacity-100' : 'opacity-30'}`} />
                        </OSButton>
                        <OSButton size="sm" onClick={goForward} disabled={!canGoForward} className="p-1 h-8 w-8 !rounded-md">
                            <IconChevronRight className={`size-[18px] ${canGoForward ? 'opacity-100' : 'opacity-30'}`} />
                        </OSButton>
                    </div>

                    {!sidebarOpen && (
                        <>
                            <div className="hidden sm:block w-px h-5 bg-black/20 dark:bg-white/20 mx-1 flex-shrink-0" />
                            <h1 className="hidden sm:block text-[13px] font-bold tracking-tight text-primary leading-none m-0 ml-1 whitespace-nowrap">
                                {displayName}&apos;s corpus
                            </h1>
                        </>
                    )}
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-1 justify-end flex-shrink-0">
                    {isOwner && (
                        <OSButton size="sm" onClick={handleAddNode} className="!px-2 h-8 !rounded flex items-center gap-1.5 flex-shrink-0">
                            <IconPlus className="size-[15px] opacity-70" />
                            <span className="hidden lg:inline text-[12px] font-semibold">add node</span>
                        </OSButton>
                    )}

                    <div className="hidden sm:block w-px h-5 bg-black/20 dark:bg-white/20 mx-1 flex-shrink-0" />

                    <div className="flex items-center gap-0.5">
                        <Tooltip trigger={<OSButton size="sm" className={interactionBtnClass} onClick={() => { if (profile?.id) { setDocsLoading(true); supabase.from('nodes').select('id, title, content, status, updated_at').eq('author_id', profile.id).order('updated_at', { ascending: false }).then(({ data }) => { if (data) setDocs(data.map(row => ({ id: row.id as string, title: row.title || 'Untitled', updated: relativeTime(row.updated_at), status: (row.status as 'published' | 'draft') || 'draft', preview: (row.content || '').slice(0, 400) }))); setDocsLoading(false); }) } }}><RefreshCw className="size-[16px] opacity-70" /></OSButton>} side="bottom">refresh</Tooltip>
                        <Tooltip trigger={<OSButton size="sm" className={interactionBtnClass} onClick={() => { const url = `${window.location.origin}/u/${encodeURIComponent(profile?.username || username)}`; navigator.clipboard.writeText(url).then(() => addToast('profile link copied!', 'success')).catch(() => addToast('could not copy link', 'error')) }}><Share className="size-[16px] opacity-70" /></OSButton>} side="bottom">share</Tooltip>

                        <Popover
                            trigger={
                                <OSButton size="sm" className={interactionBtnClass}>
                                    <MoreHorizontal className="size-[16px] opacity-70" />
                                </OSButton>
                            }
                            dataScheme="primary"
                            contentClassName="w-48 p-1 border border-primary bg-bg shadow-xl"
                        >
                            <div className="flex flex-col gap-0.5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-primary/40 px-2 py-1.5 border-b border-primary/5 mb-0.5">corpus options</div>

                                {isOwner && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="w-full text-left px-2 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors hover:bg-primary/5 text-primary mb-1"
                                    >
                                        <PenLine className="size-3.5" />
                                        edit profile
                                    </button>
                                )}

                                <button
                                    onClick={() => { const url = `${window.location.origin}/u/${encodeURIComponent(profile?.username || username)}`; navigator.clipboard.writeText(url).then(() => addToast('profile link copied!', 'success')).catch(() => addToast('could not copy link', 'error')) }}
                                    className="w-full text-left px-2 py-2 text-xs font-bold rounded flex items-center gap-2 hover:bg-primary/5 text-primary transition-colors"
                                >
                                    <Share className="size-3.5" /> share corpus
                                </button>

                                {isOwner && (
                                    <button
                                        onClick={signOut}
                                        className="w-full text-left px-2 py-2 text-xs font-bold rounded flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors border-t border-primary/5 mt-0.5"
                                    >
                                        <LogOut className="size-3.5" /> sign out
                                    </button>
                                )}
                            </div>
                        </Popover>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden relative">
                {/* Sidebar */}
                <div className={`shrink-0 flex flex-col border-r border-primary/5 bg-[#fafcfc] dark:bg-black/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full absolute h-full pointer-events-none'}`}>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6 min-w-[256px]">
                        {/* Space Selector */}
                        <div className="mb-2">
                            <button className="flex items-center gap-2 w-full hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                                <div className="size-6 overflow-hidden rounded bg-primary/10 flex items-center justify-center shrink-0 shadow-sm border border-primary/10">
                                    {profile?.avatar_url
                                        ? <img src={profile.avatar_url} alt={displayName} className="size-full object-cover" />
                                        : <span className="text-xs font-black text-primary">{displayName.charAt(0).toUpperCase()}</span>
                                    }
                                </div>
                                <span className="text-sm font-bold flex-1 text-left truncate lowercase">{displayName}&apos;s corpus</span>
                                <ChevronDown className="size-4 text-primary/40" />
                            </button>
                        </div>

                        {/* Navigation */}
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`flex items-center gap-2.5 w-full p-1.5 px-2.5 rounded-lg transition-colors font-medium text-[13px] ${activeTab === 'all' ? 'bg-black/5 dark:bg-white/10 text-primary font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5 text-primary/70 hover:text-primary'}`}
                            >
                                <Layers className="size-4 opacity-80" />
                                <span>all nodes</span>
                                <span className="ml-auto text-[11px] font-black opacity-40">{docs.length}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('published')}
                                className={`flex items-center gap-2.5 w-full p-1.5 px-2.5 rounded-lg transition-colors font-medium text-[13px] ${activeTab === 'published' ? 'bg-black/5 dark:bg-white/10 text-primary font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5 text-primary/70 hover:text-primary'}`}
                            >
                                <BookOpen className="size-4 opacity-80" />
                                <span>published</span>
                                <span className="ml-auto text-[11px] font-black opacity-40">{publishedCount}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('drafts')}
                                className={`flex items-center gap-2.5 w-full p-1.5 px-2.5 rounded-lg transition-colors font-medium text-[13px] ${activeTab === 'drafts' ? 'bg-black/5 dark:bg-white/10 text-primary font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5 text-primary/70 hover:text-primary'}`}
                            >
                                <PenLine className="size-4 opacity-80" />
                                <span>drafts</span>
                                <span className="ml-auto text-[11px] font-black opacity-40">{draftCount}</span>
                            </button>
                        </div>

                        <div className="pt-2">
                            <div className="text-[11px] font-black lowercase tracking-widest text-primary/60 px-2.5 mb-1.5">tags</div>
                            <div className="px-2.5 text-xs font-medium text-primary/40 italic">pin your key tags for quick access</div>
                        </div>
                    </div>
                </div>

                <main className="flex-1 flex flex-col min-w-0 bg-[#fafcfc] dark:bg-primary relative overflow-hidden">
                    {isEditing ? (
                        /* Profile Edit — simple list */
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="mx-auto w-full max-w-xl py-2">

                                {/* identity */}
                                <div className="px-4 pt-5 pb-1 text-[10px] font-black uppercase tracking-widest opacity-25">identity</div>

                                <div className="flex items-center gap-4 px-4 py-3 border-b border-primary/10">
                                    <span className="w-20 shrink-0 text-xs lowercase opacity-40">username</span>
                                    <span className="flex-1 text-sm opacity-40">{profile?.username || '—'}</span>
                                </div>

                                <div className="flex items-center gap-4 px-4 py-3 border-b border-primary/10">
                                    <span className="w-20 shrink-0 text-xs lowercase opacity-40">avatar</span>
                                    <input
                                        type="text"
                                        value={form.avatar_url || ''}
                                        onChange={e => setForm({ ...form, avatar_url: e.target.value })}
                                        placeholder="https://example.com/photo.png"
                                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30 py-0"
                                    />
                                    {form.avatar_url && (
                                        <button type="button" onClick={() => setForm({ ...form, avatar_url: '' })} className="shrink-0 text-xs opacity-30 hover:opacity-70 bg-transparent border-none cursor-pointer px-0">✕</button>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 px-4 py-3 border-b border-primary/10">
                                    <span className="w-20 shrink-0 text-xs lowercase opacity-40">cover</span>
                                    <input
                                        type="text"
                                        value={form.cover_url || ''}
                                        onChange={e => setForm({ ...form, cover_url: e.target.value })}
                                        placeholder="https://example.com/cover.jpg"
                                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30 py-0"
                                    />
                                    {form.cover_url && (
                                        <button type="button" onClick={() => setForm({ ...form, cover_url: '' })} className="shrink-0 text-xs opacity-30 hover:opacity-70 bg-transparent border-none cursor-pointer px-0">✕</button>
                                    )}
                                </div>

                                <div className="flex items-start gap-4 px-4 py-3 border-b border-primary/10">
                                    <span className="w-20 shrink-0 text-xs lowercase opacity-40 pt-0.5">bio</span>
                                    <textarea
                                        value={form.bio || ''}
                                        onChange={e => setForm({ ...form, bio: e.target.value })}
                                        placeholder="tell us about yourself..."
                                        rows={3}
                                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30 py-0 resize-none leading-relaxed"
                                    />
                                </div>

                                {/* details */}
                                <div className="px-4 pt-5 pb-1 text-[10px] font-black uppercase tracking-widest opacity-25">details</div>

                                <div className="flex items-center gap-4 px-4 py-3 border-b border-primary/10">
                                    <span className="w-20 shrink-0 text-xs lowercase opacity-40">pronouns</span>
                                    <input
                                        type="text"
                                        value={form.pronouns || ''}
                                        onChange={e => setForm({ ...form, pronouns: e.target.value })}
                                        placeholder="she/her"
                                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30 py-0"
                                    />
                                </div>

                                <div className="flex items-center gap-4 px-4 py-3 border-b border-primary/10">
                                    <span className="w-20 shrink-0 text-xs lowercase opacity-40">location</span>
                                    <input
                                        type="text"
                                        value={form.location || ''}
                                        onChange={e => setForm({ ...form, location: e.target.value })}
                                        placeholder="istanbul, TR"
                                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30 py-0"
                                    />
                                </div>

                                {/* links */}
                                <div className="px-4 pt-5 pb-1 text-[10px] font-black uppercase tracking-widest opacity-25">links</div>

                                {([
                                    { key: 'website', label: 'website', placeholder: 'https://your-site.com' },
                                    { key: 'github', label: 'github', placeholder: 'https://github.com/username' },
                                    { key: 'linkedin', label: 'linkedin', placeholder: 'https://linkedin.com/in/username' },
                                    { key: 'twitter', label: 'twitter', placeholder: 'https://x.com/username' },
                                ] as const).map(({ key, label, placeholder }) => (
                                    <div key={key} className="flex items-center gap-4 px-4 py-3 border-b border-primary/10">
                                        <span className="w-20 shrink-0 text-xs lowercase opacity-40">{label}</span>
                                        <input
                                            type="text"
                                            value={form[key] || ''}
                                            onChange={e => setForm({ ...form, [key]: e.target.value })}
                                            placeholder={placeholder}
                                            className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-primary placeholder:opacity-30 py-0"
                                        />
                                    </div>
                                ))}

                                {/* actions */}
                                <div className="flex items-center justify-end gap-2 px-4 py-5">
                                    <OSButton type="button" variant="underlineOnHover" size="sm" onClick={() => setIsEditing(false)}>cancel</OSButton>
                                    <OSButton type="button" variant="primary" size="sm" onClick={handleSaveProfile} disabled={updating}>
                                        {updating ? 'saving...' : 'save changes'}
                                    </OSButton>
                                </div>

                            </div>
                        </div>
                    ) : (
                        /* Normal View */
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* ── Edit button (owner only) ── */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10">
                                <span className="text-xs opacity-40 lowercase">{displayName}</span>
                                {isOwner && (
                                    <OSButton
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                        className="h-6 px-2 !rounded text-[9px] font-bold lowercase flex items-center gap-1"
                                    >
                                        <PenLine className="size-2.5" />
                                        edit profile
                                    </OSButton>
                                )}
                            </div>

                            {/* ── Document Grid ── */}
                            <div className="corpus-doc-grid-wrapper">
                                {/* Tab strip */}
                                <div className="corpus-doc-tabs">
                                    {(['all', 'published', 'drafts'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={activeTab === tab ? 'corpus-doc-tab corpus-doc-tab--active' : 'corpus-doc-tab'}
                                        >
                                            {tab}
                                            <span>{tab === 'all' ? docs.length : tab === 'published' ? publishedCount : draftCount}</span>
                                        </button>
                                    ))}
                                </div>

                                {docsLoading && (
                                    <div className="corpus-doc-empty">
                                        <RefreshCw className="size-6 animate-spin" style={{ opacity: 0.3 }} />
                                        <p>loading nodes...</p>
                                    </div>
                                )}

                                <div className="corpus-doc-grid">
                                    {filteredDocs.map(doc => (
                                        <article
                                            key={doc.id}
                                            className="corpus-doc-card"
                                            onClick={() => handleOpenNode(doc)}
                                        >
                                            <div className="corpus-doc-media">
                                                <div className="corpus-doc-preview-text">{doc.preview}</div>
                                                <div className="corpus-doc-media-fade" />
                                                <div className="corpus-doc-badge">
                                                    {doc.status === 'published'
                                                        ? <><BookOpen className="size-3" /><span>pub</span></>
                                                        : <><PenLine className="size-3" /><span>draft</span></>
                                                    }
                                                </div>
                                            </div>
                                            <div className="corpus-doc-info">
                                                <div>
                                                    <FileText className="size-3.5" />
                                                    <span>{doc.updated}</span>
                                                </div>
                                                <h3>{doc.title}</h3>
                                                <p>{doc.status}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                {filteredDocs.length === 0 && (
                                    <div className="corpus-doc-empty">
                                        <PenLine className="size-8" style={{ opacity: 0.2 }} />
                                        <p>no {activeTab === 'all' ? 'nodes' : activeTab} yet</p>
                                    </div>
                                )}
                            </div>

                            {/* ── Blog Posts Grid ── */}
                            <div className="corpus-doc-grid-wrapper">
                                <div className="corpus-doc-tabs">
                                    <div className="corpus-doc-tab corpus-doc-tab--active" style={{ cursor: 'default' }}>
                                        posts
                                        <span>{posts.length}</span>
                                    </div>
                                </div>

                                {postsLoading && (
                                    <div className="corpus-doc-empty">
                                        <RefreshCw className="size-6 animate-spin" style={{ opacity: 0.3 }} />
                                        <p>loading posts...</p>
                                    </div>
                                )}

                                <div className="corpus-doc-grid">
                                    {posts.map(post => (
                                        <article
                                            key={post.id}
                                            className="corpus-doc-card"
                                            onClick={() => app?.addWindow({
                                                key: `post-${post.slug}`,
                                                title: post.title,
                                                path: `/posts/${post.slug}`,
                                                icon: <BookOpen className="size-4" />,
                                            })}
                                        >
                                            <div className="corpus-doc-media">
                                                {post.image_url
                                                    ? <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                                                    : <div className="corpus-doc-preview-text">{post.excerpt || ''}</div>
                                                }
                                                <div className="corpus-doc-media-fade" />
                                                <div className="corpus-doc-badge">
                                                    <BookOpen className="size-3" /><span>post</span>
                                                </div>
                                            </div>
                                            <div className="corpus-doc-info">
                                                <div>
                                                    <BookOpen className="size-3.5" />
                                                    <span>{relativeTime(post.created_at)}</span>
                                                </div>
                                                <h3>{post.title}</h3>
                                                <p>{post.published ? 'published' : 'draft'}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                {!postsLoading && posts.length === 0 && (
                                    <div className="corpus-doc-empty">
                                        <BookOpen className="size-8" style={{ opacity: 0.2 }} />
                                        <p>no posts yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
