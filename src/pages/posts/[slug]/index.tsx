import React from 'react'
import type { GetServerSideProps } from 'next'
import PostPage from 'components/posts/PostPage'
import { fetchSupabasePostBySlug, normalizePostSlug, type SupabasePost } from 'lib/supabaseBlog'

export const getServerSideProps: GetServerSideProps<{
    params: { slug: string }
    initialPost: SupabasePost
}> = async (ctx) => {
    const slug = normalizePostSlug(String(ctx.params?.slug || ''))
    if (!slug) return { notFound: true }
    const initialPost = await fetchSupabasePostBySlug(slug)
    if (!initialPost) return { notFound: true }
    return { props: { params: { slug }, initialPost } }
}

export default function PostSlugPage(props: { params: { slug: string }; initialPost: SupabasePost }) {
    return <PostPage {...props} />
}
