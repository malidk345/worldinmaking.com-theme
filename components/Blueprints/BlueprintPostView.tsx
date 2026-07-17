"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useBlueprints, BlueprintPost } from 'hooks/useBlueprints'
import Loading from 'components/Loading'
import { sanitizeHtml, sanitizeCss } from 'utils/security'

export default function BlueprintPostView({ slug }: { slug: string }) {
    const { getPostBySlug } = useBlueprints()
    const [post, setPost] = useState<BlueprintPost | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getPostBySlug(slug).then(data => {
            setPost(data as unknown as BlueprintPost)
            setLoading(false)
        })
    }, [slug, getPostBySlug])

    if (loading) return <Loading fullScreen label="loading technical layout" />
    if (!post) return <div className="p-8 text-center lowercase text-black/50 dark:text-white/50 font-mono text-sm">blueprint not found</div>

    return (
        <div className="absolute inset-0 overflow-auto bg-transparent">
            {post.custom_css && (
                <style dangerouslySetInnerHTML={{ __html: sanitizeCss(post.custom_css) }} />
            )}
            
            <motion.div
                className="blueprint-canvas h-full w-full relative z-10"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.1 }}
            >
                {post.content_html ? (
                    <div 
                        className="w-full h-full prose prose-sm md:prose-base dark:prose-invert max-w-3xl mx-auto p-6 md:p-12 blueprint-prose text-black/80 dark:text-white/80 transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content_html) }} 
                    />
                ) : (
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-3xl mx-auto p-6 md:p-12 blueprint-prose text-black/80 dark:text-white/80 transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]">
                        {post.content_markdown}
                    </div>
                )}
            </motion.div>
        </div>
    )
}
