"use client"

import React, { useEffect, useState } from 'react'
import ForumPageLayout from 'components/Forum/ForumPageLayout'
import ForumQuestionDetail from 'components/Forum/ForumQuestionDetail'
import AdminPanel from 'components/AdminPanel'
import { WindowSearchUI } from 'components/Search/SearchUI'
import { usePosts } from '../../hooks/usePosts'
import { useCommunity } from '../../hooks/useCommunity'
import BlogPostView from 'components/ReaderView/BlogPostView'

const adaptPost = (p: any) => ({
    id: p.id,
    permalink: p.id.toString(),
    subject: p.title,
    body: p.content,
    createdAt: p.created_at,
    profile: {
        id: 0,
        firstName: p.profiles?.username || 'anonymous',
        lastName: '',
        avatar: p.profiles?.avatar_url || null,
    },
    replies: [],
    topics: [],
    pinnedTopics: [],
    resolved: false,
    archived: false,
})

/**
 * Routes window content based on item.path.
 * This replaces item.element so every window gets proper React content.
 */
export default function WindowRouter({ item }: { item: any }) {
    const path: string = item.path || ''

    // /questions/topic/:slug
    const topicMatch = path.match(/^\/questions\/topic\/([^/]+)/)
    if (topicMatch) {
        return <CommunityTopicRouteView slug={topicMatch[1]} />
    }

    // /questions/:permalink
    const permalinkMatch = path.match(/^\/questions\/([^/]+)/)
    if (permalinkMatch) {
        return <CommunityQuestionRouteView permalink={permalinkMatch[1]} />
    }
    // /questions
    if (path === '/questions') {
        return <CommunityMainRouteView />
    }

    // /posts or /blog
    if (path === '/posts' || path === '/blog') {
        const PostsView = require('components/Posts').default
        return <PostsView />
    }

    // /posts/:slug or /blog/:slug — fetch from Supabase via usePosts
    // Supporting both /posts/ and /blog/ for backward compatibility/flexibility
    const blogMatch = path.match(/^\/(blog|posts)\/([^/]+)/)
    if (blogMatch) {
        return <BlogRouteView slug={blogMatch[2]} />
    }

    // /search
    if (path === '/search') {
        return <WindowSearchUI initialFilter={item.props?.initialFilter} />
    }

    // /admin
    if (path === '/admin') {
        return <AdminPanel />
    }

    // Fallback for any other path
    if (item.element && typeof item.element === 'object' && React.isValidElement(item.element)) {
        return <>{item.element}</>
    }

    return <div className="p-8 text-primary lowercase">content for {item.key}</div>
}

function CommunityMainRouteView() {
    const { channels, posts, loading, fetchPosts, createPost } = useCommunity()
    const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null)

    useEffect(() => {
        if (channels.length > 0 && !selectedChannelId) {
            setSelectedChannelId(channels[0].id)
        }
    }, [channels])

    useEffect(() => {
        if (selectedChannelId) {
            fetchPosts(selectedChannelId)
        }
    }, [selectedChannelId, fetchPosts])

    const handleCreatePost = (data: { subject: string; body: string }) => {
        if (selectedChannelId) createPost(selectedChannelId, data.subject, data.body)
    }

    return (
        <ForumPageLayout
            questions={posts.map(adaptPost) as any}
            loading={loading}
            activeChannelId={selectedChannelId}
            onChannelChange={setSelectedChannelId}
            onSubmit={handleCreatePost}
        />
    )
}

function CommunityTopicRouteView({ slug }: { slug: string }) {
    const { posts, loading, fetchPosts } = useCommunity()

    useEffect(() => {
        if (slug) fetchPosts(undefined, slug)
    }, [slug, fetchPosts])

    return (
        <ForumPageLayout
            questions={posts.map(adaptPost) as any}
            loading={loading}
            activeTopicSlug={slug}
            title={`topic: ${slug}`}
        />
    )
}

function CommunityQuestionRouteView({ permalink }: { permalink: string }) {
    const { posts, loading, fetchPosts } = useCommunity()

    useEffect(() => {
        fetchPosts()
    }, [fetchPosts])

    const post = posts.find((p) => p.id.toString() === permalink)

    if (loading && !post) {
        return <div className="p-20 text-center opacity-20 italic lowercase">syncing discussion...</div>
    }

    if (!post) {
        return (
            <div className="p-8 text-center text-primary lowercase">
                <h2 className="text-lg font-black">node not found</h2>
                <p className="opacity-40 mt-2">the discussion thread could not be located.</p>
            </div>
        )
    }

    return <ForumQuestionDetail question={adaptPost(post) as any} />
}

/** Separate component so usePosts hook can be called within the router */
function BlogRouteView({ slug }: { slug: string }) {
    const { posts, loading } = usePosts()
    const post = posts.find((p) => p.slug === slug || p.slug === `/blog/${slug}`)

    if (loading && posts.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-primary">
                <div className="flex flex-col items-center gap-3">
                    <div className="size-6 border-2 border-primary-text/10 border-t-burnt-orange rounded-full animate-spin" />
                    <span className="text-xs font-bold tracking-widest text-primary-text/40">loading post...</span>
                </div>
            </div>
        )
    }

    if (!post) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-lg font-bold text-primary">post not found</h2>
                <p className="text-secondary text-sm mt-2">The post &quot;{slug}&quot; doesn&apos;t exist.</p>
            </div>
        )
    }

    return (
        <BlogPostView
            post={{
                id: post.id,
                title: post.title,
                date: post.date,
                authors: [{ name: post.authorName, avatar: post.authorAvatar || '' }],
                image: post.image,
                content: post.content,
                headings: post.headings,
            }}
        />
    )
}
