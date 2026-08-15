import React, { useEffect, useState } from 'react'
import OSButton from 'components/OSButton'
import { AppIcon } from 'components/OSIcons/AppIcon'
import { useAppActions, useAppWindows, useAppSettings } from 'context/App'
import { openAskAiWindow } from 'lib/open-ask-ai-window'
import { fetchSupabaseCommunityPosts, fetchSupabaseCommunityReplies } from 'lib/supabaseCommunity'

type PreviewReply = { who: string; body: string }
type PreviewThread = {
    id: string
    title: string
    who: string
    body: string
    replies: PreviewReply[]
}

function strip(html: string) {
    return String(html || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function clip(text: string, n: number) {
    const t = strip(text)
    return t.length > n ? `${t.slice(0, n).trim()}…` : t
}

export default function LiveTour() {
    const { windows } = useAppWindows()
    const { isMobile } = useAppSettings()
    const { addWindow, updateWindow, handleSnapToSide } = useAppActions()
    const [thread, setThread] = useState<PreviewThread | null>(null)
    const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading')

    useEffect(() => {
        let alive = true
        const load = async () => {
            try {
                const posts = await fetchSupabaseCommunityPosts(undefined, undefined, { limit: 1 })
                const post = posts?.[0]
                if (!post) {
                    if (alive) setStatus('empty')
                    return
                }
                const replies = await fetchSupabaseCommunityReplies(post.id)
                const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
                if (!alive) return
                setThread({
                    id: String(post.id),
                    title: post.title || 'Untitled thread',
                    who: author?.username || 'Resident',
                    body: clip(post.content, 280),
                    replies: (replies || []).slice(0, 3).map((r) => {
                        const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
                        return { who: p?.username || 'Reply', body: clip(r.content, 200) }
                    }),
                })
                setStatus('ready')
            } catch {
                if (alive) setStatus('empty')
            }
        }
        void load()
        return () => {
            alive = false
        }
    }, [])

    const openNotebookDesk = () => {
        addWindow({
            path: '/notebooks',
            title: 'Notebooks',
            snapped: isMobile ? false : 'left',
        })
        openAskAiWindow({
            windows,
            isMobile,
            addWindow,
            updateWindow,
            snapWindow: handleSnapToSide,
            notebookTitle: 'Demo desk',
        })
    }

    const openThread = () => {
        const path = thread ? `/questions/${thread.id}` : '/community'
        addWindow({
            key: 'forum-main-window',
            path,
            title: thread?.title || 'Community',
        })
    }

    return (
        <div className="border border-primary rounded-xl overflow-hidden bg-primary/25">
            <div className="px-4 py-3 border-b border-primary flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] uppercase tracking-widest font-bold text-muted m-0 mb-1">Live desk</p>
                    <p className="text-sm text-secondary m-0 max-w-xl">
                        Not a mock. This opens the same windows you use after the tour — notebook on the left, WIM
                        AI snapped right. The thread below is the latest post on the forum.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <OSButton size="sm" variant="primary" onClick={openNotebookDesk}>
                        Open notebook + AI
                    </OSButton>
                    <OSButton size="sm" variant="secondary" onClick={openThread}>
                        Open this thread
                    </OSButton>
                </div>
            </div>

            <div className="grid @md:grid-cols-2 gap-0">
                <button
                    type="button"
                    onClick={openNotebookDesk}
                    className="text-left p-4 border-b @md:border-b-0 @md:border-r border-primary hover:bg-accent/20 transition-colors"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AppIcon name="notebook" className="!size-8" />
                        <AppIcon name="wimAi" className="!size-8" />
                    </div>
                    <p className="text-sm font-semibold m-0 mb-1">Notebook beside the agent</p>
                    <p className="text-[13px] text-secondary m-0 leading-relaxed">
                        The real editor loads. Ask AI binds to the open page and can insert blocks. That is the
                        product — not a drawing of it.
                    </p>
                </button>

                <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AppIcon name="forums" className="!size-8" />
                        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                            Latest thread
                        </span>
                    </div>
                    {status === 'loading' && <p className="text-[13px] text-secondary m-0">Loading the seminar…</p>}
                    {status === 'empty' && (
                        <p className="text-[13px] text-secondary m-0">
                            No live thread yet. The hourly cron will open one — or start it in Community.
                        </p>
                    )}
                    {status === 'ready' && thread && (
                        <button type="button" onClick={openThread} className="text-left w-full">
                            <p className="text-sm font-semibold m-0 mb-1 hover:underline">{thread.title}</p>
                            <p className="text-[12px] text-navy font-semibold m-0 mb-1">{thread.who} · opens</p>
                            <p className="text-[13px] text-secondary m-0 leading-relaxed mb-2">{thread.body}</p>
                            {thread.replies.map((r, i) => (
                                <p key={i} className="text-[12px] m-0 mb-1 leading-snug">
                                    <span className="font-semibold text-navy">{r.who}</span>
                                    <span className="text-secondary"> — {r.body}</span>
                                </p>
                            ))}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
