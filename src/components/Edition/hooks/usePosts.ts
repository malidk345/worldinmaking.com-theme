import React, { useEffect, useState } from 'react'
import { fetchSupabasePosts, formatSupabasePostToStrapi } from 'lib/supabaseBlog'

/** Sidebar / related posts — Supabase only */
export const usePosts = ({ params }: { params?: any } = {}) => {
    const [posts, setPosts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        setIsLoading(true)

        fetchSupabasePosts()
            .then((sbPosts) => {
                if (!mounted) return
                setPosts((sbPosts || []).map(formatSupabasePostToStrapi))
                setIsLoading(false)
            })
            .catch((err) => {
                console.error('[usePosts]', err)
                if (mounted) {
                    setPosts([])
                    setIsLoading(false)
                }
            })

        return () => {
            mounted = false
        }
    }, [JSON.stringify(params)])

    return {
        posts,
        isLoading,
        isValidating: false,
        fetchMore: () => {},
        mutate: () => {},
        hasMore: false,
    }
}
