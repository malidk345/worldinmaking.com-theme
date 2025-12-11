import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import PostCard, { MorphingDisclosure } from '../components/PostCard'
import PostHogWindow from '../components/PostHogWindow'
import { posts } from '../data/postsUtils'
import { useWindows } from '../components/Layout'

export default function CategoryTemplate({ pageContext }) {
    const { category } = pageContext

    // Filter posts for this category
    // postsUtils.js normalizes categories to lowercase? No, it takes raw name.
    // But Layout.js filtering used lowercase.
    // Let's ensure we match correctly.
    const categoryPosts = posts.filter(post => {
        const postCat = post.category?.toLowerCase() || ''
        return postCat === category
    })

    const {
        openWindows,
        focusedId,
        isMounted,
        openWindow,
        closeWindow,
        bringToFront,
        switchPostInWindow,
        updateReading,
        addToHistory,
        openSearch
    } = useWindows()

    // Responsive pagination state
    const [isDesktop, setIsDesktop] = useState(false)
    const [visibleCount, setVisibleCount] = useState(10)

    // Check screen size
    useEffect(() => {
        const checkScreenSize = () => {
            const desktop = window.innerWidth >= 768
            setIsDesktop(desktop)
            if (desktop) {
                setVisibleCount(prev => prev < 15 ? 15 : prev)
            }
        }

        checkScreenSize()
        window.addEventListener('resize', checkScreenSize)
        return () => window.removeEventListener('resize', checkScreenSize)
    }, [])

    const increment = isDesktop ? 15 : 10
    const visiblePosts = categoryPosts.slice(0, visibleCount)
    const hasMore = visibleCount < categoryPosts.length

    const handleLoadMore = () => {
        setVisibleCount(prev => Math.min(prev + increment, categoryPosts.length))
    }

    const handlePostClick = (post) => {
        openWindow(post)
    }

    const handleReadingChange = (readingInfo) => {
        if (readingInfo.postId === focusedId) {
            updateReading(readingInfo)
        }
    }

    // Capitalize category for display
    const displayCategory = category.charAt(0).toUpperCase() + category.slice(1)

    return (
        <Layout posts={posts}>
            <section className="min-h-screen py-6 sm:py-10 md:py-14 lg:py-20">
                <div className="max-w-screen-3xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">

                    {/* Category Header */}
                    <div className="mb-8 md:mb-12 text-center">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 lowercase text-[#1e3a8a]">
                            {displayCategory}
                        </h1>
                        <p className="text-gray-500 lowercase">
                            {categoryPosts.length} posts
                        </p>
                    </div>

                    {categoryPosts.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            no posts found in this category.
                        </div>
                    ) : isDesktop ? (
                        <div className="grid grid-cols-3 gap-4 lg:gap-6">
                            {visiblePosts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onClick={handlePostClick}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <MorphingDisclosure className="w-full max-w-2xl">
                                {visiblePosts.map((post) => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        onClick={handlePostClick}
                                    />
                                ))}
                            </MorphingDisclosure>
                        </div>
                    )}

                    {hasMore && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={handleLoadMore}
                                className="px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 bg-black text-white hover:bg-gray-800 active:scale-95"
                            >
                                more
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {isMounted && openWindows.length > 0 && (
                <>
                    {openWindows.map((w) => (
                        <PostHogWindow
                            key={w.post.id}
                            post={w.post}
                            zIndex={w.zIndex}
                            position={w.position}
                            isFocused={focusedId === w.post.id}
                            isNew={w.isNew}
                            onClose={() => closeWindow(w.post.id)}
                            onFocus={() => bringToFront(w.post.id)}
                            onReadingChange={handleReadingChange}
                            allPosts={posts}
                            onSearchClick={openSearch}
                            onPostClick={(newPost) => {
                                switchPostInWindow(w.post.id, newPost)
                            }}
                        />
                    ))}
                </>
            )}
        </Layout>
    )
}
