import React from 'react'
import type { GetStaticProps, GetStaticPaths } from 'next'
import PostPage from 'components/posts/PostPage'
import { fetchSupabasePostBySlug, normalizePostSlug, type SupabasePost } from 'lib/supabaseBlog'

export const getStaticPaths: GetStaticPaths = async () => {
    return {
        paths: [],
        fallback: 'blocking',
    }
}

export const getStaticProps: GetStaticProps<{
    params: { slug: string }
    initialPost: SupabasePost
}> = async (ctx) => {
    const slug = normalizePostSlug(String(ctx.params?.slug || ''))
    if (!slug) return { notFound: true }
    const initialPost = await fetchSupabasePostBySlug(slug)
    if (!initialPost) return { notFound: true }
    return { props: { params: { slug }, initialPost }, revalidate: 60 }
}

export default function PostSlugPage(props: { params: { slug: string }; initialPost: SupabasePost }) {
    return <PostPage {...props} />
}
