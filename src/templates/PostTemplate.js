import React from 'react'
import Layout from '../components/Layout'
import { posts } from '../data/postsUtils'

export default function PostTemplate({ pageContext }) {
    const { postId } = pageContext
    const post = posts.find(p => p.id === postId)

    if (!post) {
        return (
            <Layout>
                <div className="min-h-screen bg-gray-900 text-white p-8">
                    <h1 className="text-2xl font-bold">Post not found</h1>
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gray-900 text-white p-8">
                <article className="max-w-4xl mx-auto">
                    <header className="mb-8">
                        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
                        <div className="text-gray-400 mb-4">
                            <span>By {typeof post.author === 'string' ? post.author : post.author?.name || 'Anonymous'}</span>
                            <span className="mx-2">•</span>
                            <span>{new Date(post.postDate).toLocaleDateString()}</span>
                        </div>
                        {post.featuredImage && (
                            <img
                                src={post.featuredImage}
                                alt={post.title}
                                className="w-full h-64 object-cover rounded-lg mb-4"
                            />
                        )}
                    </header>

                    <div
                        className="prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                </article>
            </div>
        </Layout>
    )
}