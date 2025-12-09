import React, { useState, useEffect, useRef } from 'react'
import '../styles/global.css'
import WindowManager from './WindowManager'
import SearchModal from './SearchModal'
import CreatePostModal from './CreatePostModal'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { WindowProvider, useWindows } from '../context/WindowContext'
import {
  IconBook, IconWindow, IconX, IconMenu,
  IconChat, IconInbox, IconSettings, IconNews, IconTheme, IconGlobe,
  IconEmail, IconBookmark, IconClock, IconHome,
  IconSearch, IconPlus, IconUser, IconHamburger, IconDocument, IconBusiness,
  IconTutorial, IconDesign, IconLifestyle
} from './Icons'
import { posts } from '../data/postsUtils'

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT COMPONENT - Main layout wrapper with header, footer, and navigation
// Now uses WindowContext for state management instead of DOM events
// ═══════════════════════════════════════════════════════════════════════════════

// Bottom Sticky Nav Bar Component (hidden on mobile when blob is active)
const BottomStickyNav = ({ onMenuClick, menuOpen, onSearchClick, onCreateClick }) => {
  const { user, isAuthenticated, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'system'
      applyTheme(savedTheme)
    }
  }, [])

  const applyTheme = (newTheme) => {
    if (typeof window === 'undefined') return
    const root = document.documentElement

    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
      root.classList.toggle('light', !prefersDark)
    } else if (newTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }

  return (
    <nav className="bottom-sticky-nav">
      <ul>
        <li>
          <a href="/" title="home">
            <IconHome className="w-[18px] h-[18px]" />
          </a>
        </li>
        <li>
          <button onClick={onSearchClick} title="search (⌘K)">
            <IconSearch className="w-[18px] h-[18px]" />
            <span className="sr-only">search</span>
          </button>
        </li>
        <li>
          <button onClick={onCreateClick} title="create new">
            <IconPlus className="w-[18px] h-[18px]" />
            <span className="sr-only">create new</span>
          </button>
        </li>
        <li>
          <button
            onClick={onMenuClick}
            className={menuOpen ? 'active' : ''}
            title="menu"
          >
            <IconHamburger className="w-[18px] h-[18px]" />
            <span className="sr-only">open menu</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING BLOB NAV - Goo Effect Morphing Navigation
// ═══════════════════════════════════════════════════════════════════════════════

const FloatingBlobNav = ({ onSearchClick, onCreateClick }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { openWindows, focusedId, bringToFront, closeWindow } = useWindows()
  const menuRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const toggleTheme = () => {
    if (typeof window === 'undefined') return
    const root = document.documentElement
    const isDark = root.classList.contains('dark')
    if (isDark) {
      root.classList.remove('dark')
      root.classList.add('light')
      localStorage.setItem('theme', 'light')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }

  return (
    <>
      {/* SVG Filter for Goo Effect */}
      <svg className="sr-only" aria-hidden="true">
        <defs>
          <filter id="goo-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Floating Trigger Button */}
      <button
        className={`floating-blob-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        <IconPlus className="w-6 h-6" />
      </button>

      {/* Expanding Blob Menu */}
      <div
        ref={menuRef}
        className={`floating-blob-menu ${isOpen ? 'open' : ''}`}
      >
        {/* Goo filtered background */}
        <div className="blob-filtered">
          <div className="blob-shape" />
        </div>

        {/* Actual content */}
        <div className="blob-content">
          {/* Nav Icons Row */}
          <div className="blob-nav-icons">
            <a href="/" title="Home">
              <IconHome className="w-5 h-5" />
            </a>
            <button onClick={() => { onSearchClick(); setIsOpen(false); }} title="Search">
              <IconSearch className="w-5 h-5" />
            </button>
            <button onClick={() => { onCreateClick(); setIsOpen(false); }} title="Create">
              <IconPlus className="w-5 h-5" />
            </button>
            <button onClick={toggleTheme} title="Toggle theme">
              <IconTheme className="w-5 h-5" />
            </button>
            <a href="/settings" title="Settings">
              <IconSettings className="w-5 h-5" />
            </a>
          </div>

          {/* Categories Section */}
          <div className="blob-windows-section">
            <div className="blob-section-title">Categories</div>
            <a href="/category/articles" className="blob-window-item">
              <IconBook className="w-3.5 h-3.5" />
              <span>Articles</span>
            </a>
            <a href="/category/stories" className="blob-window-item">
              <IconLifestyle className="w-3.5 h-3.5" />
              <span>Stories</span>
            </a>
          </div>

          {/* Quick Links */}
          <div className="blob-links">
            <a href="/" className="blob-link">
              <IconHome className="w-3.5 h-3.5" />
              <span>Home</span>
            </a>
            <a href="/about" className="blob-link">
              <IconBook className="w-3.5 h-3.5" />
              <span>About</span>
            </a>
            <a href="/contact" className="blob-link">
              <IconEmail className="w-3.5 h-3.5" />
              <span>Contact</span>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

// Popover Menu Component
const PopoverMenu = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPosts, setFilteredPosts] = useState([])
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && isOpen) {
        const navBar = document.querySelector('.floating-nav')
        if (navBar && !navBar.contains(e.target)) {
          onClose()
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 200)
    }
  }, [isOpen])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const results = posts.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.category?.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query)
      ).slice(0, 8)
      setFilteredPosts(results)
    } else {
      setFilteredPosts([])
    }
  }, [searchQuery])

  const linkItems = [
    { href: '/', icon: IconHome, label: 'home' },
    { href: '/about', icon: IconGlobe, label: 'about' },
    { href: '/contact', icon: IconEmail, label: 'contact' },
  ]

  const categoryIcons = {
    'articles': IconDocument,
    'books': IconBook,
    'book review': IconBook,
    'politics': IconNews,
    'tests': IconTutorial,
    'must read': IconBookmark,
    'featured': IconBookmark,
    'financial': IconBusiness,
    'society': IconGlobe,
    'culture': IconDesign,
    'psychology': IconChat,
    'sexuality': IconLifestyle,
    'history': IconClock,
    'stories': IconDocument,
    'story': IconDocument,
    'shortstroies': IconDocument,
    'horror': IconNews,
    'creativewriting': IconDesign,
    'wrting': IconDesign,
    'guest writing': IconEmail,
    'manifesto': IconNews,
  }

  const categories = [...new Set(posts.map(p => p.category?.toLowerCase()).filter(Boolean))]
    .map(cat => ({
      slug: cat,
      label: cat,
      icon: categoryIcons[cat] || IconDocument
    }))

  return (
    <div
      ref={menuRef}
      className={`popover-menu ${isOpen ? 'popover-open' : ''}`}
    >
      <div className="popover-content">
        <div className="popover-content-inner">
          <div className="popover-heading">
            <a href="/" className="popover-pill" style={{ color: '#1e3a5f', borderColor: '#1e3a5f' }}>worldinmaking</a>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <hr className="popover-divider" />

          {filteredPosts.length > 0 && (
            <div className="popover-links popover-search-results">
              <nav>
                <h3>search results</h3>
                <ul>
                  {filteredPosts.map((post) => {
                    const PostIcon = categoryIcons[post.category?.toLowerCase()] || IconDocument
                    return (
                      <li key={post.id}>
                        <a href={`/?post=${post.id}`} onClick={onClose}>
                          <PostIcon className="w-4 h-4" />
                          <span>{post.title.toLowerCase()}</span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </div>
          )}

          {filteredPosts.length === 0 && (
            <div className="popover-links">
              <nav>
                <h3>links</h3>
                <ul>
                  {linkItems.map((item) => (
                    <li key={item.href}>
                      <a href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>

                <h3>categories</h3>
                <ul>
                  {categories.map((cat) => (
                    <li key={cat.slug}>
                      <a href={`/?category=${cat.slug}`} onClick={onClose}>
                        <cat.icon className="w-4 h-4" />
                        <span>{cat.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          )}
        </div>

        <ul className="popover-mirror-icons" aria-hidden="true">
          <li style={{ '--i': 0 }}><IconChat className="w-6 h-6" /></li>
          <li style={{ '--i': 1 }}><IconInbox className="w-6 h-6" /></li>
          <li style={{ '--i': 2 }}><IconSettings className="w-6 h-6" /></li>
          <li style={{ '--i': 3 }}><IconNews className="w-6 h-6" /></li>
          <li style={{ '--i': 4 }}><IconTheme className="w-6 h-6" theme="system" /></li>
          <li style={{ '--i': 5 }}><IconMenu className="w-6 h-6" /></li>
        </ul>
      </div>
    </div>
  )
}

// Dark Mode Toggle Button
const DarkModeToggle = () => {
  const [isDark, setIsDark] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) {
        setIsDark(saved === 'dark')
        document.documentElement.classList.toggle('dark', saved === 'dark')
        document.documentElement.classList.toggle('light', saved !== 'dark')
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setIsDark(prefersDark)
        document.documentElement.classList.toggle('dark', prefersDark)
        document.documentElement.classList.toggle('light', !prefersDark)
      }
    }
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', newIsDark)
      document.documentElement.classList.toggle('light', !newIsDark)
    }
  }

  if (!isMounted) return null

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative flex items-center justify-center w-8 h-8 rounded-lg
        transition-all duration-300 ease-out
        ${isDark
          ? 'bg-blue-900/30 hover:bg-blue-800/40 text-blue-300'
          : 'bg-blue-100/80 hover:bg-blue-200 text-blue-700'
        }
      `}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{ color: isDark ? '#93c5fd' : '#1e40af' }}
    >
      <svg
        className={`absolute w-4 h-4 transition-all duration-300 ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <svg
        className={`absolute w-4 h-4 transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </button>
  )
}

// Breadcrumb navigation - Uses WindowContext
const BreadcrumbNav = () => {
  const {
    openWindows,
    focusedId,
    currentReading,
    readingHistory,
    bringToFront,
    closeWindow,
    openWindow,
    getWindowsForHeader
  } = useWindows()

  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const windowsForHeader = getWindowsForHeader()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const timeAgo = (timestamp) => {
    if (!timestamp) return ''
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const windowCount = windowsForHeader.length
  const historyCount = readingHistory?.length || 0

  const handleWindowClick = (windowId) => {
    bringToFront(windowId)
    setShowDropdown(false)
  }

  const handleWindowClose = (windowId) => {
    closeWindow(windowId)
  }

  const handleHistoryClick = (item) => {
    const post = posts.find(p => p.id === item.postId)
    if (post) {
      openWindow(post)
    }
    setShowDropdown(false)
  }

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`
          flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] font-medium
          transition-all duration-200
          ${showDropdown
            ? 'bg-[#1e3a8a] text-white shadow-md'
            : 'text-[#1e3a8a] dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
          }
        `}
        title="Windows & History"
      >
        <IconWindow className="w-4 h-4" />
        {windowCount > 0 && (
          <span className="flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] font-bold bg-[#1e3a8a] text-white">
            {windowCount}
          </span>
        )}
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <DarkModeToggle />

      <div className={`
        fixed left-4 right-4 top-12 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2
        bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-xl shadow-2xl z-50 
        sm:min-w-[300px] sm:max-w-[360px] overflow-hidden
        transition-all duration-300 ease-out origin-top-right
        ${showDropdown
          ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }
      `}>
        <div className="px-4 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--accent))]/30">
          <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))]">open windows</h3>
        </div>

        {windowCount > 0 && (
          <div className="border-b border-[rgb(var(--border))]">
            <div className="max-h-[220px] overflow-y-auto">
              {windowsForHeader.map((win) => (
                <div
                  key={win.id}
                  role="button"
                  tabIndex={0}
                  className={`
                    flex items-center justify-between gap-2 px-4 py-2.5
                    transition-all duration-200 cursor-pointer
                    ${focusedId === win.id
                      ? 'bg-[#1e3a8a]/10 border-l-2 border-l-[#1e3a8a]'
                      : 'hover:bg-[rgb(var(--accent))]/50 border-l-2 border-l-transparent'
                    }
                  `}
                  onClick={() => handleWindowClick(win.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleWindowClick(win.id)
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {focusedId === win.id && (
                      <span className="w-2 h-2 rounded-full bg-[#1e3a8a] animate-pulse flex-shrink-0" />
                    )}
                    <IconWindow className={`w-4 h-4 flex-shrink-0 ${focusedId === win.id ? 'text-[#1e3a8a]' : 'text-[rgb(var(--text-muted))]'}`} />
                    <span className={`truncate text-sm ${focusedId === win.id ? 'text-[#1e3a8a] font-medium' : 'text-[rgb(var(--text-primary))]'}`}>
                      {win.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleWindowClose(win.id)
                    }}
                    className="p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-500 transition-all opacity-40 hover:opacity-100 text-[rgb(var(--text-muted))]"
                    title="close"
                  >
                    <IconX className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {historyCount > 0 && (
          <>
            <div className="px-4 py-2 bg-[rgb(var(--accent))]/20">
              <span className="text-[11px] text-[rgb(var(--text-muted))] uppercase tracking-wider font-medium">recently viewed · {historyCount}</span>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {[...readingHistory].reverse().map((item, idx) => (
                <button
                  key={`${item.postId}-${idx}`}
                  onClick={() => handleHistoryClick(item)}
                  className={`
                    w-full text-left px-4 py-2.5 flex items-center gap-2.5 
                    transition-all duration-200 hover:bg-[rgb(var(--accent))]/50
                    border-b border-[rgb(var(--border))]/10 last:border-0
                    ${currentReading?.postId === item.postId ? 'bg-[#1e3a8a]/5' : ''}
                  `}
                >
                  <IconBook className="w-4 h-4 flex-shrink-0 text-[rgb(var(--text-muted))]" />
                  <span className="text-sm text-[rgb(var(--text-primary))] truncate flex-1">{item.postTitle}</span>
                  {item.timestamp && (
                    <span className="text-[11px] text-[rgb(var(--text-muted))]/60 flex-shrink-0">{timeAgo(item.timestamp)}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {windowCount === 0 && historyCount === 0 && (
          <div className="px-4 py-8 text-center">
            <IconBook className="w-8 h-8 mx-auto mb-3 text-[rgb(var(--text-muted))]/20" />
            <p className="text-sm text-[rgb(var(--text-muted))]">no windows open</p>
            <p className="text-xs text-[rgb(var(--text-muted))]/60 mt-1">click on a post to start</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Inner Layout Component that uses WindowContext
function LayoutInner({ children, posts: propPosts = [] }) {
  const { openSearch, isSearchOpen, closeSearch, openWindow } = useWindows()
  const [menuOpen, setMenuOpen] = useState(false)
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [localPosts, setLocalPosts] = useState([])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openSearch])

  const handleSearchSelect = (post) => {
    openWindow(post)
    closeSearch()
  }

  const handleCreatePost = (newPost) => {
    setLocalPosts(prev => [newPost, ...prev])
    openWindow(newPost)
  }

  const allPosts = [...localPosts, ...propPosts]

  return (
    <div className="min-h-screen lowercase bg-[rgb(var(--bg))] text-[rgb(var(--text-primary))] transition-colors duration-300" data-scheme="primary">
      <header id="site-header" className="site-header sticky top-0 z-[9999] h-10 bg-[rgb(var(--bg))]/95 backdrop-blur-sm border-b border-[rgb(var(--border))]/50">
        <div className="flex items-center justify-between max-w-screen-3xl mx-auto px-3 sm:px-4 h-full relative">
          <a
            href="/"
            className="text-sm sm:text-base font-bold hover:opacity-80 transition-opacity tracking-tight flex-shrink-0"
            style={{ color: '#1e3a8a' }}
          >
            worldinmaking
          </a>

          <BreadcrumbNav />
        </div>
      </header>

      <main className="pt-0">{children}</main>

      <WindowManager />

      <BottomStickyNav
        onMenuClick={() => setMenuOpen(!menuOpen)}
        menuOpen={menuOpen}
        onSearchClick={openSearch}
        onCreateClick={() => setCreatePostOpen(true)}
      />

      {/* Floating Blob Nav - Main navigation */}
      <FloatingBlobNav
        onSearchClick={openSearch}
        onCreateClick={() => setCreatePostOpen(true)}
      />

      <PopoverMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <footer className="bg-[#151515] text-white mt-20">
        <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <span className="text-lg font-semibold">worldinmaking</span>
              </div>
              <p className="text-light-9 text-sm leading-relaxed">
                building the future, one step at a time.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-xs tracking-wider text-light-9">products</h4>
              <ul className="space-y-2 text-sm list-none m-0 p-0">
                <li><a href="/features" className="text-light-10 hover:text-white transition-colors">features</a></li>
                <li><a href="/pricing" className="text-light-10 hover:text-white transition-colors">pricing</a></li>
                <li><a href="/docs" className="text-light-10 hover:text-white transition-colors">documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-xs tracking-wider text-light-9">community</h4>
              <ul className="space-y-2 text-sm list-none m-0 p-0">
                <li><a href="/blog" className="text-light-10 hover:text-white transition-colors">blog</a></li>
                <li><a href="/changelog" className="text-light-10 hover:text-white transition-colors">changelog</a></li>
                <li><a href="/roadmap" className="text-light-10 hover:text-white transition-colors">roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-xs tracking-wider text-light-9">company</h4>
              <ul className="space-y-2 text-sm list-none m-0 p-0">
                <li><a href="/about" className="text-light-10 hover:text-white transition-colors">about</a></li>
                <li><a href="/careers" className="text-light-10 hover:text-white transition-colors">careers</a></li>
                <li><a href="/contact" className="text-light-10 hover:text-white transition-colors">contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-xs tracking-wider text-light-9">legal</h4>
              <ul className="space-y-2 text-sm list-none m-0 p-0">
                <li><a href="/privacy" className="text-light-10 hover:text-white transition-colors">privacy</a></li>
                <li><a href="/terms" className="text-light-10 hover:text-white transition-colors">terms</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-light-9 text-sm">
              © 2025 worldinmaking. all rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="https://twitter.com" className="text-light-9 hover:text-white transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="https://github.com" className="text-light-9 hover:text-white transition-colors" aria-label="GitHub">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
              <a href="https://linkedin.com" className="text-light-9 hover:text-white transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="https://youtube.com" className="text-light-9 hover:text-white transition-colors" aria-label="YouTube">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={closeSearch}
        posts={allPosts}
        onSelectPost={handleSearchSelect}
      />

      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onCreatePost={handleCreatePost}
      />
    </div>
  )
}

// Main Layout Component - Wraps everything with providers
export default function Layout({ children, posts = [] }) {
  return (
    <AuthProvider>
      <WindowProvider posts={posts}>
        <LayoutInner posts={posts}>
          {children}
        </LayoutInner>
      </WindowProvider>
    </AuthProvider>
  )
}

// Export useWindows for use in page components
export { useWindows }
