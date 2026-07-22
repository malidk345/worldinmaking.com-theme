"use client"

import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useApp } from 'context/App'
import { usePosts } from 'hooks/usePosts'

import type { Post } from 'types/database'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { useTranslation } from 'hooks/useTranslation'
import BlogPostView from 'components/ReaderView/BlogPostView'
import SEO from 'components/SEO'
import Loading from 'components/Loading'
import 'components/Corpus/styles.css'
import { parsePaperMeta } from 'lib/wimbot-orchestrator'

import { IconSparkles } from '@posthog/icons'
import { LemonTag, LemonTable, LemonButton } from '@/components/LemonUI'

dayjs.extend(utc)
dayjs.extend(relativeTime)

const getPostHref = (slug?: string) => {
    if (!slug) return '/posts'
    return `/posts/${encodeURIComponent(slug)}`
}

const PostsView = React.memo(() => {
    const { posts, loading } = usePosts()
    const { addWindow } = useApp()
    const { t, lang: preferredLanguage } = useTranslation()

    const sortedRoadmaps = useMemo(() => {
        const filteredPosts = posts.filter(post => {
            if (preferredLanguage === 'tr') {
                return post.originalLanguage === 'tr' || post.translations?.['tr']
            }
            // default to English behavior
            return post.originalLanguage === 'en' || post.translations?.['en'] || !post.originalLanguage
        })

        // ⚡ Bolt: Use Schwartzian transform to prevent O(N log N) Date parsing during sort.
        const mappedPosts = filteredPosts.map(post => {
            const postRec = post as unknown as Record<string, string>
            return {
                post,
                time: dayjs.utc(post.date || postRec.created_at).unix()
            }
        })
        return mappedPosts.sort((a, b) => b.time - a.time).map(m => m.post)
    }, [posts, preferredLanguage])

    const handleRoadmapClick = (roadmap: Post) => {
        const isTr = preferredLanguage === 'tr'
        const displayTitle = (isTr && roadmap.translations?.['tr']?.title) ? roadmap.translations['tr'].title : roadmap.title
        const activeSlug = (isTr && roadmap.translations?.['tr']?.slug) ? roadmap.translations['tr'].slug : roadmap.slug

        addWindow({
            key: `blog-${roadmap.id}`,
            path: getPostHref(activeSlug),
            title: displayTitle.toLowerCase(),
            element: <BlogPostView post={roadmap} />
        })
    }

    if (loading) return <Loading fullScreen label={t('loading.posts')} />

    return (
        <div className="scene-content flex flex-col gap-y-4 relative z-10" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-3000)', fontFamily: 'var(--font-sans)', color: 'var(--text-3000)', padding: '1.5rem' }}>
            <SEO title="posts" />
            <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, fontFamily: 'var(--font-title)' }}>
                            Posts
                        </h1>
                    </div>
                </div>

                <LemonTable
                    dataSource={sortedRoadmaps}
                    emptyState={t('posts.empty')}
                    columns={[
                        {
                            title: 'Title',
                            render: (_, roadmap) => {
                                const isTr = preferredLanguage === 'tr'
                                const displayTitle = (isTr && roadmap.translations?.['tr']?.title) ? roadmap.translations['tr'].title : roadmap.title

                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const roadmapRecord = roadmap as any
                                const paperMeta = parsePaperMeta((roadmapRecord.inner_thoughts as string) || (roadmapRecord.excerpt as string) || (roadmapRecord.paper_status as string))
                                const paperStatus = (roadmapRecord.paper_status as string) || paperMeta?.paper_status

                                return (
                                    <div className="font-semibold flex items-center gap-2">
                                        <a
                                            onClick={() => handleRoadmapClick(roadmap)}
                                            style={{ color: 'var(--text-3000)', textDecoration: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                        >
                                            {displayTitle}
                                        </a>
                                        {paperStatus && paperStatus !== 'published' && (
                                            <LemonTag type="warning">
                                                UNFINISHED • {paperStatus}
                                            </LemonTag>
                                        )}
                                    </div>
                                )
                            }
                        },
                        {
                            title: 'Category',
                            render: (_, roadmap) => {
                                const categoryName = (roadmap.category || roadmap.authorName || 'document').toLowerCase()
                                return <span>@{categoryName}</span>
                            }
                        },
                        {
                            title: 'Created',
                            align: 'right',
                            render: (_, roadmap) => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const roadmapRecord = roadmap as any
                                const dateStr = roadmap.date ? dayjs.utc(roadmap.date).local().format('DD/MM/YYYY, HH:mm') : (roadmapRecord.created_at ? dayjs.utc(roadmapRecord.created_at).local().format('DD/MM/YYYY, HH:mm') : '')
                                return (
                                    <div className="whitespace-nowrap text-right" style={{ color: 'var(--color-text-secondary)' }}>
                                        {dateStr}
                                    </div>
                                )
                            }
                        }
                    ]}
                />
            </div>
        </div>
    )
})

PostsView.displayName = 'PostsView'

export default PostsView
