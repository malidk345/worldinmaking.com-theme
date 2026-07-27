import React, { useState, useEffect } from 'react'
import { fetchSupabasePosts } from '../../../lib/supabaseBlog'

export const BlogPosts = ({ render }: { render: (posts: Array<any>) => JSX.Element }) => {
    const [posts, setPosts] = useState<any[]>([])

    useEffect(() => {
        fetchSupabasePosts().then((data) => {
            const formatted = (data || []).map((post) => ({
                node: {
                    id: post.id,
                    fields: {
                        slug: `/blog/${post.slug}`,
                    },
                    excerpt: post.excerpt || post.title,
                    frontmatter: {
                        date: post.created_at,
                        title: post.title,
                        rootPage: '/blog',
                        featuredImage: {
                            publicURL: post.image_url || '',
                        },
                    },
                },
            }))
            setPosts(formatted)
        })
    }, [])

    return render(posts)
}

export default BlogPosts
