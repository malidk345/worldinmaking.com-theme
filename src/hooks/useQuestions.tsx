import React, { useCallback, useEffect, useState } from 'react'
import {
    fetchSupabaseCommunityPosts,
    fetchSupabaseCommunityReplies,
    formatSupabaseCommunityToStrapi,
} from 'lib/supabaseCommunity'

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
export const useQuestions = (options?: UseQuestionsOptions) => {
    const [questions, setQuestions] = useState<{ data: any[] }>({ data: [] })
    const [isLoading, setIsLoading] = useState(true)
    const [page, setPage] = useState(0)
    const limit = options?.limit ?? 20

    const load = useCallback(async () => {
        setIsLoading(true)
        try {
            const cleanSlug = options?.slug?.replace(/^\/posts\/?/, '').replace(/^\/questions\/?/, '')
            const posts = await fetchSupabaseCommunityPosts(cleanSlug)
            let list = posts || []

            // Optional author filter
            if (options?.profileId) {
                list = list.filter((p) => String(p.author_id) === String(options.profileId))
            }

            // Client-side pagination window
            const windowed = list.slice(0, (page + 1) * limit)

            const formatted = await Promise.all(
                windowed.map(async (post) => {
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
                                        publishedAt: r.created_at,
                                        profile: {
                                            data: {
                                                id: pObj?.id || r.author_id || 'community',
                                                attributes: {
                                                    firstName: pObj?.username || 'Community Member',
                                                    lastName: '',
                                                    gravatarURL:
                                                        pObj?.avatar_url ||
                                                        'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/pages-content/images/hog-9.png',
                                                    avatar: pObj?.avatar_url
                                                        ? {
                                                              data: {
                                                                  attributes: { url: pObj.avatar_url },
                                                              },
                                                          }
                                                        : null,
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
                })
            )

            setQuestions({ data: formatted as any })
        } catch (e) {
            console.warn('[useQuestions]', e)
            setQuestions({ data: [] })
        } finally {
            setIsLoading(false)
        }
    }, [options?.slug, options?.profileId, page, limit])

    useEffect(() => {
        void load()
    }, [load])

    const total = questions.data.length
    const hasMore = false // full list loaded via community API; can expand later with range

    return {
        hasMore,
        questions,
        fetchMore: () => setPage((p) => p + 1),
        isLoading,
        refresh: () => {
            void load()
        },
        pinnedQuestions: undefined,
    }
}
