import { useCallback, useEffect, useState } from 'react'
import {
    BLOG_LIST_PAGE_SIZE,
    categoryToFolder,
    fetchSupabasePostsPage,
    formatSupabasePostToStrapi,
} from 'lib/supabaseBlog'

const POSTS_PER_PAGE = BLOG_LIST_PAGE_SIZE

interface UsePaginatedPostsProps {
    params?: any
    pageSize?: number
    onPageChange?: (page: number) => void
}

function categoryFromParams(params: any): string | undefined {
    const root =
        params?.filters?.post_category?.folder?.$eq ||
        params?.filters?.post_category?.folder?.$eqi ||
        params?.root ||
        null
    if (!root || typeof root !== 'string') return undefined
    if (root === 'blog' || root === 'posts') return undefined
    return root
}

/**
 * Blog/posts listing — one page from Supabase, never the full table.
 */
export const usePaginatedPosts = ({
    params,
    pageSize = POSTS_PER_PAGE,
    onPageChange,
}: UsePaginatedPostsProps = {}) => {
    const [currentPage, setCurrentPage] = useState(0)
    const [posts, setPosts] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<Error | undefined>()
    const category = categoryFromParams(params)

    const load = useCallback(
        async (page: number) => {
            setLoaded(false)
            try {
                const { posts: rows, total: count } = await fetchSupabasePostsPage({
                    limit: pageSize,
                    offset: page * pageSize,
                    category,
                })
                setPosts((rows || []).map(formatSupabasePostToStrapi))
                setTotal(count)
                setError(undefined)
            } catch (e) {
                console.error('[usePaginatedPosts]', e)
                setPosts([])
                setTotal(0)
                setError(e instanceof Error ? e : new Error('Failed to load posts'))
            } finally {
                setLoaded(true)
            }
        },
        [pageSize, category]
    )

    useEffect(() => {
        void load(currentPage)
    }, [load, currentPage])

    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
    const safePage = Math.min(currentPage, totalPages - 1)

    useEffect(() => {
        if (currentPage > safePage) setCurrentPage(safePage)
    }, [currentPage, safePage])

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
        if (!hasNextPage) return
        setCurrentPage((p) => p + 1)
        onPageChange?.(currentPage + 1)
    }, [hasNextPage, currentPage, onPageChange])

    const prevPage = useCallback(() => {
        if (!hasPrevPage) return
        setCurrentPage((p) => p - 1)
        onPageChange?.(currentPage - 1)
    }, [hasPrevPage, currentPage, onPageChange])

    const reset = useCallback(() => {
        setCurrentPage(0)
        onPageChange?.(0)
    }, [onPageChange])

    useEffect(() => {
        setCurrentPage(0)
    }, [params])

    return {
        posts,
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
        mutate: () => load(currentPage),
        _source: 'supabase' as const,
        _categoryFolders: Array.from(
            new Set(posts.map((p) => categoryToFolder(p?.attributes?.post_category?.data?.attributes?.label)))
        ),
    }
}
