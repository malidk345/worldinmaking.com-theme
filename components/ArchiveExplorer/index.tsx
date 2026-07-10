import React, { useState, useEffect } from 'react'
import { useApp } from 'context/App'
import { useAuth } from 'context/AuthContext'
import { supabase } from 'lib/supabase'
import { AppIcon, AppIconName } from 'components/OSIcons/AppIcon'
import { useTranslation } from 'hooks/useTranslation'
import { 
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
    const { t, lang } = useTranslation()
    
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
    }, [currentFolder, user, fetchSavedPosts])

    const getAppTranslation = (label: string) => {
        switch (label) {
            case 'home': return t('menu.home')
            case 'posts': return t('posts.title')
            case 'login': return t('menu.sign_in')
            case 'contact': return t('contact.title')
            default: return label
        }
    }

    const handleRestoreApp = (label: string) => {
        restoreItem(label)
    }

    const handleLaunchApp = (label: string) => {
        const meta = APP_META[label]
        if (meta) {
            addWindow({
                key: meta.label,
                path: meta.path,
                title: getAppTranslation(label),
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
            title: t('menu.sign_in')
        })
    }

    const archivedApps = archivedItems
        .map(label => {
            const meta = APP_META[label]
            if (!meta) return null
            return {
                ...meta,
                displayLabel: getAppTranslation(label)
            }
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))

    return (
        <div className="h-full flex flex-col font-sans text-primary select-none p-4 bg-transparent">
            {/* Header / Breadcrumb navigation */}
            <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 mb-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-2 pl-1">
                    {currentFolder !== 'root' && (
                        <button 
                            onClick={() => setCurrentFolder('root')}
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-primary transition-all cursor-pointer flex items-center justify-center"
                        >
                            <ChevronLeft className="size-3.5" />
                        </button>
                    )}
                    <span className="font-semibold tracking-tight text-[11px] lowercase flex items-center gap-1.5">
                        <span 
                            className={`cursor-pointer hover:underline hover:text-primary transition-all ${currentFolder !== 'root' ? 'opacity-50' : 'text-primary font-bold'}`}
                            onClick={() => setCurrentFolder('root')}
                        >
                            {t('archive.breadcrumb')}
                        </span>
                        {currentFolder !== 'root' && (
                            <>
                                <span className="opacity-30 text-[9px] font-mono">&gt;</span>
                                <span className="font-bold text-primary">{currentFolder === 'apps' ? t('archive.applications') : t('archive.saved_posts')}</span>
                            </>
                        )}
                    </span>
                </div>

                <div className="text-[10px] text-primary/60 font-mono flex items-center gap-2 pr-1">
                    {currentFolder === 'saved-posts' && user && (
                        <button 
                            onClick={() => { setRefreshing(true); fetchSavedPosts(); }}
                            className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer ${refreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="size-3" />
                        </button>
                    )}
                    <span className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-black/5 dark:border-white/5">
                        {currentFolder === 'root' && `${archivedApps.length + (user ? savedPosts.length : 0)} ${t('archive.items')}`}
                        {currentFolder === 'apps' && `${archivedApps.length} ${t('archive.apps')}`}
                        {currentFolder === 'saved-posts' && (user ? `${savedPosts.length} ${t('archive.posts')}` : t('archive.locked'))}
                    </span>
                </div>
            </header>

            {/* Folder Main Content */}
            <main className="flex-1 overflow-y-auto pr-1">
                
                {/* 1. ROOT VIEW: Folders list */}
                {currentFolder === 'root' && (
                    <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                        {/* Folder A: Applications */}
                        <div 
                            onClick={() => setCurrentFolder('apps')}
                            className="group flex flex-col p-4 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-white/60 dark:hover:bg-white/[0.06] cursor-pointer transition-all duration-200 shadow-sm"
                        >
                            <div className="size-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 mb-3 border border-black/5 dark:border-white/5">
                                <AppIcon name="folder" className="size-7 grayscale opacity-50 dark:opacity-60 transition-all duration-300 group-hover:scale-105 group-hover:opacity-85" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[12px] text-primary lowercase">{t('archive.applications')}</h4>
                                <p className="text-[10px] text-primary/50 mt-0.5 lowercase leading-tight truncate">
                                    {archivedApps.length} {t('archive.items')}
                                </p>
                            </div>
                        </div>

                        {/* Folder B: Saved Posts */}
                        <div 
                            onClick={() => setCurrentFolder('saved-posts')}
                            className="group flex flex-col p-4 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-white/60 dark:hover:bg-white/[0.06] cursor-pointer transition-all duration-200 shadow-sm"
                        >
                            <div className="size-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 mb-3 border border-black/5 dark:border-white/5">
                                <AppIcon name="doc" className="size-7 grayscale opacity-50 dark:opacity-60 transition-all duration-300 group-hover:scale-105 group-hover:opacity-85" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[12px] text-primary lowercase">{t('archive.saved_posts')}</h4>
                                <p className="text-[10px] text-primary/50 mt-0.5 lowercase leading-tight truncate">
                                    {!user ? t('archive.locked') : `${savedPosts.length} ${t('archive.posts')}`}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. APPLICATIONS FOLDER VIEW */}
                {currentFolder === 'apps' && (
                    <>
                        {archivedApps.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted min-h-[180px]">
                                <Folder className="size-10 stroke-[1.2] mb-2 opacity-35" />
                                <p className="text-xs lowercase font-semibold">{t('archive.empty_apps')}</p>
                                <p className="text-[10px] mt-0.5 lowercase opacity-60">{t('archive.empty_apps_sub')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                                {archivedApps.map((app) => (
                                    <div
                                        key={app.label}
                                        className="flex items-center gap-3 p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/15 dark:hover:border-white/15 transition-all duration-200"
                                    >
                                        <div className="size-10 bg-white/80 dark:bg-black/40 rounded-xl flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5">
                                            <AppIcon name={app.iconName} className="size-6.5 grayscale opacity-60" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-[12px] text-primary truncate lowercase">{app.displayLabel || app.label}</h4>
                                            <p className="text-[10px] text-primary/45 truncate lowercase font-mono mt-0.5">{app.path}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleLaunchApp(app.label)}
                                                title={t('archive.open_app')}
                                                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-primary transition-all cursor-pointer"
                                            >
                                                <Play className="size-3 fill-current" />
                                            </button>
                                            <button
                                                onClick={() => handleRestoreApp(app.label)}
                                                title={t('archive.restore_desktop')}
                                                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-primary transition-all cursor-pointer"
                                            >
                                                <RotateCcw className="size-3" />
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
                            <div className="h-full flex flex-col items-center justify-center text-center p-4 min-h-[200px] justify-self-center max-w-[260px] w-full animate-fadeIn">
                                <div className="w-full p-6 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 shadow-sm flex flex-col items-center text-center">
                                    <div className="size-11 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3 text-primary border border-black/5 dark:border-white/5">
                                        <Lock className="size-5 grayscale opacity-60" />
                                    </div>
                                    <h4 className="font-bold text-[12.5px] text-primary lowercase mb-1">{t('archive.auth_required')}</h4>
                                    <p className="text-[10px] text-primary/50 leading-normal lowercase mb-4 max-w-[190px]">
                                        {t('archive.auth_required_sub')}
                                    </p>
                                    <button
                                        onClick={handleOpenLogin}
                                        className="w-full py-2 rounded-full bg-black/85 hover:bg-black dark:bg-white/80 dark:hover:bg-white text-white dark:text-black font-semibold text-[11px] transition-all cursor-pointer shadow-sm"
                                    >
                                        {t('archive.sign_in')}
                                    </button>
                                </div>
                            </div>
                        ) : loadingPosts ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted min-h-[180px]">
                                <RefreshCw className="size-6 animate-spin opacity-50 mb-2" />
                                <p className="text-xs lowercase">{t('archive.loading_saved')}</p>
                            </div>
                        ) : savedPosts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted min-h-[180px]">
                                <Bookmark className="size-10 stroke-[1.2] mb-2 opacity-35" />
                                <p className="text-xs lowercase font-semibold">{t('archive.no_saved')}</p>
                                <p className="text-[10px] mt-0.5 lowercase opacity-60">{t('archive.no_saved_sub')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 animate-fadeIn">
                                {savedPosts.map((post) => (
                                    <div
                                        key={post.post_slug}
                                        className="flex items-center justify-between p-2.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-black/15 dark:hover:border-white/15 hover:bg-white/60 dark:hover:bg-white/[0.06] transition-all duration-200"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                                            <div className="size-9 rounded-xl bg-white/80 dark:bg-black/40 flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5 shadow-sm">
                                                <AppIcon name="doc" className="size-5.5 grayscale opacity-60" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-[12px] text-primary truncate lowercase hover:underline cursor-pointer" onClick={() => handleLaunchPost(post)}>{post.post_title || post.post_slug}</h4>
                                                <p className="text-[9px] text-primary/40 truncate font-mono mt-0.5">
                                                    {t('archive.saved_date')} {new Date(post.saved_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => handleLaunchPost(post)}
                                                title={t('archive.read_post')}
                                                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-primary transition-colors cursor-pointer"
                                            >
                                                <ExternalLink className="size-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleUnsavePost(post.post_slug)}
                                                title={t('archive.remove_bookmark')}
                                                className="p-2 rounded-full hover:bg-red-500/10 text-primary/60 hover:text-red-500 transition-colors cursor-pointer"
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
