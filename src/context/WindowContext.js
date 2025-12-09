import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// WINDOW CONTEXT - Centralized state management for post windows
// Replaces DOM event dispatching with proper React context
// ═══════════════════════════════════════════════════════════════════════════════

const WindowContext = createContext(null)

// Header height constant
const HEADER_HEIGHT = 40

// Storage key
const STORAGE_KEY = 'openWindows'

export function WindowProvider({ children, posts = [] }) {
  // Core window state
  const [openWindows, setOpenWindows] = useState([])
  const [focusedId, setFocusedId] = useState(null)
  const [topZIndex, setTopZIndex] = useState(100)

  // Reading history
  const [readingHistory, setReadingHistory] = useState([])
  const [currentReading, setCurrentReading] = useState(null)

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Mounted state for SSR safety
  const [isMounted, setIsMounted] = useState(false)
  const [hasLoadedSavedWindows, setHasLoadedSavedWindows] = useState(false)

  // Set mounted on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load saved windows from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted || hasLoadedSavedWindows) return

    setHasLoadedSavedWindows(true)
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved && openWindows.length === 0) {
      try {
        const savedWindows = JSON.parse(saved)
        console.log('📂 Loading saved windows:', savedWindows)

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

          setOpenWindows(newWindows)
          setTopZIndex(100 + newWindows.length)
          if (newWindows.length > 0) {
            setFocusedId(newWindows[newWindows.length - 1].post.id)
          }
        }
      } catch (e) {
        console.error('Failed to restore windows', e)
      }
    }
  }, [isMounted, hasLoadedSavedWindows, openWindows.length, posts])

  // Save windows to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return

    const windowsForStorage = openWindows.map(w => ({
      id: w.post.id,
      title: w.post.title
    }))

    if (openWindows.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(windowsForStorage))
      console.log('💾 Saved windows:', windowsForStorage)
    }
  }, [openWindows, isMounted])

  // Calculate centered position for new windows - stays above footer
  const calculatePosition = useCallback((existingCount) => {
    if (typeof window === 'undefined') {
      return { x: 50, y: 50 }
    }
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const BOTTOM_NAV_HEIGHT = 50 // Account for bottom sticky nav
    const winW = Math.min(1100, windowWidth - 40)
    const winH = Math.min(600, windowHeight - HEADER_HEIGHT - BOTTOM_NAV_HEIGHT - 40)
    const centerX = Math.max(20, (windowWidth - winW) / 2)
    const centerY = Math.max(HEADER_HEIGHT + 10, (windowHeight - winH - BOTTOM_NAV_HEIGHT) / 2)
    const offset = existingCount * 25
    return { x: centerX + offset, y: centerY + offset }
  }, [])

  // Open a new window or focus existing
  const openWindow = useCallback((post) => {
    if (!post) return

    console.log('🖱️ Opening window:', post.title)

    setOpenWindows(prev => {
      // Check if already open
      const existingWindow = prev.find(w => w.post.id === post.id)
      if (existingWindow) {
        console.log('⚠️ Window already open, bringing to front')
        // Just update zIndex, actual focus will be set separately
        const newZ = Math.max(...prev.map(x => x.zIndex)) + 1
        return prev.map(w =>
          w.post.id === post.id ? { ...w, zIndex: newZ } : w
        )
      }

      // Create new window
      const position = calculatePosition(prev.length)
      const newWindow = {
        post,
        zIndex: topZIndex + 1,
        position,
        isNew: true
      }

      console.log('✅ Adding new window. Total will be:', prev.length + 1)
      return [...prev, newWindow]
    })

    setTopZIndex(prev => prev + 1)
    setFocusedId(post.id)

    // Add to reading history
    addToHistory({ postId: post.id, postTitle: post.title })
  }, [calculatePosition, topZIndex])

  // Close a window
  const closeWindow = useCallback((postId) => {
    setOpenWindows(prev => {
      const remaining = prev.filter(w => w.post.id !== postId)

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
      }

      return remaining
    })
  }, [])

  // Bring window to front
  const bringToFront = useCallback((postId) => {
    setTopZIndex(prev => {
      const newZ = prev + 1
      setOpenWindows(wins => wins.map(w =>
        w.post.id === postId ? { ...w, zIndex: newZ } : w
      ))
      return newZ
    })
    setFocusedId(postId)
  }, [])

  // Switch post in existing window (for internal navigation)
  const switchPostInWindow = useCallback((currentPostId, newPost) => {
    setOpenWindows(prev => prev.map(win =>
      win.post.id === currentPostId ? { ...win, post: newPost } : win
    ))
    addToHistory({ postId: newPost.id, postTitle: newPost.title })
  }, [])

  // Add to reading history with timestamp
  const addToHistory = useCallback((item) => {
    setReadingHistory(prev => {
      const filtered = prev.filter(h => h.postId !== item.postId)
      return [...filtered, { ...item, timestamp: Date.now() }].slice(-10) // Keep last 10
    })
  }, [])

  // Update reading state
  const updateReading = useCallback((readingInfo) => {
    setCurrentReading(readingInfo)
  }, [])

  // Open search modal
  const openSearch = useCallback(() => {
    setIsSearchOpen(true)
  }, [])

  // Close search modal
  const closeSearch = useCallback(() => {
    setIsSearchOpen(false)
  }, [])

  // Clear reading when no windows
  useEffect(() => {
    if (openWindows.length === 0) {
      setCurrentReading(null)
    }
  }, [openWindows.length])

  // Get windows for header display (simplified format)
  const getWindowsForHeader = useCallback(() => {
    return openWindows.map(w => ({
      id: w.post.id,
      title: w.post.title
    }))
  }, [openWindows])

  const value = {
    // Window state
    openWindows,
    focusedId,
    isMounted,

    // Window actions
    openWindow,
    closeWindow,
    bringToFront,
    switchPostInWindow,

    // Reading state
    currentReading,
    readingHistory,
    updateReading,
    addToHistory,

    // Search
    isSearchOpen,
    openSearch,
    closeSearch,

    // Helpers
    getWindowsForHeader,
  }

  return (
    <WindowContext.Provider value={value}>
      {children}
    </WindowContext.Provider>
  )
}

// Hook to use window context
export function useWindows() {
  const context = useContext(WindowContext)
  if (!context) {
    throw new Error('useWindows must be used within WindowProvider')
  }
  return context
}

// Re-export for backwards compatibility
export { WindowContext }
export default WindowProvider
