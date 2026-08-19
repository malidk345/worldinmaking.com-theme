import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import PostPage from 'components/posts/PostPage'
import { fetchSupabasePostBySlug, normalizePostSlug, type SupabasePost } from 'lib/supabaseBlog'

export default function PostSlugPage() {
    const router = useRouter()
    const slug = normalizePostSlug(String(router.query.slug || ''))
    const [initialPost, setInitialPost] = useState<SupabasePost | null | undefined>(undefined)

    useEffect(() => {
        if (!slug) return
        fetchSupabasePostBySlug(slug).then((post) => setInitialPost(post ?? null))
    }, [slug])

    if (!slug || initialPost === undefined) return null
    if (initialPost === null) return null

    return <PostPage params={{ slug }} initialPost={initialPost} />
}
