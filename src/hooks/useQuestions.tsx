import React, { useEffect, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import qs from 'qs'
import { QuestionData, StrapiResult, StrapiRecord } from 'lib/strapi'
import usePostHog from './usePostHog'
import { useUser } from './useUser'
import { fetchSupabaseCommunityPosts, formatSupabaseCommunityToStrapi } from 'lib/supabaseCommunity'

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

export const useQuestions = (options?: UseQuestionsOptions) => {
    const { getJwt, user } = useUser()
    const posthog = usePostHog()
    const isModerator = user?.role?.type === 'moderator'
    const [supabaseQuestions, setSupabaseQuestions] = useState<any[]>([])

    useEffect(() => {
        let isMounted = true
        fetchSupabaseCommunityPosts(options?.slug).then((posts) => {
            if (isMounted && posts && posts.length > 0) {
                const formatted = posts.map(formatSupabaseCommunityToStrapi)
                setSupabaseQuestions(formatted)
            }
        })
        return () => {
            isMounted = false
        }
    }, [options?.slug])

    const { data, size, setSize, isLoading, error, mutate } = useSWRInfinite<
        StrapiResult<QuestionData[]>
    >(
        (offset) => `${process.env.GATSBY_SQUEAK_API_HOST}/api/questions?${query(offset, options, isModerator)}`,
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
        const strapiData = data?.reduce((acc, cur) => [...acc, ...(cur.data || [])], [] as StrapiRecord<QuestionData>[]) ?? []
        const combined = [...strapiData, ...supabaseQuestions]
        return {
            data: combined as any,
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
