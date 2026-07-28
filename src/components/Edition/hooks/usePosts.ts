import React, { useEffect, useState } from 'react'
import { fetchSupabasePosts, formatSupabasePostToStrapi } from 'lib/supabaseBlog'

export const usePosts = ({ params }: { params?: any } = {}) => {
    const [posts, setPosts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        setIsLoading(true)

        fetchSupabasePosts()
            .then((sbPosts) => {
                if (mounted) {
                    const formatted = (sbPosts || []).map(formatSupabasePostToStrapi)
                    setPosts(formatted)
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                console.error('Error in usePosts fetching Supabase:', err)
                if (mounted) setIsLoading(false)
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
