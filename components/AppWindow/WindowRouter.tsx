"use client"

import React, { useEffect, useState } from 'react'
import ForumPageLayout from 'components/Forum/ForumPageLayout'
import ForumQuestionDetail from 'components/Forum/ForumQuestionDetail'
import AdminPanel from 'components/AdminPanel'
import { WindowSearchUI } from 'components/Search/SearchUI'
import { usePosts } from '../../hooks/usePosts'
import { useCommunity } from '../../hooks/useCommunity'
import BlogPostView from 'components/ReaderView/BlogPostView'
import PublicProfile from 'components/Profile/PublicProfile'

const adaptPost = (p: any) => ({
    id: p.id,
    permalink: p.id.toString(),
    subject: p.title,
    body: p.content || '',
    createdAt: p.created_at,
    profile: {
        id: p.author_id || 0,
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
    const rawPath: string = item.path || ''
    const path: string = rawPath.replace(/\/+$/, '') || '/'

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

    // /profile/:username
    const profileMatch = path.match(/^\/profile\/([^/]+)/)
    if (profileMatch) {
        return <PublicProfile username={profileMatch[1]} />
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

import Loading from 'components/Loading'

function CommunityQuestionRouteView({ permalink }: { permalink: string }) {
    const { posts, loading, fetchPosts } = useCommunity()

    useEffect(() => {
        if (permalink) {
            fetchPosts(undefined, undefined, permalink)
        }
    }, [fetchPosts, permalink])

    const post = posts.find((p) => p.id.toString() === permalink)

    if (loading && !post) {
        return <Loading label="syncing discussion" />
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
        return <Loading fullScreen label="fetching node" />
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
            post={post as any}
        />
    )
}
