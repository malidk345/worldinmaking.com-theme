"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from 'lib/supabase'
import { useAuth } from 'context/AuthContext'
import { useApp } from 'context/App'
import { useWindow } from 'context/Window'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'
import {
    Globe, Github, MapPin, BookOpen, PenLine, Star,
    Layers, Linkedin, Twitter, FileText, RefreshCw,
    Share, Users, ExternalLink
} from 'lucide-react'
import {
    IconUser,
    IconChevronLeft,
    IconChevronRight,
} from '@posthog/icons'
import '../Corpus/styles.css'

interface PublicProfileProps {
    username: string
}

interface ProfileData {
    id: string
    username: string
    avatar_url?: string
    cover_url?: string
    bio?: string
    website?: string
    github?: string
    linkedin?: string
    twitter?: string
    pronouns?: string
    location?: string
    role?: string
}

interface NodeDoc {
    id: string
    title: string
    updated: string
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

export default function PublicProfile({ username }: PublicProfileProps) {
    const { profile: authProfile } = useAuth()
    const { addWindow } = useApp()
    const windowCtx = useWindow()
    const goBack = windowCtx?.goBack
    const goForward = windowCtx?.goForward
    const canGoBack = windowCtx?.canGoBack || false
    const canGoForward = windowCtx?.canGoForward || false

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [nodes, setNodes] = useState<NodeDoc[]>([])
    const [nodesLoading, setNodesLoading] = useState(false)

    const normalizedUsername = useMemo(() => decodeURIComponent(username || '').trim(), [username])

    const isOwner = !!authProfile?.username &&
        authProfile.username.toLowerCase() === normalizedUsername.toLowerCase()

    useEffect(() => {
        const load = async () => {
            if (!normalizedUsername) { setLoading(false); return }
            setLoading(true)
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, cover_url, bio, website, github, linkedin, twitter, pronouns, location, role')
                .ilike('username', normalizedUsername)
                .maybeSingle()
            if (!error && data) {
                setProfile(data as ProfileData)
            } else {
                setProfile(null)
            }
            setLoading(false)
        }
        load()
    }, [normalizedUsername])

    useEffect(() => {
        if (!profile?.id) return
        const loadNodes = async () => {
            setNodesLoading(true)
            const { data, error } = await supabase
                .from('nodes')
                .select('id, title, content, updated_at')
                .eq('author_id', profile.id)
                .eq('status', 'published')
                .order('updated_at', { ascending: false })
            if (!error && data) {
                setNodes(data.map(row => ({
                    id: row.id as string,
                    title: row.title || 'Untitled',
                    updated: relativeTime(row.updated_at),
                    preview: (row.content || '').slice(0, 400)
                })))
            }
            setNodesLoading(false)
        }
        loadNodes()
    }, [profile?.id])

    const displayName = profile?.username || normalizedUsername

    if (loading) {
        return (
            <div className="corpus-root flex items-center justify-center size-full bg-primary">
                <RefreshCw className="size-5 animate-spin opacity-30" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="corpus-root flex flex-col items-center justify-center size-full bg-primary gap-3">
                <IconUser className="size-10 opacity-20" />
                <p className="text-sm font-black lowercase text-primary/50">profile not found</p>
                <p className="text-xs lowercase text-primary/30">no profile exists for &quot;{normalizedUsername}&quot;</p>
            </div>
        )
    }

    return (
        <div className="corpus-root flex flex-col size-full bg-primary text-primary font-sans overflow-hidden">
            {/* Top Bar */}
            <div
                data-scheme="tertiary"
                className="flex w-full items-center px-1.5 py-0.5 select-none gap-2 justify-between bg-primary border-b border-primary shrink-0 z-10 h-10"
            >
                {/* LEFT */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-0.5">
                        <OSButton size="sm" onClick={goBack} disabled={!canGoBack} className="p-1 h-8 w-8 !rounded-md">
                            <IconChevronLeft className={`size-[18px] ${canGoBack ? 'opacity-100' : 'opacity-30'}`} />
                        </OSButton>
                        <OSButton size="sm" onClick={goForward} disabled={!canGoForward} className="p-1 h-8 w-8 !rounded-md">
                            <IconChevronRight className={`size-[18px] ${canGoForward ? 'opacity-100' : 'opacity-30'}`} />
                        </OSButton>
                    </div>
                    <div className="hidden sm:block w-px h-5 bg-black/20 dark:bg-white/20 mx-1 flex-shrink-0" />
                    <div className="flex items-center gap-1.5 ml-1">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={displayName} className="size-5 rounded-full object-cover border border-primary/20" />
                        ) : (
                            <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                <span className="text-[9px] font-black text-primary/60">{displayName.charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                        <h1 className="text-[13px] font-bold tracking-tight text-primary leading-none m-0 whitespace-nowrap">
                            {displayName}&apos;s profile
                        </h1>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/30 border border-primary/15 px-1.5 py-0.5 rounded hidden sm:inline">public</span>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-1 justify-end flex-shrink-0">
                    {isOwner && (
                        <OSButton
                            size="sm"
                            className="!px-2 h-8 !rounded flex items-center gap-1.5 flex-shrink-0"
                            onClick={() => addWindow({
                                key: `corpus-${normalizedUsername}`,
                                path: `/u/${normalizedUsername}`,
                                title: displayName + `'s corpus`
                            })}
                        >
                            <PenLine className="size-[14px] opacity-70" />
                            <span className="hidden md:inline text-[12px] font-semibold">my corpus</span>
                        </OSButton>
                    )}
                    <div className="hidden sm:block w-px h-5 bg-black/20 dark:bg-white/20 mx-1 flex-shrink-0" />
                    <Tooltip trigger={<OSButton size="sm" className="p-1.5 h-8 w-8 !rounded"><Share className="size-[16px] opacity-70" /></OSButton>} side="bottom">share profile</Tooltip>
                    {profile.website && (
                        <Tooltip trigger={
                            <a href={profile.website} target="_blank" rel="noopener noreferrer">
                                <OSButton size="sm" className="p-1.5 h-8 w-8 !rounded"><ExternalLink className="size-[16px] opacity-70" /></OSButton>
                            </a>
                        } side="bottom">website</Tooltip>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fafcfc] dark:bg-primary">
                {/* Profile Section */}
                <main className="corpus-main">
                    <div className="corpus-shadow corpus-shadow--main"><div /></div>
                    <section className="corpus-layer">
                        <div className="corpus-mover">
                            <div className="corpus-shadow corpus-shadow--main"><div /></div>
                            <div className="corpus-content--main">
                                <p className="corpus-heading">
                                    <IconUser className="size-4" />
                                    <span className="lowercase">{displayName}&apos;s profile</span>
                                    <span className="corpus-badge ml-auto">
                                        <Globe className="size-3" />
                                        <span>public</span>
                                    </span>
                                </p>
                                <div className="corpus-profile-slot">
                                    {/* Cover */}
                                    <div className="h-24 w-full relative overflow-hidden rounded-t-lg">
                                        {profile.cover_url
                                            ? <img src={profile.cover_url} alt="cover" className="size-full object-cover" />
                                            : <div className="size-full bg-gradient-to-br from-primary/10 via-primary/5 to-accent"><div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, var(--color-primary) 0%, transparent 60%), radial-gradient(circle at 80% 20%, var(--color-primary) 0%, transparent 50%)' }} /></div>
                                        }
                                    </div>
                                    {/* Avatar + name row */}
                                    <div className="px-4 pt-0 pb-3">
                                        <div className="flex items-end gap-3 -mt-8 mb-3">
                                            <div className="size-14 rounded-xl border-2 border-white dark:border-black/40 bg-accent overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                                                {profile.avatar_url ? <img src={profile.avatar_url} alt={displayName} className="size-full object-cover" /> : <IconUser className="size-5 text-primary/30" />}
                                            </div>
                                            <div className="flex-1 min-w-0 pb-1">
                                                <h2 className="text-sm font-black lowercase tracking-tight text-primary m-0 leading-tight">{displayName}</h2>
                                            </div>
                                        </div>
                                        {/* Social links */}
                                        {(isOwner || profile.website || profile.github || profile.linkedin || profile.twitter) && (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {isOwner && (
                                                    <OSButton size="sm" className="h-6 px-2 !rounded text-[9px] font-bold lowercase flex items-center gap-1"
                                                        onClick={() => addWindow({ key: `corpus-${normalizedUsername}`, path: `/u/${normalizedUsername}`, title: displayName + `'s corpus` })}>
                                                        <PenLine className="size-2.5" />edit
                                                    </OSButton>
                                                )}
                                                {profile.website && <Tooltip trigger={<a href={profile.website} target="_blank" rel="noopener noreferrer"><OSButton size="sm" className="h-6 w-6 !rounded"><Globe className="size-2.5" /></OSButton></a>} side="bottom">website</Tooltip>}
                                                {profile.github && <Tooltip trigger={<a href={profile.github} target="_blank" rel="noopener noreferrer"><OSButton size="sm" className="h-6 w-6 !rounded"><Github className="size-2.5" /></OSButton></a>} side="bottom">github</Tooltip>}
                                                {profile.linkedin && <Tooltip trigger={<a href={profile.linkedin} target="_blank" rel="noopener noreferrer"><OSButton size="sm" className="h-6 w-6 !rounded"><Linkedin className="size-2.5" /></OSButton></a>} side="bottom">linkedin</Tooltip>}
                                                {profile.twitter && <Tooltip trigger={<a href={profile.twitter} target="_blank" rel="noopener noreferrer"><OSButton size="sm" className="h-6 w-6 !rounded"><Twitter className="size-2.5" /></OSButton></a>} side="bottom">twitter</Tooltip>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                {/* Info + Stats Cards */}
                <div className="corpus-nodes-wrapper">
                    <div className="corpus-nodes-card">
                        <div className="corpus-table-heading">
                            <IconUser className="size-3.5" style={{ color: 'var(--corpus-accent)' }} />
                            <span>profile</span>
                            <span className="corpus-badge"><Globe className="size-3" /><span>info</span></span>
                        </div>
                        <dl className="corpus-status-dl">
                            {profile.role && (<><dt><Star className="size-3.5" /><span>role</span></dt><dd>{profile.role}</dd></>)}
                            {profile.bio && (<><dt><PenLine className="size-3.5" /><span>bio</span></dt><dd className="corpus-info-bio">{profile.bio}</dd></>)}
                            {profile.pronouns && (<><dt><Star className="size-3.5" /><span>pronouns</span></dt><dd>{profile.pronouns}</dd></>)}
                            {profile.location && (<><dt><MapPin className="size-3.5" /><span>location</span></dt><dd>{profile.location}</dd></>)}
                            {profile.website && (<><dt><Globe className="size-3.5" /><span>website</span></dt><dd><a href={profile.website} target="_blank" rel="noopener noreferrer" className="corpus-link">{profile.website.replace(/^https?:\/\//, '')}</a></dd></>)}
                            {profile.github && (<><dt><Github className="size-3.5" /><span>github</span></dt><dd><a href={profile.github} target="_blank" rel="noopener noreferrer" className="corpus-link">{profile.github.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</a></dd></>)}
                            {profile.linkedin && (<><dt><Linkedin className="size-3.5" /><span>linkedin</span></dt><dd><a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="corpus-link">linkedin</a></dd></>)}
                            {profile.twitter && (<><dt><Twitter className="size-3.5" /><span>twitter</span></dt><dd><a href={profile.twitter} target="_blank" rel="noopener noreferrer" className="corpus-link">{profile.twitter.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, '')}</a></dd></>)}
                            {!profile.role && !profile.bio && !profile.pronouns && !profile.location && !profile.website && !profile.github && !profile.linkedin && !profile.twitter && (<><dt><PenLine className="size-3.5" /><span>bio</span></dt><dd className="corpus-info-bio">—</dd></>)}
                        </dl>
                    </div>
                    <div className="corpus-stats-card">
                        <div className="corpus-table-heading">
                            <Layers className="size-3.5" style={{ color: 'var(--corpus-accent)' }} />
                            <span>corpus</span>
                            <span className="corpus-badge"><BookOpen className="size-3" /><span>stats</span></span>
                        </div>
                        <dl className="corpus-status-dl">
                            <dt><BookOpen className="size-3.5" /><span>published</span></dt><dd>{nodes.length}</dd>
                            <dt><Users className="size-3.5" /><span>visibility</span></dt><dd>public</dd>
                            <dt><Layers className="size-3.5" /><span>total nodes</span></dt><dd className="corpus-highlight">{nodes.length}</dd>
                        </dl>
                    </div>
                </div>

                {/* Published Nodes Grid */}
                <div className="corpus-doc-grid-wrapper">
                    <div className="corpus-doc-tabs">
                        <button className="corpus-doc-tab corpus-doc-tab--active">published <span>{nodes.length}</span></button>
                    </div>
                    {nodesLoading && (
                        <div className="corpus-doc-empty"><RefreshCw className="size-6 animate-spin" style={{ opacity: 0.3 }} /><p>loading nodes...</p></div>
                    )}
                    {!nodesLoading && (
                        <div className="corpus-doc-grid">
                            {nodes.map(node => (
                                <article key={node.id} className="corpus-doc-card">
                                    <div className="corpus-doc-media">
                                        <div className="corpus-doc-preview-text">{node.preview}</div>
                                        <div className="corpus-doc-media-fade" />
                                        <div className="corpus-doc-badge"><BookOpen className="size-3" /><span>pub</span></div>
                                    </div>
                                    <div className="corpus-doc-info">
                                        <div><FileText className="size-3.5" /><span>{node.updated}</span></div>
                                        <h3>{node.title}</h3>
                                        <p>published</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    {!nodesLoading && nodes.length === 0 && (
                        <div className="corpus-doc-empty"><BookOpen className="size-8" style={{ opacity: 0.2 }} /><p>no published nodes yet</p></div>
                    )}
                </div>
            </div>
        </div>
    )
}