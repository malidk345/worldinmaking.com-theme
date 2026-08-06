import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useLayoutData } from 'components/Layout/hooks'
import {
    fetchSupabasePostBySlug,
    formatSupabasePostToStrapi,
    normalizePostSlug,
    supabasePostToClientPostProps,
    type SupabasePost,
} from 'lib/supabaseBlog'

const ClientPost = dynamic(() => import('components/Edition/ClientPost'), { ssr: false })

const Skeleton = () => {
    const { fullWidthContent } = useLayoutData()
    return (
        <div className={`article-content flex-1 transition-all md:pt-8 w-full overflow-auto`}>
            <div
                className={`mx-auto transition-all ${fullWidthContent ? 'max-w-full' : 'max-w-3xl'} md:px-8 2xl:px-12`}
            >
                <div>
                    <div className="bg-accent h-[37px] w-2/3 rounded-md" />
                    <div className="bg-accent h-[27px] w-1/3 rounded-md mt-2" />
                    <div className="bg-accent aspect-video w-full rounded-md mt-2" />
                </div>
            </div>
        </div>
    )
}

const NotFound = ({ slug }: { slug: string }) => (
    <div className="p-8 text-primary max-w-xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Post not found</h1>
        <p className="text-secondary text-sm m-0">
            No Supabase post matches <code className="text-xs">{slug}</code>.
        </p>
    </div>
)

/**
 * Single post page — Supabase `posts` only (Squeak path removed).
 */
export default function PostPage({ params }: { params?: { slug?: string } }) {
    const [post, setPost] = useState<SupabasePost | null>(null)
    const [loading, setLoading] = useState(true)
    const [missing, setMissing] = useState(false)

    const slug = normalizePostSlug(params?.slug || '')

    const load = async () => {
        if (!slug) {
            setMissing(true)
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const row = await fetchSupabasePostBySlug(slug)
            if (row) {
                setPost(row)
                setMissing(false)
            } else {
                setPost(null)
                setMissing(true)
            }
        } catch {
            setPost(null)
            setMissing(true)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void load()
    }, [slug])

    if (loading) return <Skeleton />
    if (missing || !post) return <NotFound slug={slug} />

    const props = supabasePostToClientPostProps(post)
    return <ClientPost {...props} getPost={load} />
}

// re-export helper for tests / other entry points
export { formatSupabasePostToStrapi }
