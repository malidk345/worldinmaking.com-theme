import React, { useEffect, useState } from 'react'
import Link from 'components/Link'
import CloudinaryImage from 'components/CloudinaryImage'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

// Lightweight author avatar — reads raw profile attributes, no static query needed
export function AuthorAvatar({ profile, className = 'size-5' }: { profile: any; className?: string }) {
    if (!profile) return null
    const firstName: string = profile.firstName || ''
    const lastName: string = profile.lastName || ''
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Author'
    const avatarUrl = profile.avatar?.data?.attributes?.url || profile.avatar?.url || null
    return (
        <span className="inline-flex items-center gap-1" title={displayName}>
            <span className={`rounded-full overflow-hidden bg-accent/40 shrink-0 ${className}`}>
                {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                    <span className="w-full h-full flex items-center justify-center text-[8px] font-bold uppercase text-muted">
                        {firstName.charAt(0)}
                    </span>
                )}
            </span>
        </span>
    )
}


// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

export function PostSkeleton() {
    return (
        <div className="animate-pulse flex flex-col gap-2">
            <div className="h-4 bg-accent/60 rounded w-3/4" />
            <div className="h-3 bg-accent/40 rounded w-1/2" />
        </div>
    )
}

export function PostCard({ post, featured = false }: { post: any; featured?: boolean }) {
    const attr = post?.attributes || {}
    const title = attr.title || 'Untitled'
    const slug = attr.slug || post?.slug || '#'
    const date = attr.date ? dayjs(attr.date).fromNow() : ''
    const authors: any[] = attr.authors?.data || []
    const imageUrl = attr.featuredImage?.data?.attributes?.url || attr.featuredImageURL
    const href = `/blog/${slug}`

    if (featured) {
        return (
            <Link
                href={href}
                className="group block border border-primary rounded-lg overflow-hidden hover:bg-accent/20 transition-colors h-full"
            >
                {imageUrl && (
                    <div className="aspect-video overflow-hidden bg-accent/30">
                        <CloudinaryImage
                            src={imageUrl}
                            width={800}
                            imgClassName="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                            alt={title}
                        />
                    </div>
                )}
                <div className="p-5">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted bg-accent/40 px-2 py-0.5 rounded mb-3 inline-block">
                        Featured
                    </span>
                    <h2 className="text-lg font-bold leading-snug mb-2 group-hover:underline">{title}</h2>
                    {attr.excerpt && (
                        <p className="text-sm text-secondary line-clamp-2 mb-4">{attr.excerpt}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted">
                        {authors[0] && (
                            <AuthorAvatar
                                profile={authors[0]?.attributes?.profile?.data?.attributes}
                                className="size-5"
                            />
                        )}
                        <span>{date}</span>
                    </div>
                </div>
            </Link>
        )
    }

    return (
        <Link
            href={href}
            className="group flex items-start gap-3 py-3 border-b border-primary last:border-b-0 hover:bg-accent/20 -mx-3 px-3 rounded transition-colors"
        >
            {imageUrl && (
                <div className="shrink-0 size-10 rounded overflow-hidden bg-accent/30">
                    <CloudinaryImage src={imageUrl} width={48} imgClassName="w-full h-full object-cover" alt={title} />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug group-hover:underline line-clamp-2">{title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted">
                    {authors[0] && (
                        <AuthorAvatar
                            profile={authors[0]?.attributes?.profile?.data?.attributes}
                            className="size-4"
                        />
                    )}
                    <span>{date}</span>
                </div>
            </div>
        </Link>
    )
}


// ──────────────────────────────────────────────────────────────────
// Animated ticker
// ──────────────────────────────────────────────────────────────────

const WORDS = ['writing', 'thinking', 'building', 'shipping', 'making', 'questioning']

export function MakingTicker() {
    const [idx, setIdx] = useState(0)
    const [visible, setVisible] = useState(true)
    useEffect(() => {
        const iv = setInterval(() => {
            setVisible(false)
            setTimeout(() => { setIdx((i) => (i + 1) % WORDS.length); setVisible(true) }, 240)
        }, 3000)
        return () => clearInterval(iv)
    }, [])
    return (
        <span
            style={{ display: 'inline-block', opacity: visible ? 1 : 0, transition: 'opacity 0.24s ease' }}
            className="font-bold italic text-primary"
        >
            {WORDS[idx]}
        </span>
    )
}
