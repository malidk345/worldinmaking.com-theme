'use client'

import React, { useEffect, useState } from 'react'
import { Provider } from '../../../context/App'
import Wrapper from '../../../components/Wrapper'
import BlogPostTemplate from '../../../templates/BlogPost'
import { getBlogPost } from '../../../lib/blog'
import { fetchSupabasePostBySlug, SupabasePost } from '../../../lib/supabaseBlog'

function BlogPostContainer({ slug }: { slug: string }) {
    const [spPost, setSpPost] = useState<SupabasePost | null>(null)

    useEffect(() => {
        let mounted = true
        fetchSupabasePostBySlug(slug).then((res) => {
            if (mounted && res) {
                setSpPost(res)
            }
        })
        return () => {
            mounted = false
        }
    }, [slug])

    const localPost = getBlogPost(slug)

    const title = spPost?.title || localPost?.frontmatter?.title || slug.replace(/-/g, ' ')
    const content = spPost?.content || localPost?.content || 'Loading article content...'
    const date = spPost?.created_at ? spPost.created_at.split('T')[0] : localPost?.frontmatter?.date || '2026-01-01'
    const author = spPost?.author || 'WorldInMaking'

    const pageData = {
        data: {
            postData: {
                body: content,
                excerpt: spPost?.excerpt || title,
                frontmatter: {
                    title,
                    date,
                    featuredImage: spPost?.image_url ? { publicURL: spPost.image_url } : null,
                    featuredVideo: null,
                    contributors: [
                        {
                            name: author,
                            role: 'Author',
                            image: spPost?.author_avatar || 'https://res.cloudinary.com/dmukukwp6/image/upload/v1675204207/james_hawkins_posthog_031f7cf651.png',
                        }
                    ]
                },
                fields: {
                    slug: `/blog/${slug}`
                }
            }
        },
        pageContext: {
            tableOfContents: [],
            askMax: true,
            localizedRoot: '/blog'
        }
    }

    return <BlogPostTemplate {...(pageData as any)} />
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
    const slug = params?.slug || 'hobbesian-anxiety'
    const location = typeof window !== 'undefined' ? window.location : ({ pathname: `/blog/${slug}` } as any)

    return (
        <div className="h-screen w-screen overflow-hidden bg-light dark:bg-dark text-primary">
            <Provider element={<BlogPostContainer slug={slug} />} location={location}>
                <Wrapper />
            </Provider>
        </div>
    )
}
