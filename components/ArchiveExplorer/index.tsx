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
            <header className="flex-shrink-0 flex items-center justify-between pb-4 border-b border-primary/10">
                <div className="flex items-center gap-2">
                    {currentFolder !== 'root' && (
                        <button 
                            onClick={() => setCurrentFolder('root')}
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer mr-1"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                    )}
                    <span className="font-semibold tracking-tight text-[13px] lowercase flex items-center gap-1.5">
                        <span 
                            className={`cursor-pointer hover:underline ${currentFolder !== 'root' ? 'opacity-50' : ''}`}
                            onClick={() => setCurrentFolder('root')}
                        >
                            archive
                        </span>
                        {currentFolder !== 'root' && (
                            <>
                                <span className="opacity-30">/</span>
                                <span className="font-bold">{currentFolder === 'apps' ? 'applications' : 'saved posts'}</span>
                            </>
                        )}
                    </span>
                </div>

                <div className="text-xs text-muted font-mono flex items-center gap-3">
                    {currentFolder === 'saved-posts' && user && (
                        <button 
                            onClick={() => { setRefreshing(true); fetchSavedPosts(); }}
                            className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer ${refreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="size-3.5" />
                        </button>
                    )}
                    <span>
                        {currentFolder === 'root' && `${archivedApps.length + (user ? savedPosts.length : 0)} items`}
                        {currentFolder === 'apps' && `${archivedApps.length} apps`}
                        {currentFolder === 'saved-posts' && (user ? `${savedPosts.length} posts` : 'locked')}
                    </span>
                </div>
            </header>

            {/* Folder Main Content */}
            <main className="flex-1 overflow-y-auto py-6">
                
                {/* 1. ROOT VIEW: Folders list */}
                {currentFolder === 'root' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Folder A: Applications */}
                        <div 
                            onClick={() => setCurrentFolder('apps')}
                            className="group flex items-center gap-4 p-5 rounded-[28px] bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
                        >
                            <div className="size-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-105">
                                <Folder className="size-7 text-blue-600 dark:text-blue-400 fill-current opacity-75" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-[14px] lowercase">applications</h4>
                                <p className="text-xs text-muted mt-0.5 lowercase">{archivedApps.length} archived desktop icons</p>
                            </div>
                        </div>

                        {/* Folder B: Saved Posts */}
                        <div 
                            onClick={() => setCurrentFolder('saved-posts')}
                            className="group flex items-center gap-4 p-5 rounded-[28px] bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
                        >
                            <div className="size-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-105">
                                <Bookmark className="size-7 text-emerald-600 dark:text-emerald-400 fill-current opacity-75" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-[14px] lowercase">saved posts</h4>
                                <p className="text-xs text-muted mt-0.5 lowercase">
                                    {!user ? 'login required' : `${savedPosts.length} bookmarked posts`}
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
                                        className="flex items-center gap-4 p-4 rounded-[24px] bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-all duration-300"
                                    >
                                        <div className="size-12 bg-white dark:bg-black/30 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                            <AppIcon name={app.iconName} className="size-8" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm truncate lowercase">{app.label}</h4>
                                            <p className="text-xs text-muted truncate lowercase">{app.path}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleLaunchApp(app.label)}
                                                title="open app"
                                                className="p-2.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-primary transition-colors cursor-pointer"
                                            >
                                                <Play className="size-4 fill-current" />
                                            </button>
                                            <button
                                                onClick={() => handleRestoreApp(app.label)}
                                                title="restore to desktop"
                                                className="p-2.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-primary transition-colors cursor-pointer"
                                            >
                                                <RotateCcw className="size-4" />
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
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted min-h-[240px]">
                                <Lock className="size-12 stroke-[1.2] mb-3 opacity-30 text-emerald-500" />
                                <p className="text-sm lowercase font-bold">login required</p>
                                <p className="text-xs mt-1 mb-4 lowercase opacity-70">you must be logged in to view your saved posts.</p>
                                <button
                                    onClick={handleOpenLogin}
                                    className="px-5 py-2.5 rounded-full bg-white dark:bg-white/10 text-black dark:text-white font-semibold text-xs border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/20 transition-all cursor-pointer shadow-sm"
                                >
                                    login to account
                                </button>
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
                                        className="flex items-center justify-between p-4 rounded-[24px] bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
                                            <div className="size-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                <Bookmark className="size-5 text-emerald-600 dark:text-emerald-400 fill-current opacity-70" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-[13px] truncate lowercase">{post.post_title || post.post_slug}</h4>
                                                <p className="text-[10px] text-muted truncate font-mono mt-0.5">
                                                    saved {new Date(post.saved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => handleLaunchPost(post)}
                                                title="read post"
                                                className="p-2.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-primary transition-colors cursor-pointer"
                                            >
                                                <ExternalLink className="size-4" />
                                            </button>
                                            <button
                                                onClick={() => handleUnsavePost(post.post_slug)}
                                                title="remove bookmark"
                                                className="p-2.5 rounded-full hover:bg-red-500/10 text-primary hover:text-red-500 transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="size-4" />
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
