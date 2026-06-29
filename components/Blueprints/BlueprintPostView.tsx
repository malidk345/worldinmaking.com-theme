"use client"

import React, { useEffect, useState } from 'react'
import { useBlueprints, BlueprintPost } from 'hooks/useBlueprints'
import Loading from 'components/Loading'
import { sanitizeHtml } from 'utils/security'

export default function BlueprintPostView({ slug }: { slug: string }) {
    const { getPostBySlug } = useBlueprints()
    const [post, setPost] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getPostBySlug(slug).then(data => {
            setPost(data)
            setLoading(false)
        })
    }, [slug, getPostBySlug])

    if (loading) return <Loading fullScreen label="loading technical layout" />
    if (!post) return <div className="p-8 text-center lowercase">blueprint not found</div>

    return (
        <div className="absolute inset-0 overflow-auto bg-white dark:bg-black">
            {post.custom_css && (
                <style dangerouslySetInnerHTML={{ __html: post.custom_css }} />
            )}
            
            <div className="blueprint-canvas h-full w-full">
                {post.content_html ? (
                    <div 
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content_html) }} 
                    />
                ) : (
                    <div className="prose prose-sm max-w-none p-12">
                        {post.content_markdown}
                    </div>
                )}
            </div>
        </div>
    )
}
