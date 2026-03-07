"use client"

import React, { useState, useEffect } from 'react'
import OSButton from '../OSButton'
import './styles.css'
import {
    FileText, CheckSquare, Calendar, Cloud, Users,
    Inbox, ChevronDown, RefreshCw, Share, Settings2, MoreHorizontal,
    Globe, Github, MapPin, BookOpen, PenLine, Star, Layers, Bookmark,
    Linkedin, Twitter, LogOut
} from 'lucide-react'
import {
    IconSidebarOpen,
    IconSidebarClose,
    IconChevronLeft,
    IconChevronRight,
    IconCalendar,
    IconPlus,
    IconUser,
    IconCheck,
    IconX
} from '@posthog/icons'
import { Popover } from 'components/RadixUI/Popover'
import Tooltip from 'components/RadixUI/Tooltip'
import { useWindow } from '../../context/Window'
import { useApp } from '../../context/App'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import Input from '../OSForm/input'
import Textarea from '../OSForm/textarea'

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

    const isOwner = !!authProfile?.username &&
        (authProfile.username.toLowerCase() === decodeURIComponent(username).toLowerCase() ||
            authProfile.username.toLowerCase() === profile?.username?.toLowerCase())

    // Debug ownership
    useEffect(() => {
        if (authProfile || profile) {
            console.log('CorpusView Ownership Debug:', {
                urlUsername: decodeURIComponent(username),
                authUsername: authProfile?.username,
                profileUsername: profile?.username,
                isOwner
            })
        }
    }, [username, authProfile, profile, isOwner])

    const handleSaveProfile = async () => {
        setUpdating(true)
        console.log('Saving profile with form data:', form)
        const success = await authUpdateProfile(form)
        if (success) {
            // Update local profile state immediately
            setProfile(prev => {
                const updated = prev ? { ...prev, ...form } : { ...form } as ProfileData
                console.log('Updated profile state:', updated)
                return updated
            })
            setIsEditing(false)
            addToast('profile updated successfully', 'success')
        } else {
            console.error('Failed to update profile')
            addToast('failed to update profile', 'error')
        }
        setUpdating(false)
    }

    const handleAddNode = async () => {
        if (!profile?.id) return
        const tempId = `temp-${Date.now()}`
        const newDoc: NodeDoc = {
            id: tempId,
            title: 'Untitled Node',
            updated: 'just now',
            status: 'draft',
            preview: ''
        }
        setDocs(prev => [newDoc, ...prev])
        app?.addWindow({
            key: `node-${Date.now()}`,
            title: 'Untitled Node',
            path: '/write',
            icon: <FileText className="size-4" />,
            props: { isCanvas: true }
        })
        const { data, error } = await supabase
            .from('nodes')
            .insert({ author_id: profile.id, title: 'Untitled Node', content: '', status: 'draft' })
            .select('id')
            .single()
        if (!error && data) {
            setDocs(prev => prev.map(d => d.id === tempId ? { ...d, id: data.id } : d))
        } else if (error) {
            setDocs(prev => prev.filter(d => d.id !== tempId))
        }
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
                    <OSButton size="sm" className="!px-2 h-8 !rounded flex items-center gap-1.5 flex-shrink-0">
                        <IconCalendar className="size-[15px] opacity-70" />
                        <span className="hidden md:inline text-[12px] font-semibold">last 7 days</span>
                        <ChevronDown className="size-3 opacity-50 ml-0.5" />
                    </OSButton>

                    <OSButton size="sm" onClick={handleAddNode} className="!px-2 h-8 !rounded flex items-center gap-1.5 flex-shrink-0">
                        <IconPlus className="size-[15px] opacity-70" />
                        <span className="hidden lg:inline text-[12px] font-semibold">add node</span>
                    </OSButton>

                    <div className="hidden sm:block w-px h-5 bg-black/20 dark:bg-white/20 mx-1 flex-shrink-0" />

                    <div className="flex items-center gap-0.5">
                        <Tooltip trigger={<OSButton size="sm" className={interactionBtnClass}><RefreshCw className="size-[16px] opacity-70" /></OSButton>} side="bottom">refresh</Tooltip>
                        <Tooltip trigger={<OSButton size="sm" className={interactionBtnClass}><Share className="size-[16px] opacity-70" /></OSButton>} side="bottom">share</Tooltip>
                        <Tooltip trigger={<OSButton size="sm" className={interactionBtnClass}><Settings2 className="size-[16px] opacity-70" /></OSButton>} side="bottom">customize layout</Tooltip>

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

                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full text-left px-2 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors hover:bg-primary/5 text-primary mb-1"
                                >
                                    <PenLine className="size-3.5" />
                                    edit profile
                                </button>

                                <button className="w-full text-left px-2 py-2 text-xs font-bold rounded flex items-center gap-2 hover:bg-primary/5 text-primary transition-colors">
                                    <Share className="size-3.5" /> share corpus
                                </button>

                                <button className="w-full text-left px-2 py-2 text-xs font-bold rounded flex items-center gap-2 hover:bg-primary/5 text-primary transition-colors border-t border-primary/5 mt-0.5">
                                    <Settings2 className="size-3.5" /> corpus settings
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

                        <div className="space-y-0.5 border-t border-primary/5 pt-4">
                            <button className="flex items-center gap-2.5 w-full hover:bg-black/5 dark:hover:bg-white/5 p-1.5 px-2.5 rounded-lg transition-colors text-primary/70 hover:text-primary font-medium text-[13px]">
                                <Bookmark className="size-4 opacity-70" />
                                <span>saved posts</span>
                            </button>
                            <button className="flex items-center gap-2.5 w-full hover:bg-black/5 dark:hover:bg-white/5 p-1.5 px-2.5 rounded-lg transition-colors text-primary/70 hover:text-primary font-medium text-[13px]">
                                <Star className="size-4 opacity-70" />
                                <span>starred</span>
                            </button>
                            <button className="flex items-center gap-2.5 w-full hover:bg-black/5 dark:hover:bg-white/5 p-1.5 px-2.5 rounded-lg transition-colors text-primary/70 hover:text-primary font-medium text-[13px]">
                                <Cloud className="size-4 opacity-70" />
                                <span>imagine</span>
                            </button>
                            <button className="flex items-center gap-2.5 w-full hover:bg-black/5 dark:hover:bg-white/5 p-1.5 px-2.5 rounded-lg transition-colors text-primary/70 hover:text-primary font-medium text-[13px]">
                                <Users className="size-4 opacity-70" />
                                <span>shared with me</span>
                            </button>
                        </div>

                        <div className="pt-2">
                            <div className="text-[11px] font-black lowercase tracking-widest text-primary/60 px-2.5 mb-1.5">folders</div>
                            <button className="flex items-center gap-2.5 w-full hover:bg-black/5 dark:hover:bg-white/5 p-1.5 px-2.5 rounded-lg transition-colors text-primary/70 hover:text-primary font-medium text-[13px]">
                                <Inbox className="size-4 opacity-70" />
                                <span>unsorted</span>
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
                        /* Profile Edit — corpus design language */
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* Edit header card */}
                            <div className="corpus-edit-wrapper">

                                {/* ── Avatar card ── */}
                                <div className="corpus-nodes-card">
                                    <div className="corpus-table-heading">
                                        <IconUser className="size-3.5" style={{ color: 'var(--corpus-accent)' }} />
                                        <span>avatar</span>
                                        <span className="corpus-badge">
                                            <Settings2 className="size-3" />
                                            <span>settings</span>
                                        </span>
                                    </div>
                                    {/* Cover preview strip */}
                                    <div className="corpus-edit-cover-preview">
                                        {form.cover_url
                                            ? <img src={form.cover_url} alt="cover preview" className="size-full object-cover" />
                                            : <span className="corpus-edit-cover-empty">no cover</span>
                                        }
                                    </div>
                                    <div className="corpus-edit-section">
                                        <div className="corpus-edit-avatar-preview">
                                            {form.avatar_url
                                                ? <img src={form.avatar_url} alt="preview" className="size-full object-cover" />
                                                : <IconUser className="size-8" style={{ color: 'var(--corpus-accent)', opacity: 0.4 }} />
                                            }
                                        </div>
                                        <div className="corpus-edit-fields">
                                            <Input
                                                label="cover url"
                                                value={form.cover_url || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, cover_url: e.target.value })}
                                                placeholder="https://example.com/cover.jpg"
                                                size="sm"
                                                direction="column"
                                                description="Wide banner image shown at the top of your profile."
                                            />
                                            <Input
                                                label="avatar url"
                                                value={form.avatar_url || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, avatar_url: e.target.value })}
                                                placeholder="https://example.com/photo.png"
                                                size="sm"
                                                direction="column"
                                                description="Square profile photo."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Profile info card ── */}
                                <div className="corpus-nodes-card">
                                    <div className="corpus-table-heading">
                                        <PenLine className="size-3.5" style={{ color: 'var(--corpus-accent)' }} />
                                        <span>identity</span>
                                        <span className="corpus-badge">
                                            <Globe className="size-3" />
                                            <span>public</span>
                                        </span>
                                    </div>
                                    <div className="corpus-edit-section corpus-edit-grid">
                                        <Input
                                            label="username"
                                            value={profile?.username || ''}
                                            readOnly
                                            disabled
                                            size="sm"
                                            direction="column"
                                            description="Your unique ID — cannot be changed."
                                        />
                                        <Input
                                            label="pronouns"
                                            value={form.pronouns || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, pronouns: e.target.value })}
                                            placeholder="e.g. they/them"
                                            size="sm"
                                            direction="column"
                                        />
                                        <Input
                                            label="location"
                                            value={form.location || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, location: e.target.value })}
                                            placeholder="e.g. Istanbul, TR"
                                            size="sm"
                                            direction="column"
                                        />
                                        <div className="corpus-edit-full">
                                            <Textarea
                                                label="bio"
                                                value={form.bio || ''}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, bio: e.target.value })}
                                                placeholder="Tell us about yourself..."
                                                size="sm"
                                                direction="column"
                                                rows={4}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Links card ── */}
                                <div className="corpus-nodes-card">
                                    <div className="corpus-table-heading">
                                        <Globe className="size-3.5" style={{ color: 'var(--corpus-accent)' }} />
                                        <span>links</span>
                                        <span className="corpus-badge">
                                            <Layers className="size-3" />
                                            <span>social</span>
                                        </span>
                                    </div>
                                    <div className="corpus-edit-section corpus-edit-grid">
                                        <Input label="website" value={form.website || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, website: e.target.value })} placeholder="https://..." size="sm" direction="column" />
                                        <Input label="github" value={form.github || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, github: e.target.value })} placeholder="https://github.com/..." size="sm" direction="column" />
                                        <Input label="linkedin" value={form.linkedin || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." size="sm" direction="column" />
                                        <Input label="twitter / x" value={form.twitter || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, twitter: e.target.value })} placeholder="https://x.com/..." size="sm" direction="column" />
                                    </div>
                                </div>

                                {/* ── Action bar ── */}
                                <div className="corpus-edit-actions">
                                    <span className="corpus-edit-status">
                                        <span className="corpus-edit-dot" />
                                        unsaved changes
                                    </span>
                                    <div className="corpus-edit-btns">
                                        <button className="corpus-edit-cancel" onClick={() => setIsEditing(false)}>cancel</button>
                                        <button className="corpus-edit-save" onClick={handleSaveProfile} disabled={updating}>
                                            {updating ? 'saving...' : 'save changes'}
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    ) : (
                        /* Normal View with Banner + Docs */
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* ── Profile Section with Complete Layered Design ── */}
                            <main className="corpus-main">
                                <div className="corpus-shadow corpus-shadow--main">
                                    <div></div>
                                </div>
                                
                                {/* Layer 1: Main Profile Section */}
                                <section className="corpus-layer">
                                    <div className="corpus-mover">
                                        <div className="corpus-shadow corpus-shadow--main">
                                            <div></div>
                                        </div>

                                        <div className="corpus-content--main">
                                            {/* Profile Heading */}
                                            <p className="corpus-heading">
                                                <IconUser className="size-4" />
                                                <span className="lowercase">{displayName}&apos;s profile</span>
                                            </p>

                                            {/* Profile Card Slot */}
                                            <div className="corpus-profile-slot">
                                                {/* Cover */}
                                                <div className="h-24 w-full relative overflow-hidden rounded-t-lg">
                                                    {profile?.cover_url
                                                        ? <img src={profile.cover_url} alt="cover" className="size-full object-cover" />
                                                        : <div className="size-full bg-gradient-to-br from-primary/10 via-primary/5 to-accent">
                                                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, var(--color-primary) 0%, transparent 60%), radial-gradient(circle at 80% 20%, var(--color-primary) 0%, transparent 50%)' }} />
                                                          </div>
                                                    }
                                                </div>

                                                {/* Avatar + Info */}
                                                <div className="px-4 py-3">
                                                    <div className="flex items-end gap-3 -mt-12 pb-3 border-b border-primary/10">
                                                        <div className="size-16 rounded-xl border-3 border-white dark:border-primary/20 bg-accent overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-primary/10">
                                                            {profile?.avatar_url
                                                                ? <img src={profile.avatar_url} alt={displayName} className="size-full object-cover" />
                                                                : <IconUser className="size-6 text-primary/30" />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h2 className="text-sm font-black lowercase tracking-tight text-primary m-0 leading-tight">
                                                                {displayName}
                                                            </h2>
                                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                                {profile?.role && (
                                                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary/60">
                                                                        {profile.role}
                                                                    </span>
                                                                )}
                                                                {profile?.pronouns && (
                                                                    <span className="text-[9px] font-bold text-primary/50">{profile.pronouns}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {profile?.location && (
                                                        <div className="flex items-center gap-1 text-[10px] font-medium text-primary/50 mt-2 mb-2">
                                                            <MapPin className="size-3" />{profile.location}
                                                        </div>
                                                    )}

                                                    {profile?.bio && (
                                                        <p className="text-[10px] leading-relaxed text-primary/70 mb-3 lowercase">
                                                            {profile.bio}
                                                        </p>
                                                    )}

                                                    {/* Social Links */}
                                                    <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
                                                        <OSButton
                                                            size="sm"
                                                            onClick={() => setIsEditing(true)}
                                                            className="h-6 px-2 !rounded text-[9px] font-bold lowercase flex items-center gap-1"
                                                        >
                                                            <PenLine className="size-2.5" />
                                                            edit
                                                        </OSButton>
                                                        {profile?.website && (
                                                            <Tooltip trigger={
                                                                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                                                                    <OSButton size="sm" className="h-6 w-6 !rounded"><Globe className="size-2.5" /></OSButton>
                                                                </a>
                                                            } side="bottom">website</Tooltip>
                                                        )}
                                                        {profile?.github && (
                                                            <Tooltip trigger={
                                                                <a href={profile.github} target="_blank" rel="noopener noreferrer">
                                                                    <OSButton size="sm" className="h-6 w-6 !rounded"><Github className="size-2.5" /></OSButton>
                                                                </a>
                                                            } side="bottom">github</Tooltip>
                                                        )}
                                                        {profile?.linkedin && (
                                                            <Tooltip trigger={
                                                                <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
                                                                    <OSButton size="sm" className="h-6 w-6 !rounded"><Linkedin className="size-2.5" /></OSButton>
                                                                </a>
                                                            } side="bottom">linkedin</Tooltip>
                                                        )}
                                                        {profile?.twitter && (
                                                            <Tooltip trigger={
                                                                <a href={profile.twitter} target="_blank" rel="noopener noreferrer">
                                                                    <OSButton size="sm" className="h-6 w-6 !rounded"><Twitter className="size-2.5" /></OSButton>
                                                                </a>
                                                            } side="bottom">twitter</Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </main>

                            {/* ── Profile Info + Stats Cards ── */}
                            <div className="corpus-nodes-wrapper">
                                <div className="corpus-nodes-card">
                                    <div className="corpus-table-heading">
                                        <IconUser className="size-3.5" style={{ color: 'var(--corpus-accent)' }} />
                                        <span>profile</span>
                                        <span className="corpus-badge">
                                            <Globe className="size-3" />
                                            <span>info</span>
                                        </span>
                                    </div>
                                    <dl className="corpus-status-dl">
                                        {profile?.pronouns && (
                                            <>
                                                <dt><Star className="size-3.5" /><span>pronouns</span></dt>
                                                <dd>{profile.pronouns}</dd>
                                            </>
                                        )}
                                        {profile?.location && (
                                            <>
                                                <dt><MapPin className="size-3.5" /><span>location</span></dt>
                                                <dd>{profile.location}</dd>
                                            </>
                                        )}
                                        {profile?.website && (
                                            <>
                                                <dt><Globe className="size-3.5" /><span>website</span></dt>
                                                <dd><a href={profile.website} target="_blank" rel="noopener noreferrer" className="corpus-link">{profile.website.replace(/^https?:\/\//, '')}</a></dd>
                                            </>
                                        )}
                                        {profile?.github && (
                                            <>
                                                <dt><Github className="size-3.5" /><span>github</span></dt>
                                                <dd><a href={profile.github} target="_blank" rel="noopener noreferrer" className="corpus-link">{profile.github.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</a></dd>
                                            </>
                                        )}
                                        {profile?.linkedin && (
                                            <>
                                                <dt><Linkedin className="size-3.5" /><span>linkedin</span></dt>
                                                <dd><a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="corpus-link">linkedin</a></dd>
                                            </>
                                        )}
                                        {profile?.twitter && (
                                            <>
                                                <dt><Twitter className="size-3.5" /><span>twitter</span></dt>
                                                <dd><a href={profile.twitter} target="_blank" rel="noopener noreferrer" className="corpus-link">{profile.twitter.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, '')}</a></dd>
                                            </>
                                        )}
                                        {!profile?.pronouns && !profile?.location && !profile?.website && !profile?.github && !profile?.linkedin && !profile?.twitter && (
                                            <>
                                                <dt><PenLine className="size-3.5" /><span>bio</span></dt>
                                                <dd className="corpus-info-bio">{profile?.bio || '—'}</dd>
                                            </>
                                        )}
                                    </dl>
                                </div>

                                <div className="corpus-stats-card">
                                    <div className="corpus-table-heading">
                                        <Layers className="size-3.5" style={{ color: 'var(--corpus-accent)' }} />
                                        <span>corpus</span>
                                        <span className="corpus-badge">
                                            <BookOpen className="size-3" />
                                            <span>stats</span>
                                        </span>
                                    </div>
                                    <dl className="corpus-status-dl">
                                        <dt><BookOpen className="size-3.5" /><span>published</span></dt>
                                        <dd>{publishedCount}</dd>
                                        <dt><PenLine className="size-3.5" /><span>drafts</span></dt>
                                        <dd>{draftCount}</dd>
                                        <dt><Layers className="size-3.5" /><span>total nodes</span></dt>
                                        <dd className="corpus-highlight">{docs.length}</dd>
                                    </dl>
                                </div>
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
                                            onClick={handleAddNode}
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
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
