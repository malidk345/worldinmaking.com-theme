import React, { useState, useEffect } from 'react'
import Layout, { useReading } from '../components/Layout'
import PostCard, { MorphingDisclosure } from '../components/PostCard'
import PostHogWindow from '../components/PostHogWindow'
import { posts } from '../data/postsUtils'

export default function IndexPage() {
  const ITEMS_PER_PAGE = 5
  const [currentPage, setCurrentPage] = useState(1)
  const [localOpenWindows, setLocalOpenWindows] = useState([])
  const [topZIndex, setTopZIndex] = useState(100)
  const [focusedId, setFocusedId] = useState(null)
  const [isMounted, setIsMounted] = useState(false)
  const { setCurrentReading, addToHistory, setOpenWindows, setActiveWindowId, openSearch } = useReading()

  // Define functions first (before useEffects that use them)
  const bringToFront = React.useCallback((postId) => {
    setTopZIndex(prev => {
      const newZ = prev + 1
      setLocalOpenWindows(wins => wins.map(w =>
        w.post.id === postId ? { ...w, zIndex: newZ } : w
      ))
      return newZ
    })
    setFocusedId(postId)
  }, [])

  const closeWindow = React.useCallback((postId) => {
    setLocalOpenWindows(wins => {
      const remaining = wins.filter(w => w.post.id !== postId)
      if (remaining.length > 0) {
        const lastWindow = remaining[remaining.length - 1]
        setFocusedId(lastWindow.post.id)
        setCurrentReading({
          postId: lastWindow.post.id,
          postTitle: lastWindow.post.title,
          sectionId: lastWindow.post.sections?.[0]?.id || null,
          sectionTitle: lastWindow.post.sections?.[0]?.title || null
        })
      } else {
        setFocusedId(null)
        setCurrentReading(null)
        // Don't clear localStorage - let the sync effect handle it
      }
      return remaining
    })
  }, [setCurrentReading])

  // Load saved windows from localStorage on mount - ONCE
  const [hasLoadedSavedWindows, setHasLoadedSavedWindows] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && isMounted && !hasLoadedSavedWindows) {
      setHasLoadedSavedWindows(true)
      const saved = localStorage.getItem('openWindows')
      if (saved && localOpenWindows.length === 0) {
        try {
          const savedWindows = JSON.parse(saved)

          // Restore windows from saved data
          const windowsToOpen = savedWindows
            .map(sw => {
              const post = posts.find(p => p.id === sw.id)
              return post ? { id: sw.id, post, title: sw.title } : null
            })
            .filter(Boolean)

          if (windowsToOpen.length > 0) {
            // Calculate positions
            const windowWidth = window.innerWidth
            const windowHeight = window.innerHeight
            const winW = Math.min(1100, windowWidth - 40)
            const winH = Math.min(650, windowHeight - 80)
            const centerX = Math.max(20, (windowWidth - winW) / 2)
            const centerY = Math.max(60, (windowHeight - winH) / 2)

            // Create all windows at once
            const newWindows = windowsToOpen.map((w, idx) => ({
              post: w.post,
              zIndex: 100 + idx,
              position: { x: centerX + idx * 25, y: centerY + idx * 25 },
              isNew: false
            }))

            setLocalOpenWindows(newWindows)
            setTopZIndex(100 + newWindows.length)
            if (newWindows.length > 0) {
              setFocusedId(newWindows[newWindows.length - 1].post.id)
            }
          }
        } catch (e) {
          console.error('Failed to restore windows', e)
        }
      }
    }
  }, [isMounted, hasLoadedSavedWindows, localOpenWindows.length])

  // Sync local windows with context for header display AND SAVE TO LOCALSTORAGE
  useEffect(() => {
    const windowsForHeader = localOpenWindows.map(w => ({
      id: w.post.id,
      title: w.post.title
    }))

    setOpenWindows(windowsForHeader)
    setActiveWindowId(focusedId)

    // SAVE TO LOCALSTORAGE - every time windows change
    if (typeof window !== 'undefined' && localOpenWindows.length > 0) {
      localStorage.setItem('openWindows', JSON.stringify(windowsForHeader))
    }

    // Also dispatch event for Layout to catch (backup sync method)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('windowsUpdated', {
        detail: { windows: windowsForHeader, activeId: focusedId }
      }))
    }
  }, [localOpenWindows, focusedId, setOpenWindows, setActiveWindowId])

  // Listen for focus/close events from header
  useEffect(() => {
    const handleFocusWindow = (e) => {
      const { windowId } = e.detail
      bringToFront(windowId)
    }

    const handleCloseWindow = (e) => {
      const { windowId } = e.detail
      closeWindow(windowId)
    }

    // Handle open post from history - uses ref to avoid stale closure
    const handleOpenPost = (e) => {
      const { postId, post: eventPost } = e.detail
      // Use event post if provided, otherwise find from posts
      const post = eventPost || posts.find(p => p.id === postId)
      if (post) {
        // Dispatch event to open - the openNewPost handler will check for duplicates
        const openEvent = new CustomEvent('openNewPost', { detail: { post } })
        window.dispatchEvent(openEvent)
      }
    }

    // Handle new post created from create modal
    const handleNewPostCreated = (e) => {
      const { post } = e.detail
      if (post) {
        // Open the newly created post in a window
        const openEvent = new CustomEvent('openNewPost', { detail: { post } })
        window.dispatchEvent(openEvent)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focusWindow', handleFocusWindow)
      window.addEventListener('closeWindow', handleCloseWindow)
      window.addEventListener('openPost', handleOpenPost)
      window.addEventListener('newPostCreated', handleNewPostCreated)
      return () => {
        window.removeEventListener('focusWindow', handleFocusWindow)
        window.removeEventListener('closeWindow', handleCloseWindow)
        window.removeEventListener('openPost', handleOpenPost)
        window.removeEventListener('newPostCreated', handleNewPostCreated)
      }
    }
  }, [bringToFront, closeWindow])

  // Handle openNewPost event from history click
  useEffect(() => {
    const handleOpenNewPost = (e) => {
      const { post } = e.detail
      if (!post) return

      // Calculate centered position
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800
      const winW = Math.min(1100, windowWidth - 40)
      const winH = Math.min(650, windowHeight - 80)
      const centerX = Math.max(20, (windowWidth - winW) / 2)
      const centerY = Math.max(60, (windowHeight - winH) / 2)

      setLocalOpenWindows(prev => {
        // Check if already open
        const existingWindow = prev.find(w => w.post.id === post.id)
        if (existingWindow) {
          // Return with updated zIndex for existing window
          return prev.map(w =>
            w.post.id === post.id
              ? { ...w, zIndex: Math.max(...prev.map(x => x.zIndex)) + 1 }
              : w
          )
        }

        const offset = prev.length * 25
        const maxZ = prev.length > 0 ? Math.max(...prev.map(x => x.zIndex)) : 100
        const newWindow = {
          post,
          zIndex: maxZ + 1,
          position: { x: centerX + offset, y: centerY + offset },
          isNew: true
        }
        return [...prev, newWindow]
      })

      setTopZIndex(prev => prev + 1)
      setFocusedId(post.id)
      addToHistory({ postId: post.id, postTitle: post.title })
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('openNewPost', handleOpenNewPost)
      return () => window.removeEventListener('openNewPost', handleOpenNewPost)
    }
  }, [addToHistory])

  // Header height constant
  const HEADER_HEIGHT = 40

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Clear reading when no windows
  useEffect(() => {
    if (localOpenWindows.length === 0) {
      setCurrentReading(null)
    }
  }, [localOpenWindows.length, setCurrentReading])

  const handlePostClick = (post) => {
    setLocalOpenWindows(prev => {
      // Check if window already open
      const existingWindow = prev.find(w => w.post.id === post.id)
      if (existingWindow) {
        return prev
      }

      // Calculate centered position
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800
      const winW = Math.min(1100, windowWidth - 40)
      const winH = Math.min(650, windowHeight - HEADER_HEIGHT - 40)

      // Center the window, accounting for header
      const centerX = Math.max(20, (windowWidth - winW) / 2)
      const centerY = Math.max(HEADER_HEIGHT + 20, (windowHeight - winH) / 2)

      // Offset slightly for multiple windows
      const offset = prev.length * 25

      const newWindow = {
        post,
        zIndex: topZIndex + 1,
        position: {
          x: centerX + offset,
          y: centerY + offset
        },
        isNew: true
      }

      return [...prev, newWindow]
    })

    // Always update these regardless
    setTopZIndex(prev => prev + 1)
    setFocusedId(post.id)

    // Add to reading history
    addToHistory({
      postId: post.id,
      postTitle: post.title
    })
  }

  const handleReadingChange = (readingInfo) => {
    if (readingInfo.postId === focusedId) {
      setCurrentReading(readingInfo)
    }
  }

  return (
    <Layout posts={posts}>
      {/* Posts Section - Morphing Disclosure Style */}
      <section className="min-h-screen py-6 sm:py-10 md:py-14 lg:py-20">
        <div className="max-w-screen-3xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Single Continuous Morphing Disclosure List */}
          <div className="flex flex-col items-center justify-center gap-8">
            <MorphingDisclosure className="w-full max-w-2xl">
              {posts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={handlePostClick}
                />
              ))}
            </MorphingDisclosure>

            {/* Pagination Controls */}
            {posts.length > ITEMS_PER_PAGE && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                >
                  Previous
                </button>
                <span className="text-sm font-medium opacity-60">
                  Page {currentPage} / {Math.ceil(posts.length / ITEMS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(posts.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={currentPage === Math.ceil(posts.length / ITEMS_PER_PAGE)}
                  className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Windows */}
      {isMounted && localOpenWindows.length > 0 && (
        <>
          {localOpenWindows.map((w) => (
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
                setLocalOpenWindows(localOpenWindows.map(win =>
                  win.post.id === w.post.id ? { ...win, post: newPost } : win
                ))
                // Add to reading history
                addToHistory({
                  postId: newPost.id,
                  postTitle: newPost.title
                })
              }}
            />
          ))}
        </>
      )}
    </Layout>
  )
}

export const Head = () => (
  <>
    <title>World in Making - Blog</title>
    <meta name="description" content="Insights, tutorials, and updates from our team." />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
  </>
)

// Helper function to chunk array into groups
function chunkArray(array, chunkSize) {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}
