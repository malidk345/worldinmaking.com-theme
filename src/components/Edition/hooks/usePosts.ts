import { useCallback, useEffect, useRef, useState } from 'react'
import {
    BLOG_LIST_PAGE_SIZE,
    fetchSupabasePostsPage,
    formatSupabasePostToStrapi,
} from 'lib/supabaseBlog'

function authorIdFromParams(params: any): string | undefined {
    const id = params?.filters?.authors?.id?.$eq
    return id != null && String(id).trim() ? String(id).trim() : undefined
}

/** Sidebar / related posts — 10 at a time from Supabase, never the full table. */
export const usePosts = ({
    params,
    authorId,
    author,
    includeBody = false,
}: {
    params?: any
    authorId?: string
    author?: string
    includeBody?: boolean
} = {}) => {
    const [posts, setPosts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isValidating, setIsValidating] = useState(false)
    const [total, setTotal] = useState(0)
    const loadingMoreRef = useRef(false)
    const resolvedAuthorId = authorId || authorIdFromParams(params)
    const resolvedAuthor = author?.trim() || undefined
    const paramsKey = JSON.stringify(params ?? null)

    const load = useCallback(async () => {
        setIsLoading(true)
        try {
            const { posts: rows, total: count } = await fetchSupabasePostsPage({
                limit: BLOG_LIST_PAGE_SIZE,
                offset: 0,
                authorId: resolvedAuthorId,
                author: resolvedAuthor,
                includeBody,
            })
            setPosts((rows || []).map(formatSupabasePostToStrapi))
            setTotal(count)
        } catch (err) {
            console.error('[usePosts]', err)
            setPosts([])
            setTotal(0)
        } finally {
            setIsLoading(false)
        }
    }, [paramsKey, resolvedAuthorId, resolvedAuthor, includeBody])

    useEffect(() => {
        void load()
    }, [load])

    const fetchMore = useCallback(async () => {
        if (loadingMoreRef.current) return
        if (posts.length >= total) return
        loadingMoreRef.current = true
        setIsValidating(true)
        try {
            const { posts: rows, total: count } = await fetchSupabasePostsPage({
                limit: BLOG_LIST_PAGE_SIZE,
                offset: posts.length,
                authorId: resolvedAuthorId,
                author: resolvedAuthor,
                includeBody,
            })
            setPosts((prev) => [...prev, ...(rows || []).map(formatSupabasePostToStrapi)])
            setTotal(count)
        } catch (err) {
            console.error('[usePosts] fetchMore', err)
        } finally {
            loadingMoreRef.current = false
            setIsValidating(false)
        }
    }, [posts.length, total, resolvedAuthorId, resolvedAuthor, includeBody])

    return {
        posts,
        isLoading,
        isValidating,
        fetchMore,
        mutate: load,
        hasMore: posts.length < total,
    }
}
