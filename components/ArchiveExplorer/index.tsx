import React from 'react'
import { useApp } from 'context/App'
import { AppIcon, AppIconName } from 'components/OSIcons/AppIcon'
import { LayoutGrid, RotateCcw, Play } from 'lucide-react'
import PostsView from 'components/Posts'

const APP_META: Record<string, { label: string; iconName: AppIconName; path: string; title: string; element?: React.ReactNode }> = {
    home: { label: 'home', iconName: 'compass', path: '/', title: 'home' },
    posts: { label: 'posts', iconName: 'forums', path: '/posts', title: 'posts', element: <PostsView /> },
    login: { label: 'login', iconName: 'posthog', path: '/login', title: 'login' },
    contact: { label: 'contact', iconName: 'contact', path: '/contact', title: 'contact' }
}

export default function ArchiveExplorer() {
    const { archivedItems, restoreItem, addWindow } = useApp()

    const handleRestore = (label: string) => {
        restoreItem(label)
    }

    const handleLaunch = (label: string) => {
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

    const archivedApps = archivedItems
        .map(label => APP_META[label])
        .filter(Boolean)

    return (
        <div className="h-full flex flex-col font-sans text-primary select-none p-6">
            <header className="flex-shrink-0 flex items-center justify-between pb-4 border-b border-primary/10">
                <div className="flex items-center gap-2.5">
                    <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <LayoutGrid className="size-3.5 text-primary" />
                    </div>
                    <span className="font-bold tracking-tight lowercase">Archive Explorer</span>
                </div>
                <span className="text-xs text-muted font-mono">{archivedApps.length} item(s)</span>
            </header>

            <main className="flex-1 overflow-y-auto py-6">
                {archivedApps.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted">
                        <LayoutGrid className="size-12 stroke-[1.2] mb-3 opacity-30" />
                        <p className="text-sm lowercase">Archive folder is empty.</p>
                        <p className="text-xs mt-1 lowercase opacity-70">drag and drop desktop icons here to archive them.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        onClick={() => handleLaunch(app.label)}
                                        title="open app"
                                        className="p-2.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-primary transition-colors"
                                    >
                                        <Play className="size-4 fill-current" />
                                    </button>
                                    <button
                                        onClick={() => handleRestore(app.label)}
                                        title="restore to desktop"
                                        className="p-2.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-primary transition-colors"
                                    >
                                        <RotateCcw className="size-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
