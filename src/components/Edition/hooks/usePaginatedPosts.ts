import React, { useEffect, useState } from 'react'
import useSWR from 'swr'
import qs from 'qs'
import { fetchSupabasePosts, formatSupabasePostToStrapi } from 'lib/supabaseBlog'

const POSTS_PER_PAGE = 20

const query = (params: any, page: number, limit: number = POSTS_PER_PAGE) => {
    return qs.stringify(
        {
            populate: ['featuredImage.image', 'post_category.defaultImage', 'authors.avatar', 'likes', 'post_tags'],
            sort: 'date:desc',
            pagination: {
                start: page * limit,
                limit: limit,
            },
            ...params,
        },
        {
            encodeValuesOnly: true,
        }
    )
}

interface UsePaginatedPostsProps {
    params?: any
    pageSize?: number
    onPageChange?: (page: number) => void
}

const FALLBACK_POSTS = [
    {
        id: '1',
        attributes: {
            title: 'WorldInMaking 2.0: Otonom Yapay Zeka Çağı ve Geleceğin Mimarisi',
            slug: 'worldinmaking-2-0-ai-architecture',
            excerpt:
                'Otonom ajanlar, Supabase entegrasyonu ve yeni nesil web işletim sistemi hakkında kapsamlı rehber.',
            date: '2026-07-24',
            featuredImage: {
                url: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png',
            },
            authors: {
                data: [
                    {
                        id: '1',
                        attributes: {
                            firstName: 'WorldInMaking',
                            lastName: 'Team',
                            avatar: {
                                url: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png',
                            },
                        },
                    },
                ],
            },
            post_category: {
                data: {
                    attributes: {
                        label: 'Release Notes',
                        folder: 'blog',
                    },
                },
            },
            post_tags: {
                data: [{ attributes: { label: 'Product' } }, { attributes: { label: 'AI' } }],
            },
        },
    },
]

export const usePaginatedPosts = ({ params, pageSize = POSTS_PER_PAGE, onPageChange }: UsePaginatedPostsProps = {}) => {
    const [currentPage, setCurrentPage] = React.useState(0)
    const [supabasePosts, setSupabasePosts] = useState<any[]>([])
    const [supabaseLoaded, setSupabaseLoaded] = useState(false)

    useEffect(() => {
        let isMounted = true
        fetchSupabasePosts()
            .then((posts) => {
                if (isMounted) {
                    if (posts && posts.length > 0) {
                        setSupabasePosts(posts.map(formatSupabasePostToStrapi))
                    }
                    setSupabaseLoaded(true)
                }
            })
            .catch(() => {
                if (isMounted) setSupabaseLoaded(true)
            })
        return () => {
            isMounted = false
        }
    }, [])

    const apiHost = process.env.NEXT_PUBLIC_SQUEAK_API_HOST || ''
    const { data, isLoading, error, mutate, isValidating } = useSWR(
        apiHost ? `${apiHost}/api/posts?${query(params, currentPage, pageSize)}` : null,
        (url: string) =>
            fetch(url)
                .then((r) => r.json())
                .catch(() => ({ data: [] }))
    )

    const rawStrapiPosts = data?.data ?? []
    const combinedPosts = React.useMemo(() => {
        if (rawStrapiPosts.length > 0) return [...rawStrapiPosts, ...supabasePosts]
        if (supabasePosts.length > 0) return supabasePosts
        return FALLBACK_POSTS
    }, [rawStrapiPosts, supabasePosts])

    const total = data?.meta?.pagination?.total || combinedPosts.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const hasNextPage = currentPage < totalPages - 1
    const hasPrevPage = currentPage > 0

    const goToPage = React.useCallback(
        (page: number) => {
            if (page < 0 || page >= totalPages) return
            setCurrentPage(page)
            onPageChange?.(page)
        },
        [totalPages]
    )

    const nextPage = React.useCallback(() => {
        if (hasNextPage) {
            setCurrentPage(currentPage + 1)
            onPageChange?.(currentPage + 1)
        }
    }, [currentPage, hasNextPage])

    const prevPage = React.useCallback(() => {
        if (hasPrevPage) {
            setCurrentPage(currentPage - 1)
            onPageChange?.(currentPage - 1)
        }
    }, [currentPage, hasPrevPage])

    const reset = React.useCallback(() => {
        setCurrentPage(0)
        onPageChange?.(0)
    }, [])

    useEffect(() => {
        setCurrentPage(0)
    }, [params])

    return {
        posts: combinedPosts,
        isLoading: !supabaseLoaded && (isLoading || isValidating),
        isValidating: false,
        error,
        currentPage,
        totalPages,
        total,
        pageSize,
        hasNextPage,
        hasPrevPage,
        nextPage,
        prevPage,
        goToPage,
        reset,
        mutate,
    }
}
