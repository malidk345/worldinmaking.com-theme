import React from 'react'
import Layout from '../components/Layout'
import PostCard, { MorphingDisclosure } from '../components/PostCard'
import PostHogWindow from '../components/PostHogWindow'
import { posts } from '../data/postsUtils'
import { useWindows } from '../components/Layout'

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX PAGE - Main homepage with post listing and window management
// Now uses WindowContext for all state management (no DOM events)
// ═══════════════════════════════════════════════════════════════════════════════

function IndexContent() {
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

    // Handle post card click
    const handlePostClick = (post) => {
        openWindow(post)
    }

    // Handle reading change from window
    const handleReadingChange = (readingInfo) => {
        if (readingInfo.postId === focusedId) {
            updateReading(readingInfo)
        }
    }

    return (
        <>
            {/* Posts Section - Morphing Disclosure Style */}
            <section className="min-h-screen py-6 sm:py-10 md:py-14 lg:py-20">
                <div className="max-w-screen-3xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                    {/* Single Continuous Morphing Disclosure List */}
                    <div className="flex justify-center">
                        <MorphingDisclosure className="w-full max-w-2xl">
                            {posts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onClick={handlePostClick}
                                />
                            ))}
                        </MorphingDisclosure>
                    </div>
                </div>
            </section>

            {/* Windows */}
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
                                // Switch post in same window
                                switchPostInWindow(w.post.id, newPost)
                            }}
                        />
                    ))}
                </>
            )}
        </>
    )
}

export default function IndexPage() {
    return (
        <Layout posts={posts}>
            <IndexContent />
        </Layout>
    )
}

export const Head = () => (
    <>
        <title>World in Making - Blog</title>
        <meta name="description" content="Insights, tutorials, and updates from our team." />
    </>
)
