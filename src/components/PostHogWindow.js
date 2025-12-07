import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════════
// POSTHOG EXACT REPLICA - WINDOW COMPONENT
// Based on: ReaderView, HeaderBar, OSButton, TreeMenu from PostHog.com
// Uses data-scheme pattern for theming (primary/secondary)
// ═══════════════════════════════════════════════════════════════════════════════

// PostHog Icons - Exact SVG replicas
const Icons = {
    Home: ({ className = "size-5" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    ),
    ChevronLeft: ({ className = "size-5" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    ChevronRight: ({ className = "size-5" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    ),
    ChevronDown: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
    SidebarOpen: ({ className = "size-5" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" />
        </svg>
    ),
    SidebarClose: ({ className = "size-5" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><path d="m14 9-3 3 3 3" />
        </svg>
    ),
    TableOfContents: ({ className = "size-5" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
        </svg>
    ),
    Search: ({ className = "size-5" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    Document: ({ className = "size-5" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    ),
    X: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    Minus: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    Expand: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
        </svg>
    ),
    Collapse: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
        </svg>
    ),
    ArrowLeft: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    ),
    Gear: ({ className = "size-5" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    Comment: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    ),
    Send: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    ),
    Heart: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    HeartFilled: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    Reply: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
    ),
    User: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    ),
    Calendar: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    Clock: ({ className = "size-4" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    ),
}

// OSButton - Exact replica from PostHog.com with proper styling
// ZoomHover - PostHog'un buton hover efekti
const ZoomHover = ({ children, size = 'md', className = '' }) => {
    const scaleClasses = {
        xs: 'hover:scale-[1.02]',
        sm: 'hover:scale-[1.03]',
        md: 'hover:scale-[1.04]',
        lg: 'hover:scale-[1.05]',
    }

    return (
        <span className={`inline-block transition-transform duration-100 ${scaleClasses[size] || scaleClasses.md} ${className}`}>
            {children}
        </span>
    )
}

// OSButton - PostHog exact replica with ZoomHover
const OSButton = ({
    children,
    icon,
    onClick,
    active,
    disabled,
    className = "",
    size = "md",
    tooltip,
    variant = 'default',
    align = 'center',
    width = 'auto',
    hover = 'border',
    iconClassName = '',
}) => {
    const baseClasses = 'relative items-center rounded border text-primary transition-colors disabled:text-muted disabled:cursor-not-allowed'

    const sizeClasses = {
        xs: 'px-1 py-0.5 text-xs gap-0.5 rounded',
        sm: 'px-1 py-0.5 text-[13px] gap-1 rounded',
        md: 'px-1.5 py-1 gap-1 rounded text-sm',
        lg: 'px-2 py-1.5 text-[15px] gap-1 rounded-[6px]',
        xl: 'px-2.5 py-2 text-base gap-1.5 rounded-[6px]',
    }

    const iconSizeClasses = {
        xs: 'size-3.5',
        sm: 'size-4',
        md: 'size-4',
        lg: 'size-5',
        xl: 'size-6',
    }

    const variantClasses = {
        default: `bg-transparent border-transparent ${active
                ? 'font-bold bg-accent/50 hover:border-border'
                : hover === 'border'
                    ? 'hover:border-border border-transparent'
                    : 'hover:bg-accent border-transparent'
            } ${hover === 'border'
                ? 'active:bg-accent/50'
                : 'active:bg-accent'
            } active:border-border`,
        primary: 'bg-text-primary text-bg border-transparent hover:opacity-90 active:opacity-100',
        secondary: 'bg-accent border-border hover:border-text-muted',
        ghost: 'bg-transparent border-transparent hover:bg-accent',
    }

    const alignClasses = {
        left: 'justify-start text-left',
        center: 'justify-center',
        right: 'justify-end',
    }

    const widthClasses = {
        auto: 'w-auto',
        full: 'w-full',
    }

    const buttonElement = (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                ${baseClasses}
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                ${alignClasses[align]}
                ${widthClasses[width]}
                inline-flex
                ${className}
            `}
            title={tooltip}
        >
            {icon && <span className={`flex items-center justify-center ${iconSizeClasses[size]} ${iconClassName} ${children ? 'opacity-70' : ''} flex-shrink-0`}>{icon}</span>}
            {children && <span className="min-w-0">{children}</span>}
        </button>
    )

    // Apply ZoomHover to default variant automatically (like PostHog)
    if (variant === 'default' && !disabled) {
        return <ZoomHover size={size === 'xl' ? 'lg' : size}>{buttonElement}</ZoomHover>
    }

    return buttonElement
}

// ScrollArea - PostHog style scrollable container
const ScrollArea = React.forwardRef(({ children, className = "" }, ref) => (
    <div ref={ref} className={`overflow-y-auto overflow-x-hidden scroll-smooth ${className}`}>
        {children}
    </div>
))

// TableOfContents - PostHog style with scroll spy
const TableOfContents = ({ items, activeId, onSelect, contentRef }) => {
    if (!items?.length) return null

    return (
        <div className="not-prose space-y-px pt-4">
            <h4 className="font-semibold text-muted m-0 mb-1 text-sm px-2 lowercase">go to:</h4>
            <ul className="list-none m-0 p-0 flex flex-col">
                {items.map((item, idx) => (
                    <li key={item.id || idx} className="relative leading-none m-0">
                        <button
                            onClick={() => onSelect?.(item.id)}
                            className={`
                                w-full text-left px-2 py-1.5 text-sm rounded lowercase
                                transition-all duration-200 hover:underline block
                                ${activeId === item.id
                                    ? 'text-primary font-semibold bg-accent'
                                    : 'text-muted hover:text-primary'
                                }
                            `}
                            style={{ paddingLeft: `${(item.depth || 0) * 16 + 8}px` }}
                        >
                            {(item.title || item.value)?.toLowerCase()}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// Parse HTML content to extract sections from h2/h3 headings
const parseContentToSections = (htmlContent) => {
    if (!htmlContent) return { sections: [], cleanContent: '' }

    const sections = []
    const headingRegex = /<h([23])[^>]*>(.*?)<\/h\1>/gi
    let match
    let index = 0

    while ((match = headingRegex.exec(htmlContent)) !== null) {
        const level = parseInt(match[1])
        const title = match[2].replace(/<[^>]*>/g, '').trim() // Strip inner HTML tags
        if (title) {
            sections.push({
                id: `section-${index}`,
                title,
                depth: level - 2, // h2 = 0, h3 = 1
            })
            index++
        }
    }

    // Add IDs to headings in content
    let cleanContent = htmlContent
    index = 0
    cleanContent = cleanContent.replace(/<h([23])([^>]*)>/gi, (match, level, attrs) => {
        const id = `section-${index}`
        index++
        return `<h${level}${attrs} id="${id}">`
    })

    return { sections, cleanContent }
}

// Main PostHogWindow Component
function PostHogWindow({
    post,
    onClose,
    zIndex,
    position,
    onFocus,
    isFocused,
    allPosts,
    onPostClick,
    onReadingChange,
    isNew,
    onSearchClick
}) {
    // Parse content to get sections
    const { sections: parsedSections, cleanContent } = parseContentToSections(post.content)

    // Check if mobile
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768
            setIsMobile(mobile)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // State
    const [pos, setPos] = useState(position || { x: 50, y: 40 })
    const [size, setSize] = useState({ width: 1200, height: 750 })
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [resizeDir, setResizeDir] = useState(null)
    const [isMaximized, setIsMaximized] = useState(false)
    const [isNavVisible, setIsNavVisible] = useState(false)  // Start closed
    const [isTocVisible, setIsTocVisible] = useState(false)  // Start closed
    const [activeSection, setActiveSection] = useState(parsedSections[0]?.id || null)
    const [canGoBack, setCanGoBack] = useState(false)
    const [canGoForward, setCanGoForward] = useState(false)
    const [history, setHistory] = useState([post.id])
    const [historyIndex, setHistoryIndex] = useState(0)
    const [isNavigating, setIsNavigating] = useState(false)

    // Open sidebars on desktop after mount
    useEffect(() => {
        if (!isMobile) {
            setIsNavVisible(true)
            setIsTocVisible(true)
        } else {
            setIsNavVisible(false)
            setIsTocVisible(false)
        }
    }, [isMobile])

    // Comment system state with localStorage persistence
    const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false)
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [replyingTo, setReplyingTo] = useState(null)
    const [replyText, setReplyText] = useState('')
    const [userName, setUserName] = useState('')
    const [showNamePrompt, setShowNamePrompt] = useState(false)
    const [pendingComment, setPendingComment] = useState(null)

    // Load comments from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storageKey = `comments_${post.id || post.slug || 'default'}`
            const saved = localStorage.getItem(storageKey)
            if (saved) {
                try {
                    const parsed = JSON.parse(saved)
                    // Convert timestamp strings back to Date objects
                    const withDates = parsed.map(c => ({
                        ...c,
                        timestamp: new Date(c.timestamp),
                        replies: c.replies?.map(r => ({
                            ...r,
                            timestamp: new Date(r.timestamp)
                        })) || []
                    }))
                    setComments(withDates)
                } catch (e) {
                    console.error('Failed to parse comments:', e)
                }
            }
            // Load saved username
            const savedName = localStorage.getItem('comment_username')
            if (savedName) setUserName(savedName)
        }
    }, [post.id, post.slug])

    // Save comments to localStorage when they change
    useEffect(() => {
        if (typeof window !== 'undefined' && comments.length > 0) {
            const storageKey = `comments_${post.id || post.slug || 'default'}`
            localStorage.setItem(storageKey, JSON.stringify(comments))
        }
    }, [comments, post.id, post.slug])

    // Comment functions
    const formatTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - date) / 1000)
        if (seconds < 60) return 'just now'
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        return `${days}d ago`
    }

    const handleAddComment = () => {
        if (!newComment.trim()) return

        // If no username, prompt for it
        if (!userName.trim()) {
            setPendingComment({ type: 'comment', content: newComment.trim() })
            setShowNamePrompt(true)
            return
        }

        const comment = {
            id: Date.now(),
            author: userName.trim().toLowerCase(),
            avatar: null,
            content: newComment.trim(),
            timestamp: new Date(),
            likes: 0,
            liked: false,
            replies: []
        }
        setComments([comment, ...comments])
        setNewComment('')
    }

    const handleAddReply = (parentId) => {
        if (!replyText.trim()) return

        // If no username, prompt for it
        if (!userName.trim()) {
            setPendingComment({ type: 'reply', content: replyText.trim(), parentId })
            setShowNamePrompt(true)
            return
        }

        const reply = {
            id: Date.now(),
            author: userName.trim().toLowerCase(),
            avatar: null,
            content: replyText.trim(),
            timestamp: new Date(),
            likes: 0,
            liked: false,
        }
        setComments(comments.map(c =>
            c.id === parentId
                ? { ...c, replies: [...c.replies, reply] }
                : c
        ))
        setReplyText('')
        setReplyingTo(null)
    }

    const handleLike = (commentId, isReply = false, parentId = null) => {
        if (isReply && parentId) {
            setComments(comments.map(c =>
                c.id === parentId
                    ? {
                        ...c,
                        replies: c.replies.map(r =>
                            r.id === commentId
                                ? { ...r, liked: !r.liked, likes: r.liked ? r.likes - 1 : r.likes + 1 }
                                : r
                        )
                    }
                    : c
            ))
        } else {
            setComments(comments.map(c =>
                c.id === commentId
                    ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 }
                    : c
            ))
        }
    }

    // Handle name submission for pending comment
    const handleNameSubmit = (name) => {
        if (!name.trim()) return

        const trimmedName = name.trim().toLowerCase()
        setUserName(trimmedName)
        localStorage.setItem('comment_username', trimmedName)
        setShowNamePrompt(false)

        if (pendingComment) {
            if (pendingComment.type === 'comment') {
                const comment = {
                    id: Date.now(),
                    author: trimmedName,
                    avatar: null,
                    content: pendingComment.content,
                    timestamp: new Date(),
                    likes: 0,
                    liked: false,
                    replies: []
                }
                setComments(prev => [comment, ...prev])
                setNewComment('')
            } else if (pendingComment.type === 'reply') {
                const reply = {
                    id: Date.now(),
                    author: trimmedName,
                    avatar: null,
                    content: pendingComment.content,
                    timestamp: new Date(),
                    likes: 0,
                    liked: false,
                }
                setComments(prev => prev.map(c =>
                    c.id === pendingComment.parentId
                        ? { ...c, replies: [...c.replies, reply] }
                        : c
                ))
                setReplyText('')
                setReplyingTo(null)
            }
            setPendingComment(null)
        }
    }

    // Delete comment
    const handleDeleteComment = (commentId, isReply = false, parentId = null) => {
        if (isReply && parentId) {
            setComments(prev => prev.map(c =>
                c.id === parentId
                    ? { ...c, replies: c.replies.filter(r => r.id !== commentId) }
                    : c
            ))
        } else {
            setComments(prev => prev.filter(c => c.id !== commentId))
        }
    }

    const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)

    // Refs
    const dragOffset = useRef({ x: 0, y: 0 })
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 })
    const contentRef = useRef(null)
    const windowRef = useRef(null)

    // Position sync
    useEffect(() => {
        if (position && !isDragging) setPos(position)
    }, [position, isDragging])

    // Scroll spy for TOC
    useEffect(() => {
        if (!contentRef.current || !parsedSections.length) return

        const handleScroll = () => {
            const container = contentRef.current
            if (!container) return

            for (let i = parsedSections.length - 1; i >= 0; i--) {
                const el = container.querySelector(`#${parsedSections[i].id}`)
                if (el && el.getBoundingClientRect().top <= 150) {
                    setActiveSection(parsedSections[i].id)
                    return
                }
            }
            setActiveSection(parsedSections[0]?.id)
        }

        const container = contentRef.current
        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [parsedSections])

    // Navigation
    const goBack = useCallback(() => {
        if (historyIndex > 0) {
            setIsNavigating(true)
            const newIndex = historyIndex - 1
            setHistoryIndex(newIndex)
            const prevPostId = history[newIndex]
            const prevPost = allPosts?.find(p => p.id === prevPostId)
            if (prevPost) onPostClick?.(prevPost)
            // Reset navigating flag after a short delay
            setTimeout(() => setIsNavigating(false), 100)
        }
    }, [historyIndex, history, allPosts, onPostClick])

    const goForward = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setIsNavigating(true)
            const newIndex = historyIndex + 1
            setHistoryIndex(newIndex)
            const nextPostId = history[newIndex]
            const nextPost = allPosts?.find(p => p.id === nextPostId)
            if (nextPost) onPostClick?.(nextPost)
            // Reset navigating flag after a short delay
            setTimeout(() => setIsNavigating(false), 100)
        }
    }, [historyIndex, history, allPosts, onPostClick])

    // Update history when post changes (but not when navigating via back/forward)
    useEffect(() => {
        if (isNavigating) return

        // Only add to history if this is a new post (not already at current position)
        if (history[historyIndex] !== post.id) {
            // Truncate forward history and add new post
            const newHistory = [...history.slice(0, historyIndex + 1), post.id]
            setHistory(newHistory)
            setHistoryIndex(newHistory.length - 1)
        }
    }, [post.id])

    useEffect(() => {
        setCanGoBack(historyIndex > 0)
        setCanGoForward(historyIndex < history.length - 1)
    }, [historyIndex, history])

    // Drag handlers
    const handleDragStart = (e) => {
        if (e.target.closest('button') || e.target.closest('a') || isMaximized) return
        setIsDragging(true)
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
        onFocus?.()
    }

    useEffect(() => {
        if (!isDragging) return
        const move = (e) => setPos({ x: Math.max(0, e.clientX - dragOffset.current.x), y: Math.max(0, e.clientY - dragOffset.current.y) })
        const up = () => setIsDragging(false)
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)
        return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    }, [isDragging])

    // Resize handlers
    const startResize = (e, dir) => {
        e.stopPropagation()
        setIsResizing(true)
        setResizeDir(dir)
        resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height, px: pos.x, py: pos.y }
    }

    useEffect(() => {
        if (!isResizing) return
        const move = (e) => {
            const dx = e.clientX - resizeStart.current.x
            const dy = e.clientY - resizeStart.current.y
            let w = resizeStart.current.w, h = resizeStart.current.h, x = resizeStart.current.px, y = resizeStart.current.py

            if (resizeDir.includes('e')) w = Math.max(800, resizeStart.current.w + dx)
            if (resizeDir.includes('w')) { w = Math.max(800, resizeStart.current.w - dx); x = resizeStart.current.px + dx }
            if (resizeDir.includes('s')) h = Math.max(500, resizeStart.current.h + dy)
            if (resizeDir.includes('n')) { h = Math.max(500, resizeStart.current.h - dy); y = resizeStart.current.py + dy }

            setSize({ width: w, height: h })
            setPos({ x, y })
        }
        const up = () => { setIsResizing(false); setResizeDir(null) }
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)
        return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    }, [isResizing, resizeDir])

    // Toggle maximize
    const toggleMaximize = () => {
        if (isMaximized) {
            setPos({ x: 50, y: 40 })
            setSize({ width: 1200, height: 750 })
        } else {
            setPos({ x: 0, y: 0 })
            setSize({ width: window.innerWidth, height: window.innerHeight })
        }
        setIsMaximized(!isMaximized)
    }

    // Scroll to section
    const scrollToSection = (sectionId) => {
        const el = contentRef.current?.querySelector(`#${sectionId}`)
        if (el && contentRef.current) {
            contentRef.current.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' })
            setActiveSection(sectionId)
        }
    }

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    // Mobile always fullscreen
    const effectiveMaximized = isMobile || isMaximized

    return (
        <motion.div
            ref={windowRef}
            data-scheme="tertiary"
            initial={{ opacity: 0, scale: 0.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.08 }}
            transition={{
                duration: 0.2,
                ease: [0.2, 0.2, 0.8, 1]
            }}
            className={`
                fixed flex flex-col overflow-hidden bg-bg
                ${isFocused ? 'shadow-2xl border-border' : 'shadow-lg border-input'}
                ${effectiveMaximized ? '' : 'border rounded-lg'}
            `}
            style={{
                top: isMobile ? 40 : (effectiveMaximized ? 0 : pos.y),
                left: isMobile ? 0 : (effectiveMaximized ? 0 : pos.x),
                width: isMobile ? '100vw' : (effectiveMaximized ? '100vw' : size.width),
                height: isMobile ? 'calc(100vh - 40px)' : (effectiveMaximized ? '100vh' : size.height),
                zIndex: zIndex || 100,
            }}
            onClick={() => onFocus?.()}
        >
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* TITLE BAR - PostHog AppWindow exact title bar style - Responsive             */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            <div
                data-scheme="tertiary"
                className="flex-shrink-0 w-full flex md:grid grid-cols-[minmax(100px,auto)_1fr_minmax(100px,auto)] gap-0.5 sm:gap-1 items-center py-0.5 pl-1 sm:pl-1.5 pr-0.5 bg-primary/50 backdrop-blur-3xl border-b border-primary"
                style={{ cursor: effectiveMaximized ? 'default' : 'move' }}
                onMouseDown={!isMobile ? handleDragStart : undefined}
                onDoubleClick={!isMobile ? toggleMaximize : undefined}
            >
                {/* Left section - File menu */}
                <div className="flex items-center gap-px">
                    {/* File Menu Button */}
                    <button className="group flex items-center gap-0.5 px-1 sm:px-1.5 py-1 rounded text-primary hover:bg-accent transition-colors">
                        <Icons.Document className="size-4 sm:size-5" />
                        <Icons.ChevronDown className="size-3.5 sm:size-4 -mx-0.5 text-muted group-hover:text-primary" />
                    </button>
                </div>

                {/* Center section - Title */}
                <div className="flex-1 truncate flex items-center justify-start md:justify-center">
                    <button
                        onClick={() => {
                            if (contentRef.current) {
                                contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                        }}
                        className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-semibold text-primary hover:text-primary select-none max-w-full"
                    >
                        <span className="truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[300px] md:max-w-none">{post.title}</span>
                    </button>
                </div>

                {/* Right section - Window controls */}
                <div className="flex justify-end items-center gap-px">
                    {!isMobile && (
                        <>
                            <OSButton
                                size="xs"
                                icon={<Icons.Minus className="size-4 relative top-1" />}
                                tooltip="Minimize"
                                onClick={() => onClose?.()}
                            />
                            <OSButton
                                size="xs"
                                icon={isMaximized ? <Icons.Collapse className="size-5" /> : <Icons.Expand className="size-5" />}
                                onClick={toggleMaximize}
                                tooltip={isMaximized ? "Restore" : "Maximize"}
                            />
                        </>
                    )}
                    <OSButton
                        size="md"
                        icon={<Icons.X />}
                        onClick={(e) => { e.stopPropagation(); onClose?.() }}
                        tooltip="Close window"
                    />
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* HEADER BAR - PostHog exact HeaderBar pattern with nav toggles - Responsive    */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            <div data-scheme="secondary" className="bg-primary flex w-full gap-px p-1.5 sm:p-2 flex-shrink-0 items-center">
                {/* Left section - Sidebar toggle and navigation */}
                <div className={`flex-shrink-0 flex items-center gap-px transition-all min-w-0 ${isNavVisible && !isMobile ? 'md:min-w-[250px]' : 'w-auto'}`}>
                    {/* Home button */}
                    <OSButton
                        size="md"
                        icon={<Icons.Home />}
                        tooltip="Home"
                        onClick={() => {
                            if (contentRef.current) {
                                contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                        }}
                    />

                    {/* Sidebar toggle - now works on mobile too */}
                    <OSButton
                        size="md"
                        onClick={() => setIsNavVisible(!isNavVisible)}
                        active={isNavVisible}
                        icon={isNavVisible ? <Icons.SidebarOpen /> : <Icons.SidebarClose />}
                        tooltip={isNavVisible ? 'Hide sidebar' : 'Show sidebar'}
                    />
                </div>

                {/* Center section - Back/Forward navigation */}
                <div className="flex-grow flex justify-between items-center">
                    <div className="flex items-center gap-px">
                        <OSButton
                            size="md"
                            disabled={!canGoBack}
                            onClick={goBack}
                            icon={<Icons.ChevronLeft />}
                            tooltip="Back"
                        />
                        <OSButton
                            size="md"
                            disabled={!canGoForward}
                            onClick={goForward}
                            icon={<Icons.ChevronRight />}
                            tooltip="Forward"
                        />
                    </div>

                    {/* Right side - Search */}
                    <div className="flex items-center gap-0.5 relative">
                        <OSButton
                            size="md"
                            icon={<Icons.Search />}
                            tooltip="Search posts (Ctrl+K)"
                            onClick={() => onSearchClick?.()}
                        />
                    </div>
                </div>

                {/* Right section - TOC toggle */}
                {parsedSections.length > 0 && (
                    <div className={`flex-shrink-0 flex justify-end transition-all min-w-0 ${isTocVisible && !isMobile ? 'lg:min-w-[250px]' : 'w-auto'}`}>
                        <OSButton
                            size="md"
                            icon={<Icons.TableOfContents />}
                            active={isTocVisible}
                            onClick={() => setIsTocVisible(!isTocVisible)}
                            tooltip={isTocVisible ? 'Hide table of contents' : 'Show table of contents'}
                        />
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* MAIN CONTENT AREA - PostHog ReaderView exact layout with container queries   */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            <div data-scheme="secondary" className="@container/app-reader bg-primary flex w-full gap-2 min-h-0 flex-grow relative">

                {/* Left Sidebar - Navigation */}
                <AnimatePresence>
                    {isNavVisible && (
                        <>
                            {/* Backdrop for mobile overlay */}
                            {isMobile && (
                                <motion.div
                                    className="fixed inset-0 bg-black/50 z-40"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1, transition: { duration: 0.2 } }}
                                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                    onClick={() => setIsNavVisible(false)}
                                />
                            )}

                            {/* Sidebar - overlay on mobile, normal flow on desktop */}
                            <motion.div
                                id="nav"
                                className={`flex-shrink-0 overflow-hidden text-primary
                                    ${isMobile
                                        ? 'fixed left-0 top-0 bottom-0 z-50 shadow-2xl'
                                        : 'relative'
                                    }`}
                                initial={{ width: isMobile ? 280 : 250, x: -280 }}
                                animate={{ width: isMobile ? 280 : 250, x: 0, transition: { duration: 0.2 } }}
                                exit={{ width: isMobile ? 280 : 250, x: isMobile ? -280 : -250, transition: { duration: 0.2 } }}
                            >
                                <motion.div
                                    className={`h-full bg-bg ${isMobile ? 'pt-4' : ''}`}
                                    initial={{ opacity: 1 }}
                                    animate={{ opacity: 1, transition: { duration: 0.05, delay: 0.2 } }}
                                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                                >
                                    <ScrollArea className="px-4 h-full">
                                        {/* Close button on mobile */}
                                        {isMobile && (
                                            <div className="flex justify-end mb-2">
                                                <OSButton
                                                    size="sm"
                                                    icon={<Icons.X className="size-4" />}
                                                    onClick={() => setIsNavVisible(false)}
                                                />
                                            </div>
                                        )}

                                        {/* Back link */}
                                        <div className="mb-4">
                                            <OSButton
                                                align="left"
                                                width="full"
                                                size="md"
                                                hover="background"
                                                icon={<Icons.ArrowLeft className="size-4" />}
                                                onClick={() => onClose?.()}
                                            >
                                                back to blog
                                            </OSButton>
                                        </div>

                                        {/* Suggested Posts - 10 posts */}
                                        <div className="mb-4">
                                            <div className="text-muted text-sm py-0.5 mt-2 ml-2 lowercase">
                                                suggested posts
                                            </div>
                                            <div className="not-prose space-y-px">
                                                {allPosts?.filter(p => p.id !== post.id).slice(0, 10).map(p => (
                                                    <OSButton
                                                        key={p.id}
                                                        active={p.id === post.id}
                                                        align="left"
                                                        width="full"
                                                        size="md"
                                                        hover="background"
                                                        onClick={() => onPostClick?.(p)}
                                                        icon={<Icons.Document className="size-4 opacity-60 flex-shrink-0" />}
                                                    >
                                                        <span className="lowercase line-clamp-2 text-left" title={p.title?.toLowerCase()}>{p.title?.toLowerCase()}</span>
                                                    </OSButton>
                                                ))}
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </motion.div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Main Content - PostHog ReaderView exact ScrollArea pattern */}
                <ScrollArea
                    ref={contentRef}
                    data-scheme="primary"
                    className={`bg-primary border border-primary flex-grow
                        ${isNavVisible && !isMobile ? '@2xl/app-reader:rounded-l border-l-0' : ''}
                        ${isTocVisible && parsedSections.length > 0 && !isMobile
                            ? 'rounded-r-0 border-r-0 @4xl/app-reader:rounded-r @4xl/app-reader:border-r'
                            : 'border-r-0'
                        }
                    `}
                >
                    <article className="reader-view-content-container @container/reader-content-container prose-core max-w-none relative">
                        <div className="@container/reader-content relative p-4 @md/reader-content-container:px-6 @lg/reader-content-container:px-8">
                            {/* Breadcrumb - PostHog responsive */}
                            <nav className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 text-[11px] sm:text-[13px] mx-auto max-w-2xl lowercase">
                                <span className="text-primary font-medium">blog</span>
                                <Icons.ChevronRight className="size-3.5 sm:size-4 text-muted opacity-50" />
                                <span className="text-muted truncate max-w-[150px] sm:max-w-none">{(post.categories?.[0]?.name || post.category || 'article')?.toLowerCase()}</span>
                            </nav>

                            {/* Tags & Word Count */}
                            {(post.categories?.length > 0 || post.category) && (
                                <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4 mx-auto max-w-2xl">
                                    <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded-md bg-accent text-secondary lowercase">
                                        {(post.categories?.[0]?.name || post.category)?.toLowerCase()}
                                    </span>
                                    <span className="text-[10px] sm:text-[11px] text-muted lowercase">
                                        {post.content ? `${post.content.split(/\s+/).length} words` : ''}
                                    </span>
                                </div>
                            )}

                            {/* Title - PostHog responsive with max-w-2xl */}
                            <h1 className="text-lg xs:text-xl sm:text-2xl md:text-[28px] lg:text-[32px] font-semibold text-primary leading-tight tracking-tight mb-3 sm:mb-4 md:mb-6 mx-auto max-w-2xl transition-all lowercase">
                                {post.title?.toLowerCase()}
                            </h1>

                            {/* Author & Meta - Simple Style */}
                            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-primary mx-auto max-w-2xl transition-all">
                                <div className="flex items-center gap-2.5 sm:gap-3">
                                    {/* Author Avatar - show image or initial */}
                                    {post.author?.avatar || post.author?.image ? (
                                        <img
                                            src={post.author?.avatar || post.author?.image}
                                            alt={typeof post.author === 'string' ? post.author : post.author?.name}
                                            className="size-8 sm:size-9 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="size-8 sm:size-9 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm sm:text-base uppercase">
                                            {(typeof post.author === 'string' ? post.author : post.author?.name)?.[0]?.toUpperCase() || 'A'}
                                        </div>
                                    )}
                                    <div>
                                        <span className="block text-[12px] sm:text-[13px] font-semibold text-primary lowercase">
                                            {(typeof post.author === 'string' ? post.author : post.author?.name || 'anonymous')?.toLowerCase()}
                                        </span>
                                        <span className="text-[11px] sm:text-[12px] text-secondary lowercase">
                                            {formatDate(post.postDate || post.pubDate)?.toLowerCase()} · {(post.readTime || '5 min read')?.toLowerCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Featured Image - not-prose */}
                            {(post.featuredImage || post.image) && (
                                <div className="not-prose mb-6 relative mx-auto max-w-2xl transition-all">
                                    <div className="text-center">
                                        <img
                                            src={post.featuredImage || post.image}
                                            alt={post.title}
                                            className="w-full rounded border border-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Content - PostHog exact prose classes with reader-content-container */}
                            <div className="reader-content-container">
                                <div
                                    className="@container [&>*:not(.OSTable):not(.Table)]:mx-auto [&>*:not(.OSTable):not(.Table)]:transition-all [&>*:not(.OSTable):not(.Table)]:max-w-2xl
                                        prose dark:prose-invert text-black
                                        prose-a:underline prose-a:font-semibold
                                        prose-p:leading-normal
                                        prose-li:leading-normal
                                        prose-h1:tracking-tight prose-h1:text-3xl prose-h1:mt-0 prose-h1:mb-2
                                        prose-h2:tracking-tight
                                        prose-h3:tracking-tight
                                        prose-img:m-0
                                        prose-sm prose-h1:text-2xl"
                                    dangerouslySetInnerHTML={{ __html: cleanContent || post.content || '<p>Content coming soon...</p>' }}
                                />
                            </div>

                            {/* Tags Footer */}
                            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-primary mx-auto max-w-2xl transition-all">
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {[post.categories?.[0]?.name || post.category, 'blog', 'worldinmaking'].filter(Boolean).map(tag => (
                                        <span key={tag} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-accent text-secondary text-[11px] sm:text-[12px] font-medium rounded-md lowercase">
                                            #{tag?.toLowerCase()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </article>
                </ScrollArea>

                {/* Right Sidebar - TOC */}
                <AnimatePresence>
                    {isTocVisible && parsedSections.length > 0 && (
                        <>
                            {/* Backdrop for mobile TOC */}
                            {isMobile && (
                                <motion.div
                                    className="fixed inset-0 bg-black/50 z-40"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1, transition: { duration: 0.2 } }}
                                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                    onClick={() => setIsTocVisible(false)}
                                />
                            )}

                            <motion.div
                                id="toc"
                                className={`flex-shrink-0 overflow-hidden
                                    ${isMobile
                                        ? 'fixed right-0 top-0 bottom-0 z-50 shadow-2xl'
                                        : 'relative'
                                    }`}
                                initial={{ width: isMobile ? 280 : 250, x: isMobile ? 280 : 0 }}
                                animate={{ width: isMobile ? 280 : 250, x: 0, transition: { duration: 0.2 } }}
                                exit={{ width: isMobile ? 280 : 250, x: isMobile ? 280 : 0, transition: { duration: 0.2 } }}
                            >
                                <motion.div
                                    className={`h-full bg-bg ${isMobile ? 'pt-4' : ''}`}
                                    initial={{ opacity: 1 }}
                                    animate={{ opacity: 1, transition: { duration: 0.05, delay: 0.2 } }}
                                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                                >
                                    <ScrollArea className="px-2 h-full">
                                        {/* Close button on mobile */}
                                        {isMobile && (
                                            <div className="flex justify-end mb-2 px-2">
                                                <OSButton
                                                    size="sm"
                                                    icon={<Icons.X className="size-4" />}
                                                    onClick={() => setIsTocVisible(false)}
                                                />
                                            </div>
                                        )}
                                        <TableOfContents
                                            items={parsedSections}
                                            activeId={activeSection}
                                            onSelect={(id) => {
                                                scrollToSection(id)
                                                if (isMobile) setIsTocVisible(false)
                                            }}
                                            contentRef={contentRef}
                                        />
                                    </ScrollArea>
                                </motion.div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* COMMENT PANEL - Slides up from bottom                                        */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isCommentPanelOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: isMobile ? '70vh' : '50vh', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="flex-shrink-0 border-t border-primary bg-bg overflow-hidden"
                    >
                        <div className="h-full flex flex-col">
                            {/* Name Prompt Modal */}
                            {showNamePrompt && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                                    <div className="bg-bg border border-primary rounded-xl p-4 w-[300px] shadow-xl">
                                        <h3 className="text-[14px] font-semibold text-primary mb-3">enter your name</h3>
                                        <input
                                            type="text"
                                            placeholder="your name..."
                                            className="w-full px-3 py-2 text-[13px] bg-accent border border-primary rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-border mb-3"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleNameSubmit(e.target.value)
                                                } else if (e.key === 'Escape') {
                                                    setShowNamePrompt(false)
                                                    setPendingComment(null)
                                                }
                                            }}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setShowNamePrompt(false)
                                                    setPendingComment(null)
                                                }}
                                                className="px-3 py-1.5 text-[12px] font-medium rounded-md text-muted hover:bg-accent transition-colors"
                                            >
                                                cancel
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    const input = e.target.closest('.bg-bg').querySelector('input')
                                                    handleNameSubmit(input.value)
                                                }}
                                                className="px-3 py-1.5 text-[12px] font-semibold rounded-md bg-[rgb(var(--text-primary))] text-[rgb(var(--bg))] hover:opacity-90 transition-all"
                                            >
                                                submit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Comment Panel Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-primary">
                                <div className="flex items-center gap-2">
                                    <Icons.Comment className="size-4 text-muted" />
                                    <span className="text-[13px] font-semibold text-primary lowercase">
                                        {totalComments} {totalComments === 1 ? 'comment' : 'comments'} · add comment
                                    </span>
                                    {userName && (
                                        <span className="text-[11px] text-muted ml-2 lowercase">
                                            commenting as <span className="font-medium text-secondary">{userName}</span>
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsCommentPanelOpen(false)}
                                    className="p-1.5 rounded-md hover:bg-accent transition-colors"
                                >
                                    <Icons.X className="size-4 text-muted" />
                                </button>
                            </div>

                            {/* Comment Input */}
                            <div className="px-4 py-3 border-b border-primary">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 size-8 rounded-full bg-[rgb(var(--text-primary))] flex items-center justify-center">
                                        {userName ? (
                                            <span className="text-[12px] font-semibold text-[rgb(var(--bg))]">
                                                {userName[0].toUpperCase()}
                                            </span>
                                        ) : (
                                            <Icons.User className="size-4 text-[rgb(var(--bg))]" />
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder={userName ? `comment as ${userName}...` : "write a comment..."}
                                            className="w-full px-3 py-2 text-[13px] bg-accent border border-primary rounded-lg text-primary placeholder-muted resize-none focus:outline-none focus:ring-1 focus:ring-border"
                                            rows={2}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleAddComment()
                                                }
                                            }}
                                        />
                                        <div className="flex justify-end mt-2">
                                            <button
                                                onClick={handleAddComment}
                                                disabled={!newComment.trim()}
                                                className="px-3 py-1.5 text-[12px] font-semibold rounded-md bg-[rgb(var(--text-primary))] text-[rgb(var(--bg))] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                                            >
                                                <Icons.Send className="size-3" />
                                                send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Comments List */}
                            <ScrollArea className="flex-grow px-4 py-3">
                                <div className="space-y-4">
                                    {comments.length === 0 ? (
                                        <div className="text-center py-8 text-muted text-[13px]">
                                            no comments yet. be the first to comment!
                                        </div>
                                    ) : (
                                        comments.map(comment => (
                                            <div key={comment.id} className="group">
                                                {/* Main Comment */}
                                                <div className="flex gap-3">
                                                    <div className="flex-shrink-0 size-8 rounded-full bg-[rgb(var(--text-muted))] flex items-center justify-center text-[rgb(var(--bg))] text-[11px] font-semibold">
                                                        {comment.author[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[13px] font-semibold text-primary">{comment.author}</span>
                                                            <span className="text-[11px] text-muted">{formatTimeAgo(comment.timestamp)}</span>
                                                            {comment.author === userName && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    className="text-[10px] text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                >
                                                                    delete
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-[13px] text-secondary leading-relaxed">{comment.content}</p>
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <button
                                                                onClick={() => handleLike(comment.id)}
                                                                className={`flex items-center gap-1 text-[11px] transition-colors ${comment.liked ? 'text-[rgb(var(--text-primary))]' : 'text-muted hover:text-secondary'}`}
                                                            >
                                                                {comment.liked ? <Icons.HeartFilled className="size-3" /> : <Icons.Heart className="size-3" />}
                                                                {comment.likes > 0 && comment.likes}
                                                            </button>
                                                            <button
                                                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                                                className="flex items-center gap-1 text-[11px] text-muted hover:text-secondary transition-colors"
                                                            >
                                                                <Icons.Reply className="size-3" />
                                                                reply
                                                            </button>
                                                        </div>

                                                        {/* Reply Input */}
                                                        {replyingTo === comment.id && (
                                                            <div className="mt-3 flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={replyText}
                                                                    onChange={(e) => setReplyText(e.target.value)}
                                                                    placeholder="write a reply..."
                                                                    className="flex-grow px-3 py-1.5 text-[12px] bg-accent border border-primary rounded-md text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-border"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleAddReply(comment.id)
                                                                        }
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => handleAddReply(comment.id)}
                                                                    disabled={!replyText.trim()}
                                                                    className="px-2 py-1.5 text-[11px] font-semibold rounded-md bg-[rgb(var(--text-primary))] text-[rgb(var(--bg))] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    reply
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Replies */}
                                                        {comment.replies?.length > 0 && (
                                                            <div className="mt-3 pl-4 border-l-2 border-primary space-y-3">
                                                                {comment.replies.map(reply => (
                                                                    <div key={reply.id} className="flex gap-2 group/reply">
                                                                        <div className="flex-shrink-0 size-6 rounded-full bg-[rgb(var(--border))] flex items-center justify-center text-[rgb(var(--text-primary))] text-[10px] font-semibold">
                                                                            {reply.author[0].toUpperCase()}
                                                                        </div>
                                                                        <div className="flex-grow min-w-0">
                                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                                <span className="text-[12px] font-semibold text-primary">{reply.author}</span>
                                                                                <span className="text-[10px] text-muted">{formatTimeAgo(reply.timestamp)}</span>
                                                                                {reply.author === userName && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteComment(reply.id, true, comment.id)}
                                                                                        className="text-[10px] text-muted hover:text-red-500 transition-colors opacity-0 group-hover/reply:opacity-100"
                                                                                    >
                                                                                        delete
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-[12px] text-secondary leading-relaxed">{reply.content}</p>
                                                                            <button
                                                                                onClick={() => handleLike(reply.id, true, comment.id)}
                                                                                className={`flex items-center gap-1 mt-1 text-[10px] transition-colors ${reply.liked ? 'text-[rgb(var(--text-primary))]' : 'text-muted hover:text-secondary'}`}
                                                                            >
                                                                                {reply.liked ? <Icons.HeartFilled className="size-2.5" /> : <Icons.Heart className="size-2.5" />}
                                                                                {reply.likes > 0 && reply.likes}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* FOOTER BAR - PostHog style with comment button                               */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            <div
                data-scheme="secondary"
                className={`flex items-center gap-px p-2 flex-shrink-0 bg-primary border-t border-primary rounded-b ${isMobile ? 'pb-safe' : ''}`}
            >
                {!isMobile && (
                    <motion.div
                        className="flex-shrink-0"
                        animate={{ minWidth: isNavVisible ? 250 : 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}

                <div className="flex-grow flex justify-end items-center">
                    <button
                        onClick={() => setIsCommentPanelOpen(!isCommentPanelOpen)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors lowercase ${isCommentPanelOpen ? 'bg-accent text-primary' : 'text-primary hover:bg-accent'}`}
                    >
                        <Icons.Comment className="size-4" />
                        <span>{totalComments} {totalComments === 1 ? 'comment' : 'comments'} · add comment</span>
                    </button>
                </div>

                {!isMobile && (
                    <motion.div
                        className="flex-shrink-0"
                        animate={{ minWidth: isTocVisible && parsedSections.length ? 250 : 'auto' }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </div>

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* RESIZE HANDLES - Hidden on mobile                                            */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {!effectiveMaximized && !isMobile && (
                <>
                    {['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'].map(dir => (
                        <div
                            key={dir}
                            role="presentation"
                            onMouseDown={(e) => startResize(e, dir)}
                            className="absolute hidden md:block"
                            style={{
                                ...(dir === 'n' && { top: 0, left: 12, right: 12, height: 6, cursor: 'n-resize' }),
                                ...(dir === 's' && { bottom: 0, left: 12, right: 12, height: 6, cursor: 's-resize' }),
                                ...(dir === 'e' && { right: 0, top: 12, bottom: 12, width: 6, cursor: 'e-resize' }),
                                ...(dir === 'w' && { left: 0, top: 12, bottom: 12, width: 6, cursor: 'w-resize' }),
                                ...(dir === 'nw' && { top: 0, left: 0, width: 14, height: 14, cursor: 'nw-resize' }),
                                ...(dir === 'ne' && { top: 0, right: 0, width: 14, height: 14, cursor: 'ne-resize' }),
                                ...(dir === 'sw' && { bottom: 0, left: 0, width: 14, height: 14, cursor: 'sw-resize' }),
                                ...(dir === 'se' && { bottom: 0, right: 0, width: 14, height: 14, cursor: 'se-resize' }),
                            }}
                        />
                    ))}
                </>
            )}
        </motion.div>
    )
}

export default PostHogWindow
