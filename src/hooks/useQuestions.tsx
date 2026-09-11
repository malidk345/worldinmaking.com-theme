import React, { useEffect, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import qs from 'qs'
import { QuestionData, StrapiResult, StrapiRecord } from 'lib/strapi'
import usePostHog from './usePostHog'
import { useUser } from './useUser'
import { fetchSupabaseCommunityPosts, fetchSupabaseCommunityReplies, formatSupabaseCommunityToStrapi } from 'lib/supabaseCommunity'

type UseQuestionsOptions = {
    slug?: string
    profileId?: number
    topicId?: number
    limit?: number
    sortBy?: 'newest' | 'popular' | 'activity'
    filters?: any
    revalidateOnFocus?: boolean
}

const query = (offset: number, options?: UseQuestionsOptions, isModerator?: boolean) => {
    const { slug, topicId, profileId, limit = 20, sortBy = 'newest', filters } = options || {}
    const params: any = {
        pagination: {
            start: offset * limit,
            limit,
        },
        sort: 'createdAt:desc',
        filters: {
            $or: [
                {
                    archived: {
                        $null: true,
                    },
                },
                {
                    archived: {
                        $eq: false,
                    },
                },
            ],
        },
        populate: {
            edits: {
                sort: ['date:desc'],
                populate: {
                    by: {
                        fields: ['firstName', 'lastName', 'color', 'gravatarURL'],
                        populate: {
                            avatar: {
                                fields: ['url'],
                            },
                        },
                    },
                },
            },
            resolvedBy: {
                select: ['id'],
            },
            profile: {
                select: ['id', 'firstName', 'lastName', 'gravatarURL'],
                populate: {
                    avatar: {
                        select: ['id', 'url'],
                    },
                    ...(isModerator
                        ? {
                              user: {
                                  fields: ['distinctId', 'email'],
                              },
                          }
                        : null),
                },
            },
            replies: {
                sort: ['createdAt:asc'],
                populate: {
                    profile: {
                        fields: ['id', 'firstName', 'lastName', 'gravatarURL', 'pronouns'],
                        populate: {
                            edits: {
                                sort: ['date:desc'],
                                populate: {
                                    by: {
                                        fields: ['firstName', 'lastName', 'color', 'gravatarURL'],
                                        populate: {
                                            avatar: {
                                                fields: ['url'],
                                            },
                                        },
                                    },
                                },
                            },
                            avatar: {
                                fields: ['id', 'url'],
                            },
                            teams: {
                                fields: ['id'],
                            },
                            user: {
                                populate: ['role'],
                                fields: ['role'],
                            },
                        },
                    },
                },
            },
            topics: true,
            pinnedTopics: true,
            slugs: true,
        },
    }

    switch (sortBy) {
        case 'newest':
            params.sort = 'createdAt:desc'
            break
        case 'popular':
            params.sort = 'numReplies:desc'
            break
        case 'activity':
            params.sort = 'activeAt:desc'
            break
    }

    if (slug) {
        params.filters = {
            ...params.filters,
            slugs: {
                slug,
            },
        }
    }

    if (topicId) {
        params.filters = {
            ...params.filters,
            topics: {
                id: {
                    $eq: topicId,
                },
            },
        }
    }

    if (profileId) {
        params.filters = {
            ...params.filters,
            $or: [
                {
                    profile: {
                        id: {
                            $eq: profileId,
                        },
                    },
                },
                {
                    replies: {
                        profile: {
                            id: {
                                $eq: profileId,
                            },
                        },
                    },
                },
            ],
        }
    }

    if (filters) {
        params.filters = {
            ...params.filters,
            ...filters,
        }
    }

    return qs.stringify(params, {
        encodeValuesOnly: true,
    })
}

const MOCK_COMMUNITY_POSTS: any[] = [
    {
        id: 1,
        attributes: {
            id: 1,
            permalink: 'welcome-to-posthog-community',
            subject: 'Welcome to the WorldInMaking Community Forum',
            title: 'Welcome to the WorldInMaking Community Forum',
            createdAt: '2026-07-26T12:00:00.000Z',
            publishedAt: '2026-07-26T12:00:00.000Z',
            activeAt: '2026-07-26T12:00:00.000Z',
            viewCount: 142,
            numReplies: 3,
            body: 'Welcome to our developer community forum! Ask questions, share ideas, and discuss features.',
            profile: {
                data: {
                    id: '1',
                    attributes: {
                        firstName: 'James',
                        lastName: 'Hawkins',
                        gravatarURL: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png',
                    },
                },
            },
            replies: { data: [] },
        },
    },
    {
        id: 2,
        attributes: {
            id: 2,
            permalink: 'how-to-deploy-on-cloudflare-pages',
            subject: 'How to deploy Next.js static site to Cloudflare Pages',
            title: 'How to deploy Next.js static site to Cloudflare Pages',
            createdAt: '2026-07-25T15:30:00.000Z',
            publishedAt: '2026-07-25T15:30:00.000Z',
            activeAt: '2026-07-25T15:30:00.000Z',
            viewCount: 89,
            numReplies: 5,
            body: 'Tips and tricks for configuring Next.js Pages router with Cloudflare Pages edge runtime.',
            profile: {
                data: {
                    id: '2',
                    attributes: {
                        firstName: 'Tim',
                        lastName: 'Glaser',
                        gravatarURL: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png',
                    },
                },
            },
            replies: { data: [] },
        },
    },
    {
        id: 3,
        attributes: {
            id: 3,
            permalink: 'display-options-and-customization',
            subject: 'Customizing wallpapers and themes in Display Options',
            title: 'Customizing wallpapers and themes in Display Options',
            createdAt: '2026-07-24T09:15:00.000Z',
            publishedAt: '2026-07-24T09:15:00.000Z',
            activeAt: '2026-07-24T09:15:00.000Z',
            viewCount: 54,
            numReplies: 2,
            body: 'Use keyboard shortcut comma (,) to open Display options and switch between dark mode and light mode.',
            profile: {
                data: {
                    id: '3',
                    attributes: {
                        firstName: 'Mali',
                        lastName: 'DK',
                        gravatarURL: 'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/pages-content/images/hog-9.png',
                    },
                },
            },
            replies: { data: [] },
        },
    },
]

export const useQuestions = (options?: UseQuestionsOptions) => {
    const { getJwt, user } = useUser()
    const posthog = usePostHog()
    const isModerator = user?.role?.type === 'moderator'
    const [supabaseQuestions, setSupabaseQuestions] = useState<any[]>([])

    useEffect(() => {
        let isMounted = true
        const cleanSlug = options?.slug?.replace(/^\/posts\/?/, '').replace(/^\/questions\/?/, '')
        fetchSupabaseCommunityPosts(cleanSlug).then(async (posts) => {
            if (isMounted && posts && posts.length > 0) {
                const formatted = await Promise.all(
                    posts.map(async (post) => {
                        const fmt = formatSupabaseCommunityToStrapi(post)
                        const replies = await fetchSupabaseCommunityReplies(post.id)
                        if (replies && replies.length > 0) {
                            fmt.attributes.replies.data = replies.map((r) => {
                                const pObj = Array.isArray(r.profiles) ? (r.profiles as any)[0] : r.profiles
                                return {
                                    id: r.id,
                                    attributes: {
                                        id: r.id,
                                        body: r.content,
                                        createdAt: r.created_at,
                                        profile: {
                                            data: {
                                                id: pObj?.id || r.author_id || 'community',
                                                attributes: {
                                                    firstName: pObj?.username || 'Community Member',
                                                    gravatarURL:
                                                        pObj?.avatar_url ||
                                                        'https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/pages-content/images/hog-9.png',
                                                },
                                            },
                                        },
                                    },
                                }
                            })
                            fmt.attributes.numReplies = replies.length
                        }
                        return fmt
                    })
                )
                if (isMounted) {
                    setSupabaseQuestions(formatted)
                }
            }
        })
        return () => {
            isMounted = false
        }
    }, [options?.slug])

    const { data, size, setSize, isLoading, error, mutate } = useSWRInfinite<
        StrapiResult<QuestionData[]>
    >(
        (offset) => {
            if (!process.env.NEXT_PUBLIC_SQUEAK_API_HOST) return null
            return `${process.env.NEXT_PUBLIC_SQUEAK_API_HOST}/api/questions?${query(offset, options, isModerator)}`
        },
        async (url: string) => {
            const jwt = await getJwt()
            return fetch(url, user && jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined)
                .then((r) => r.json())
                .catch(() => ({ data: [] }))
        },
        {
            revalidateOnFocus: false,
        }
    )

    if (error) {
        posthog?.capture('squeak error', {
            source: 'useQuestions',
            options: JSON.stringify(options),
            error: error.message,
        })
    }

    const questions: Omit<StrapiResult<QuestionData[]>, 'meta'> = React.useMemo(() => {
        const strapiData = data?.flatMap(cur => cur.data || []) ?? []
        const combined = [...strapiData, ...supabaseQuestions]
        const finalData = combined.length > 0 ? combined : (options?.slug ? [] : MOCK_COMMUNITY_POSTS)
        return {
            data: finalData as any,
        }
    }, [size, data, supabaseQuestions])

    const total = (data && data[0]?.meta?.pagination?.total) || questions.data.length
    const hasMore = total ? questions?.data.length < total : false
    const pinnedQuestions = data?.[0]?.pinnedQuestions

    return {
        hasMore,
        questions,
        fetchMore: () => setSize(size + 1),
        isLoading: isLoading && supabaseQuestions.length === 0,
        refresh: () => {
            fetchSupabaseCommunityPosts(options?.slug).then((posts) => {
                if (posts) setSupabaseQuestions(posts.map(formatSupabaseCommunityToStrapi))
            })
            mutate()
        },
        pinnedQuestions,
    }
}
