import React from 'react'
import Link from 'components/Link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { usePaginatedPosts } from 'components/Edition/hooks/usePaginatedPosts'
import { PostSkeleton, PostCard } from './shared'

dayjs.extend(relativeTime)

// ──────────────────────────────────────────────────────────────────
// Latest writing
// ──────────────────────────────────────────────────────────────────

export default function LatestWriting() {
    const { posts, isLoading } = usePaginatedPosts({
        params: { sort: ['date:desc'] },
        pageSize: 7,
    })
    const featured = posts[0]
    const rest = posts.slice(1, 7)

    return (
        <section className="px-4 @xl:px-10 py-10 @xl:py-12 border-b border-primary">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted font-bold mb-1">Blog</p>
                    <h2 className="text-xl font-bold">latest writing</h2>
                </div>
                <Link href="/posts" className="text-sm text-secondary hover:text-primary hover:underline transition-colors">
                    See all →
                </Link>
            </div>

            {isLoading ? (
                <div className="grid @xl:grid-cols-2 gap-8">
                    <PostSkeleton />
                    <div className="space-y-5">{[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}</div>
                </div>
            ) : (
                <div className="grid @xl:grid-cols-2 gap-8">
                    <div className="flex flex-col">
                        {featured && <PostCard post={featured} featured />}
                    </div>
                    <div>
                        {rest.map((p) => <PostCard key={p.id} post={p} />)}
                    </div>
                </div>
            )}
        </section>
    )
}
