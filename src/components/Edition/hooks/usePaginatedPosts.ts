import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    categoryToFolder,
    fetchSupabasePosts,
    formatSupabasePostToStrapi,
} from 'lib/supabaseBlog'

const POSTS_PER_PAGE = 20

interface UsePaginatedPostsProps {
    params?: any
    pageSize?: number
    onPageChange?: (page: number) => void
}

/**
 * Blog/posts listing — Supabase `posts` only (no Squeak, no mock list).
 * Client-side page slice; full set loaded once (WIM ~100 posts is fine).
 */
export const usePaginatedPosts = ({
    params,
    pageSize = POSTS_PER_PAGE,
    onPageChange,
}: UsePaginatedPostsProps = {}) => {
    const [currentPage, setCurrentPage] = useState(0)
    const [allPosts, setAllPosts] = useState<any[]>([])
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<Error | undefined>()

    const load = useCallback(async () => {
        setLoaded(false)
        try {
            const rows = await fetchSupabasePosts()
            setAllPosts((rows || []).map(formatSupabasePostToStrapi))
            setError(undefined)
        } catch (e) {
            console.error('[usePaginatedPosts]', e)
            setAllPosts([])
            setError(e instanceof Error ? e : new Error('Failed to load posts'))
        } finally {
            setLoaded(true)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    // Optional filter from PostListing params (root folder / category)
    const filtered = useMemo(() => {
        let list = allPosts
        const root =
            params?.filters?.post_category?.folder?.$eq ||
            params?.filters?.post_category?.folder?.$eqi ||
            params?.root ||
            null
        if (root && typeof root === 'string') {
            list = list.filter((p) => {
                const folder = p?.attributes?.post_category?.data?.attributes?.folder
                // "posts" and "blog" are interchangeable for WIM
                if (root === 'blog' || root === 'posts') {
                    return folder === 'blog' || folder === 'posts' || !folder
                }
                return folder === root
            })
        }
        // Sort: newest default; popularity ignored without scores
        const sort = params?.sort
        if (Array.isArray(sort) && sort[0]?.includes('date')) {
            list = [...list].sort((a, b) =>
                String(b.attributes?.date || '').localeCompare(String(a.attributes?.date || ''))
            )
        }
        return list
    }, [allPosts, params])

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
    const safePage = Math.min(currentPage, totalPages - 1)
    const pagePosts = useMemo(() => {
        const start = safePage * pageSize
        return filtered.slice(start, start + pageSize)
    }, [filtered, safePage, pageSize])

    const hasNextPage = safePage < totalPages - 1
    const hasPrevPage = safePage > 0

    const goToPage = useCallback(
        (page: number) => {
            if (page < 0 || page >= totalPages) return
            setCurrentPage(page)
            onPageChange?.(page)
        },
        [totalPages, onPageChange]
    )

    const nextPage = useCallback(() => {
        if (hasNextPage) {
            setCurrentPage((p) => p + 1)
            onPageChange?.(currentPage + 1)
        }
    }, [hasNextPage, currentPage, onPageChange])

    const prevPage = useCallback(() => {
        if (hasPrevPage) {
            setCurrentPage((p) => p - 1)
            onPageChange?.(currentPage - 1)
        }
    }, [hasPrevPage, currentPage, onPageChange])

    const reset = useCallback(() => {
        setCurrentPage(0)
        onPageChange?.(0)
    }, [onPageChange])

    useEffect(() => {
        setCurrentPage(0)
    }, [params])

    return {
        posts: pagePosts,
        isLoading: !loaded,
        isValidating: false,
        error,
        currentPage: safePage,
        totalPages,
        total,
        pageSize,
        hasNextPage,
        hasPrevPage,
        nextPage,
        prevPage,
        goToPage,
        reset,
        mutate: load,
        /** full unfiltered count for debugging */
        _source: 'supabase' as const,
        _categoryFolders: Array.from(
            new Set(allPosts.map((p) => categoryToFolder(p?.attributes?.post_category?.data?.attributes?.label)))
        ),
    }
}
