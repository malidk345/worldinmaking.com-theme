import React, { useState, useEffect } from 'react'
import { useApp } from 'context/App'
import { useAuth } from 'context/AuthContext'
import { supabase } from 'lib/supabase'
import { AppIcon, AppIconName } from 'components/OSIcons/AppIcon'
import { 
    LayoutGrid, 
    RotateCcw, 
    Play, 
    Folder, 
    Bookmark, 
    ChevronLeft, 
    Trash2, 
    Lock,
    RefreshCw,
    ExternalLink
} from 'lucide-react'
import PostsView from 'components/Posts'

const APP_META: Record<string, { label: string; iconName: AppIconName; path: string; title: string; element?: React.ReactNode }> = {
    home: { label: 'home', iconName: 'compass', path: '/', title: 'home' },
    posts: { label: 'posts', iconName: 'forums', path: '/posts', title: 'posts', element: <PostsView /> },
    login: { label: 'login', iconName: 'posthog', path: '/login', title: 'login' },
    contact: { label: 'contact', iconName: 'contact', path: '/contact', title: 'contact' }
}

interface SavedPost {
    post_slug: string
    post_title: string | null
    saved_at: string
}

export default function ArchiveExplorer() {
    const { archivedItems, restoreItem, addWindow } = useApp()
    const { user } = useAuth()
    
    const [currentFolder, setCurrentFolder] = useState<'root' | 'apps' | 'saved-posts'>('root')
    const [savedPosts, setSavedPosts] = useState<SavedPost[]>([])
    const [loadingPosts, setLoadingPosts] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    // Fetch saved posts from Supabase
    const fetchSavedPosts = async () => {
        if (!user) return
        setLoadingPosts(true)
        try {
            const { data, error } = await supabase
                .from('user_saved_posts')
                .select('post_slug, post_title, saved_at')
                .order('saved_at', { ascending: false })
            
            if (error) throw error
            setSavedPosts(data || [])
        } catch (err) {
            console.error('Failed to fetch saved posts:', err)
        } finally {
            setLoadingPosts(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        if (currentFolder === 'saved-posts' && user) {
            fetchSavedPosts()
        }
    }, [currentFolder, user])

    const handleRestoreApp = (label: string) => {
        restoreItem(label)
    }

    const handleLaunchApp = (label: string) => {
        const meta = APP_META[label]
        if (meta) {
            addWindow({
                key: meta.label,
                path: meta.path,
                title: meta.title,
                element: meta.element
            })
        }
    }

    const handleLaunchPost = (post: SavedPost) => {
        addWindow({
            key: `post-${post.post_slug}`,
            path: `/posts/${post.post_slug}`,
            title: post.post_title || post.post_slug
        })
    }

    const handleUnsavePost = async (slug: string) => {
        if (!user) return
        try {
            const { error } = await supabase
                .from('user_saved_posts')
                .delete()
                .eq('post_slug', slug)
            
            if (error) throw error
            setSavedPosts(prev => prev.filter(p => p.post_slug !== slug))
        } catch (err) {
            console.error('Failed to unsave post:', err)
        }
    }

    const handleOpenLogin = () => {
        addWindow({
            key: 'login',
            path: '/login',
            title: 'login'
        })
    }

    const archivedApps = archivedItems
        .map(label => APP_META[label])
        .filter(Boolean)

    return (
        <div className="h-full flex flex-col font-sans text-primary select-none p-6 bg-transparent">
            {/* Header / Breadcrumb navigation */}
            <header className="flex-shrink-0 flex items-center justify-between px-2 py-2.5 mb-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-3 pl-2">
                    {currentFolder !== 'root' && (
                        <button 
                            onClick={() => setCurrentFolder('root')}
                            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-primary transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-black/5 dark:hover:border-white/5 shadow-sm"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                    )}
                    <span className="font-semibold tracking-tight text-[13px] lowercase flex items-center gap-1.5">
                        <span 
                            className={`cursor-pointer hover:underline hover:text-primary transition-all ${currentFolder !== 'root' ? 'opacity-50' : 'text-primary font-bold'}`}
                            onClick={() => setCurrentFolder('root')}
                        >
                            archive
                        </span>
                        {currentFolder !== 'root' && (
                            <>
                                <span className="opacity-30 text-[10px] font-mono">&gt;</span>
                                <span className="font-bold text-primary">{currentFolder === 'apps' ? 'applications' : 'saved posts'}</span>
                            </>
                        )}
                    </span>
                </div>

                <div className="text-[11px] text-primary/60 font-mono flex items-center gap-3 pr-2">
                    {currentFolder === 'saved-posts' && user && (
                        <button 
                            onClick={() => { setRefreshing(true); fetchSavedPosts(); }}
                            className={`p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-black/5 dark:hover:border-white/5 ${refreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="size-3.5" />
                        </button>
                    )}
                    <span className="bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                        {currentFolder === 'root' && `${archivedApps.length + (user ? savedPosts.length : 0)} items`}
                        {currentFolder === 'apps' && `${archivedApps.length} apps`}
                        {currentFolder === 'saved-posts' && (user ? `${savedPosts.length} posts` : 'locked')}
                    </span>
                </div>
            </header>

            {/* Folder Main Content */}
            <main className="flex-1 overflow-y-auto pr-1">
                
                {/* 1. ROOT VIEW: Folders list */}
                {currentFolder === 'root' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Folder A: Applications */}
                        <div 
                            onClick={() => setCurrentFolder('apps')}
                            className="group relative overflow-hidden flex flex-col p-6 rounded-[28px] bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-white/60 dark:hover:bg-white/[0.06] cursor-pointer transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]"
                        >
                            <div className="size-16 rounded-[22px] bg-gradient-to-tr from-blue-500/20 to-cyan-500/10 dark:from-blue-500/30 dark:to-cyan-500/5 flex items-center justify-center shadow-sm shrink-0 mb-4 transition-transform duration-300 group-hover:scale-105">
                                <Folder className="size-8 text-blue-600 dark:text-blue-400 fill-current opacity-70" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[15px] text-primary lowercase flex items-center gap-1.5">
                                    <span>applications</span>
                                </h4>
                                <p className="text-[12px] text-primary/60 mt-1 lowercase leading-snug">
                                    contains {archivedApps.length} archived desktop app icons and navigation modules.
                                </p>
                            </div>
                        </div>

                        {/* Folder B: Saved Posts */}
                        <div 
                            onClick={() => setCurrentFolder('saved-posts')}
                            className="group relative overflow-hidden flex flex-col p-6 rounded-[28px] bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-white/60 dark:hover:bg-white/[0.06] cursor-pointer transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]"
                        >
                            <div className="size-16 rounded-[22px] bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 dark:from-emerald-500/30 dark:to-teal-500/5 flex items-center justify-center shadow-sm shrink-0 mb-4 transition-transform duration-300 group-hover:scale-105">
                                <Bookmark className="size-8 text-emerald-600 dark:text-emerald-400 fill-current opacity-70" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[15px] text-primary lowercase">
                                    <span>saved posts</span>
                                </h4>
                                <p className="text-[12px] text-primary/60 mt-1 lowercase leading-snug">
                                    {!user ? 'authentication required to view bookmarked reader items.' : `contains ${savedPosts.length} bookmarked transmission and articles.`}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. APPLICATIONS FOLDER VIEW */}
                {currentFolder === 'apps' && (
                    <>
                        {archivedApps.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted min-h-[240px]">
                                <Folder className="size-12 stroke-[1.2] mb-3 opacity-30 text-blue-500" />
                                <p className="text-sm lowercase">applications folder is empty.</p>
                                <p className="text-xs mt-1 lowercase opacity-70">drag and drop desktop icons to archive them.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                                {archivedApps.map((app) => (
                                    <div
                                        key={app.label}
                                        className="flex items-center gap-4 p-4 rounded-[26px] bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/15 dark:hover:border-white/15 transition-all duration-300"
                                    >
                                        <div className="size-12 bg-white/85 dark:bg-black/40 rounded-[18px] flex items-center justify-center shadow-sm shrink-0 border border-black/5 dark:border-white/5">
                                            <AppIcon name={app.iconName} className="size-8" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-[13.5px] text-primary truncate lowercase">{app.label}</h4>
                                            <p className="text-[11px] text-primary/50 truncate lowercase font-mono mt-0.5">{app.path}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleLaunchApp(app.label)}
                                                title="open app"
                                                className="p-2.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all cursor-pointer border border-transparent"
                                            >
                                                <Play className="size-3.5 fill-current" />
                                            </button>
                                            <button
                                                onClick={() => handleRestoreApp(app.label)}
                                                title="restore to desktop"
                                                className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-primary transition-all cursor-pointer border border-transparent shadow-sm"
                                            >
                                                <RotateCcw className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* 3. SAVED POSTS FOLDER VIEW */}
                {currentFolder === 'saved-posts' && (
                    <>
                        {!user ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted min-h-[240px] justify-self-center max-w-sm">
                                <div className="w-full p-8 rounded-[32px] bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.06)] flex flex-col items-center text-center">
                                    <div className="size-16 rounded-[22px] bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mb-5 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/10">
                                        <Lock className="size-8" />
                                    </div>
                                    <h4 className="font-bold text-[15px] text-primary lowercase mb-1.5">authentication required</h4>
                                    <p className="text-xs text-primary/60 leading-relaxed lowercase mb-6 max-w-[260px]">
                                        you must be logged in to sync and view bookmarked articles across devices.
                                    </p>
                                    <button
                                        onClick={handleOpenLogin}
                                        className="w-full py-3 rounded-full bg-black/80 hover:bg-black dark:bg-white/80 dark:hover:bg-white text-white dark:text-black font-semibold text-xs transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
                                    >
                                        sign in to account
                                    </button>
                                </div>
                            </div>
                        ) : loadingPosts ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted min-h-[240px]">
                                <RefreshCw className="size-8 animate-spin opacity-50 mb-3" />
                                <p className="text-xs lowercase">loading saved posts...</p>
                            </div>
                        ) : savedPosts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted min-h-[240px]">
                                <Bookmark className="size-12 stroke-[1.2] mb-3 opacity-30 text-emerald-500" />
                                <p className="text-sm lowercase">no saved posts found.</p>
                                <p className="text-xs mt-1 lowercase opacity-70">posts saved from the reader view will appear here.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 animate-fadeIn">
                                {savedPosts.map((post) => (
                                    <div
                                        key={post.post_slug}
                                        className="flex items-center justify-between p-4 rounded-[26px] bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/15 dark:hover:border-white/15 hover:bg-white/60 dark:hover:bg-white/[0.06] transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
                                            <div className="size-11 rounded-[18px] bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/5 shadow-sm">
                                                <Bookmark className="size-5 text-emerald-600 dark:text-emerald-400 fill-current opacity-70" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-[13.5px] text-primary truncate lowercase hover:underline cursor-pointer" onClick={() => handleLaunchPost(post)}>{post.post_title || post.post_slug}</h4>
                                                <p className="text-[10px] text-primary/40 truncate font-mono mt-0.5">
                                                    saved {new Date(post.saved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => handleLaunchPost(post)}
                                                title="read post"
                                                className="p-2.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer border border-transparent"
                                            >
                                                <ExternalLink className="size-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleUnsavePost(post.post_slug)}
                                                title="remove bookmark"
                                                className="p-2.5 rounded-full bg-red-500/5 hover:bg-red-500/10 text-primary/60 hover:text-red-500 transition-all cursor-pointer border border-transparent"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}
