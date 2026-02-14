"use client"

import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
    IconNewspaper,
    IconFilter,
    IconChevronDown,
    IconUser,
    IconArrowRight,
    IconCalendar,
    IconClock,
    IconCheck
} from '@posthog/icons'
import OSButton from 'components/OSButton'
import { useApp } from 'context/App'
import BlogPostView from 'components/ReaderView/BlogPostView'
import { usePosts } from 'hooks/usePosts'
import { Popover } from 'components/RadixUI/Popover'

const MOCK_AUTHORS = [
    { name: 'James Hawkins', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/james.png' },
    { name: 'Tim Glaser', avatar: 'https://res.cloudinary.com/dmukukwp6/image/upload/v1710153303/posthog.com/contents/images/authors/tim.png' },
]

const EditionPostCard = ({ post, isMobile }: { post: any; isMobile: boolean }) => {
    const { addWindow } = useApp()
    const postDate = dayjs(post.date).format('MMM D, YYYY')
    const author = post.authors[0]

    const handleOpen = () => {
        addWindow({
            key: `blog-${post.id}`,
            path: post.slug,
            title: post.title,
            size: isMobile ? { width: window.innerWidth, height: window.innerHeight - 44 } : { width: 1000, height: 800 },
            position: isMobile ? { x: 0, y: 0 } : { x: 50, y: 50 },
            element: <BlogPostView post={post} />
        })
    }

    return (
        <div
            onClick={handleOpen}
            className="h-full group cursor-pointer"
        >
            <div className="flex flex-col h-full border border-border rounded-md bg-primary hover:bg-accent hover:border-primary-text/20 transition-all relative active:top-[1px] active:scale-[.99] overflow-hidden">
                <div className="px-3 py-1.5 border-b border-border bg-accent flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {author.avatar ? (
                            <img src={author.avatar} className="size-5 rounded-full border border-border bg-primary" alt={author.name} />
                        ) : (
                            <div className="size-5 rounded-full border border-border bg-primary flex items-center justify-center">
                                <IconUser className="size-3.5 text-primary-text" />
                            </div>
                        )}
                        <span className="text-[11px] text-primary-text leading-none">{author.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-primary-text">
                        <IconClock className="size-3" />
                        <span className="text-[11px] tracking-tighter">
                            {post.wordCount} words
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-primary-text">
                        <IconCalendar className="size-3" />
                        <span className="text-[11px]">{postDate}</span>
                    </div>
                </div>

                <div className={`@container p-4 grid gap-3 ${post.image ? '@md:grid-cols-[1fr_180px]' : 'grid-cols-1'} @md:items-start flex-grow`}>
                    <div className={`order-2 ${post.image ? '@md:order-1' : ''} grid gap-2`}>
                        <h3 className="m-0 text-[15px] leading-tight text-black group-hover:text-burnt-orange transition-colors">
                            {post.title}
                        </h3>
                        {post.excerpt && (
                            <p className="m-0 text-[14px] text-black line-clamp-4 leading-tight font-button font-normal">
                                {post.excerpt}
                            </p>
                        )}
                    </div>

                    {post.image && (
                        <div className="order-1 @md:order-2 w-full aspect-[600/315] @md:aspect-[4/3] rounded-sm overflow-hidden bg-accent border border-border">
                            <img className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" src={post.image} alt={post.title} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const FeaturedPost = ({ post, isMobile }: { post: any; isMobile: boolean }) => {
    const { addWindow } = useApp()
    const postDate = dayjs(post.date).format('MMM D, YYYY')
    const author = post.authors[0]

    const handleOpen = () => {
        addWindow({
            key: `blog-${post.id}`,
            path: post.slug,
            title: post.title,
            size: isMobile ? { width: window.innerWidth, height: window.innerHeight - 44 } : { width: 1000, height: 800 },
            position: isMobile ? { x: 0, y: 0 } : { x: 50, y: 50 },
            element: <BlogPostView post={post} />
        })
    }

    return (
        <section
            onClick={handleOpen}
            className={`group cursor-pointer grid ${post.image ? 'md:grid-cols-2 gap-6 md:gap-10' : 'grid-cols-1'} items-center rounded-lg border border-border p-6 mb-10 bg-accent hover:border-burnt-orange transition-all shadow-sm hover:shadow-md`}
        >
            {post.image && (
                <div className="w-full aspect-[16/9] rounded-md overflow-hidden bg-primary border border-border shadow-inner">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={post.image} alt={post.title} />
                </div>
            )}
            <div className={`flex flex-col py-2 ${!post.image ? 'max-w-4xl mx-auto w-full' : ''}`}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        {author.avatar ? (
                            <img src={author.avatar} className="size-8 rounded-full border border-border bg-primary shadow-sm" alt={author.name} />
                        ) : (
                            <div className="size-8 rounded-full border border-border bg-primary shadow-sm flex items-center justify-center">
                                <IconUser className="size-4 text-primary-text" />
                            </div>
                        )}
                        <div className="flex flex-col -space-y-0.5">
                            <span className="text-[13px] text-primary-text">{author.name}</span>
                            <span className="text-[10px] text-primary-text tracking-wider">author</span>
                        </div>
                    </div>

                    <div className="hidden sm:flex flex-col items-center text-primary-text">
                        <IconClock className="size-4 mb-0.5" />
                        <div className="flex flex-col items-center -space-y-1">
                            <span className="text-[12px] tracking-[0.2em]">{post.wordCount}</span>
                            <span className="text-[10px] leading-none">words</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-burnt-orange/10 text-burnt-orange text-[9px] tracking-widest rounded-sm border border-burnt-orange/20">
                            Featured
                        </span>
                        <div className="flex items-center gap-1.5 text-primary-text italic">
                            <IconCalendar className="size-3.5" />
                            <span className="text-[11px]">{postDate}</span>
                        </div>
                    </div>
                </div>

                <h2 className="mt-0 mb-4 text-xl lg:text-2xl text-black leading-tight group-hover:underline decoration-burnt-orange/30 underline-offset-4">
                    {post.title}
                </h2>

                <p className="text-[14px] text-black leading-tight line-clamp-8 mb-8 max-w-none w-full font-button font-normal">
                    {post.excerpt}
                </p>

                <div className="mt-auto">
                    <OSButton variant="secondary" size="md" className="font-black tracking-widest text-[11px]">
                        Continue reading <IconArrowRight className="size-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </OSButton>
                </div>
            </div>
        </section>
    )
}

export default function PostsView() {
    const { isMobile, addWindow } = useApp()
    const { posts, loading } = usePosts()
    const [visibleCount, setVisibleCount] = useState(10)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    const uniqueCategories = useMemo(() => {
        const cats = new Set(posts.map(p => p.category).filter(Boolean))
        return Array.from(cats).sort()
    }, [posts])

    const ALL_POSTS = useMemo(() => {
        let filtered = posts
        if (selectedCategory) {
            filtered = posts.filter(p => p.category === selectedCategory)
        }
        return filtered.map((p) => ({
            ...p,
            authors: [{ name: p.authorName || 'Unknown', avatar: p.authorAvatar || '' }]
        }))
    }, [posts, selectedCategory])

    if (loading && ALL_POSTS.length === 0) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-8 border-2 border-primary-text/10 border-t-burnt-orange rounded-full animate-spin" />
                    <span className="text-xs font-bold tracking-widest text-primary-text/40 lowercase">assembling edition...</span>
                </div>
            </div>
        )
    }

    const [featuredPost, ...otherPosts] = ALL_POSTS
    const visiblePosts = otherPosts.slice(0, visibleCount)
    const hasMore = visibleCount < otherPosts.length

    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden bg-primary text-black">
            {/* TOOLBAR */}
            <div data-scheme="secondary" className={`flex-shrink-0 flex items-center justify-between m-1 rounded border border-border bg-accent ${isMobile ? 'py-1.5 px-2' : 'py-1 px-3'}`}>
                <div className="flex items-center gap-3">
                    <OSButton
                        variant="secondary"
                        size="xs"
                        className="font-bold gap-1"
                        onClick={() => addWindow({
                            key: 'write-for-wim',
                            title: 'Write for WIM',
                            path: '/write',
                            icon: <IconNewspaper className="size-4 text-navy" />,
                            element: (
                                <div className="flex items-center justify-center h-full bg-accent text-primary-text/20 text-xs font-bold tracking-[0.2em]">
                                    🚧 Engineering in progress
                                </div>
                            )
                        })}
                    >
                        <IconNewspaper className="size-3 text-navy" />
                        <span className="text-primary-text">write for wim</span>
                    </OSButton>
                    <div className="h-4 w-px bg-primary-text/10" />
                    <span className="text-[10px] font-bold tracking-widest text-primary-text/30">
                        {ALL_POSTS.length} {selectedCategory ? `in ${selectedCategory.toLowerCase()}` : 'articles'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Popover
                        dataScheme="secondary"
                        trigger={
                            <button className={`p-1 hover:bg-black/5 rounded-sm transition-colors ${selectedCategory ? 'text-burnt-orange' : 'text-secondary-text hover:text-primary-text'}`}>
                                <IconFilter className="size-3.5" />
                            </button>
                        }
                    >
                        <div className="w-48 py-1">
                            <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-primary-text/30 border-b border-border/50 mb-1">
                                Filter by category
                            </div>
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold hover:bg-black/5 text-left"
                            >
                                <span className="lowercase">all articles</span>
                                {!selectedCategory && <IconCheck className="size-3" />}
                            </button>
                            {uniqueCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold hover:bg-black/5 text-left"
                                >
                                    <span className="lowercase">{cat}</span>
                                    {selectedCategory === cat && <IconCheck className="size-3" />}
                                </button>
                            ))}
                        </div>
                    </Popover>
                    {!isMobile && (
                        <button className="flex items-center gap-1 p-1 hover:bg-black/5 rounded-sm transition-colors text-secondary-text hover:text-primary-text text-[11px] font-bold">
                            Sort
                            <IconChevronDown className="size-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-grow overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_top,_rgba(var(--accent-rgb),0.05),_transparent)]">
                <div className={`max-w-[1300px] mx-auto py-8 ${isMobile ? 'px-4' : 'px-8'}`}>

                    {/* Featured Post (Magazine Style) */}
                    {ALL_POSTS.length > 0 && (
                        <>
                            {!isMobile && <FeaturedPost post={featuredPost} isMobile={isMobile} />}
                            {isMobile && <EditionPostCard post={featuredPost} isMobile={isMobile} />}
                        </>
                    )}

                    {/* Posts Grid */}
                    <div className="@container list-none m-0 p-0 grid gap-4 mt-6 @md:grid-cols-2 @xl:grid-cols-3">
                        {visiblePosts.map((post) => (
                            <div key={post.id}>
                                <EditionPostCard post={post} isMobile={isMobile} />
                            </div>
                        ))}
                    </div>

                    {/* More Button */}
                    {hasMore ? (
                        <div className="py-12 flex justify-center">
                            <OSButton
                                variant="secondary"
                                size="sm"
                                className="font-bold"
                                onClick={() => setVisibleCount((prev: number) => prev + 10)}
                            >
                                <span className="px-6">more</span>
                            </OSButton>
                        </div>
                    ) : (
                        <div className="py-24 flex flex-col items-center gap-4">
                            <div className="w-16 h-px bg-primary-text/10" />
                            <span className="text-[10px] font-black tracking-[1em] text-primary-text/5 pl-[1em]">
                                End of Edition
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
