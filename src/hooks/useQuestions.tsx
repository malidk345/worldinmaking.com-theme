import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    fetchSupabaseCommunityPosts,
    fetchSupabaseCommunityReplies,
    formatSupabaseCommunityToStrapi,
} from 'lib/supabaseCommunity'
import { resolvePhilosopherAvatar } from 'lib/philosopher-avatar'

type UseQuestionsOptions = {
    slug?: string
    profileId?: number | string
    topicId?: number
    limit?: number
    sortBy?: 'newest' | 'popular' | 'activity'
    filters?: any
    revalidateOnFocus?: boolean
}

/**
 * Community questions — Supabase `community_posts` / `community_replies` only.
 * PostHog Squeak is not used on WorldInMaking.
 */
async function formatCommunityPost(post: any) {
    const fmt = formatSupabaseCommunityToStrapi(post)
    try {
        const replies = await fetchSupabaseCommunityReplies(post.id)
        if (replies?.length) {
            fmt.attributes.replies.data = replies.map((r) => {
                const pObj = Array.isArray(r.profiles) ? (r.profiles as any)[0] : r.profiles
                return {
                    id: r.id,
                    attributes: {
                        id: r.id,
                        body: r.content,
                        createdAt: r.created_at,
                        publishedAt: r.is_hidden ? null : r.created_at,
                        profile: {
                            data: {
                                id: pObj?.id || r.author_id || 'community',
                                attributes: {
                                    username: pObj?.username || '',
                                    firstName: pObj?.username || 'Community Member',
                                    lastName: '',
                                    gravatarURL: resolvePhilosopherAvatar(pObj?.username, pObj?.avatar_url),
                                    avatar: (() => {
                                        const url = resolvePhilosopherAvatar(pObj?.username, pObj?.avatar_url)
                                        return url
                                            ? { data: { attributes: { url } } }
                                            : null
                                    })(),
                                },
                            },
                        },
                    },
                }
            }) as any
            fmt.attributes.numReplies = replies.length
        }
    } catch {
        /* replies optional */
    }
    return fmt
}

export const useQuestions = (options?: UseQuestionsOptions) => {
    const [questions, setQuestions] = useState<{ data: any[] }>({ data: [] })
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [page, setPage] = useState(0)
    const [total, setTotal] = useState(0)
    const allPostsRef = useRef<any[]>([])
    const loadingMoreRef = useRef(false)
    const limit = options?.limit ?? 20

    const load = useCallback(async () => {
        setIsLoading(true)
        try {
            const cleanSlug = options?.slug?.replace(/^\/posts\/?/, '').replace(/^\/questions\/?/, '')
            const authorId = options?.profileId != null ? String(options.profileId) : undefined
            const posts = await fetchSupabaseCommunityPosts(cleanSlug, undefined, {
                authorId,
                limit: authorId ? Math.max(limit * 3, 30) : 1000,
            })
            let list = posts || []

            if (authorId) {
                list = list.filter((p) => String(p.author_id) === authorId)
            }

            allPostsRef.current = list
            setTotal(list.length)
            setPage(0)
            const formatted = await Promise.all(list.slice(0, limit).map(formatCommunityPost))
            setQuestions({ data: formatted as any })
        } catch (e) {
            console.warn('[useQuestions]', e)
            allPostsRef.current = []
            setTotal(0)
            setQuestions({ data: [] })
        } finally {
            setIsLoading(false)
        }
    }, [options?.slug, options?.profileId, limit])

    useEffect(() => {
        void load()
    }, [load])

    const fetchMore = useCallback(async () => {
        if (loadingMoreRef.current) return
        const nextPage = page + 1
        const start = nextPage * limit
        const slice = allPostsRef.current.slice(start, start + limit)
        if (slice.length === 0) return
        loadingMoreRef.current = true
        setIsLoadingMore(true)
        try {
            const formatted = await Promise.all(slice.map(formatCommunityPost))
            setQuestions((prev) => ({ data: [...prev.data, ...(formatted as any)] }))
            setPage(nextPage)
        } finally {
            loadingMoreRef.current = false
            setIsLoadingMore(false)
        }
    }, [page, limit])

    return {
        hasMore: questions.data.length < total,
        questions,
        fetchMore,
        isLoading,
        isLoadingMore,
        refresh: () => {
            void load()
        },
        pinnedQuestions: questions.data.filter((q: any) => q?.attributes?.pinned),
    }
}
