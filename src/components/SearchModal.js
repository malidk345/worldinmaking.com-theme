import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SearchModal = ({ isOpen, onClose, posts = [], onSelectPost }) => {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const inputRef = useRef(null)

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    // Search logic
    useEffect(() => {
        if (!query.trim()) {
            setResults([])
            return
        }

        const searchTerm = query.toLowerCase()
        const filtered = posts.filter(post => {
            const title = (post.title || '').toLowerCase()
            const content = (post.content || '').toLowerCase()
            const category = (post.category || post.categories?.[0]?.name || '').toLowerCase()
            const author = (typeof post.author === 'string' ? post.author : post.author?.name || '').toLowerCase()
            
            return title.includes(searchTerm) ||
                   content.includes(searchTerm) ||
                   category.includes(searchTerm) ||
                   author.includes(searchTerm)
        })

        setResults(filtered.slice(0, 10)) // Limit to 10 results
    }, [query, posts])

    // Close on escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    // Keyboard shortcut to open (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                if (!isOpen) {
                    // This should be handled by parent
                }
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])

    const handleSelect = (post) => {
        onSelectPost?.(post)
        setQuery('')
        onClose()
    }

    const highlightMatch = (text, query) => {
        if (!query.trim() || !text) return text
        const parts = text.split(new RegExp(`(${query})`, 'gi'))
        return parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase() 
                ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded px-0.5">{part}</mark>
                : part
        )
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
                        onClick={onClose}
                    />
                    
                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-x-3 top-16 sm:inset-x-auto sm:left-1/2 sm:top-[15%] sm:-translate-x-1/2 sm:w-[90%] sm:max-w-xl bg-[rgb(var(--bg))] rounded-xl shadow-2xl border border-[rgb(var(--border))] z-[10000] overflow-hidden"
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[rgb(var(--border))]">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[rgb(var(--text-muted))] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="search posts..."
                                className="flex-grow bg-transparent text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-muted))] text-[14px] sm:text-[15px] outline-none lowercase min-w-0"
                            />
                            <kbd className="hidden sm:inline-flex px-2 py-1 text-[11px] font-medium text-[rgb(var(--text-muted))] bg-[rgb(var(--accent))] rounded border border-[rgb(var(--border))]">
                                esc
                            </kbd>
                            <button 
                                onClick={onClose}
                                className="sm:hidden p-1.5 rounded-md hover:bg-[rgb(var(--accent))] text-[rgb(var(--text-muted))]"
                                aria-label="Close search"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        {/* Results */}
                        <div className="max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                            {query.trim() === '' ? (
                                <div className="px-4 py-6 sm:py-8 text-center text-[rgb(var(--text-muted))] text-[12px] sm:text-[13px] lowercase">
                                    start typing to search...
                                </div>
                            ) : results.length === 0 ? (
                                <div className="px-4 py-6 sm:py-8 text-center text-[rgb(var(--text-muted))] text-[12px] sm:text-[13px] lowercase">
                                    no results found for "{query}"
                                </div>
                            ) : (
                                <ul className="py-1 sm:py-2">
                                    {results.map((post) => (
                                        <li key={post.id}>
                                            <button
                                                onClick={() => handleSelect(post)}
                                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-start gap-2.5 sm:gap-3 hover:bg-[rgb(var(--accent))] transition-colors text-left"
                                            >
                                                {/* Icon or Image */}
                                                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[rgb(var(--accent))] flex items-center justify-center overflow-hidden">
                                                    {post.featuredImage || post.image ? (
                                                        <img src={post.featuredImage || post.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[rgb(var(--text-muted))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                            <polyline points="14 2 14 8 20 8"/>
                                                        </svg>
                                                    )}
                                                </div>
                                                
                                                {/* Content */}
                                                <div className="flex-grow min-w-0">
                                                    <h4 className="text-[13px] sm:text-[14px] font-medium text-[rgb(var(--text-primary))] truncate lowercase">
                                                        {highlightMatch(post.title, query)}
                                                    </h4>
                                                    <p className="text-[11px] sm:text-[12px] text-[rgb(var(--text-muted))] truncate lowercase mt-0.5">
                                                        {post.category || post.categories?.[0]?.name || 'uncategorized'} • {typeof post.author === 'string' ? post.author : post.author?.name || 'anonymous'}
                                                    </p>
                                                </div>

                                                {/* Arrow */}
                                                <svg className="flex-shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[rgb(var(--text-muted))] hidden xs:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="9 18 15 12 9 6"/>
                                                </svg>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-3 sm:px-4 py-2 border-t border-[rgb(var(--border))] bg-[rgb(var(--accent))]">
                            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[rgb(var(--text-muted))] lowercase">
                                <span>{results.length} results</span>
                                <div className="hidden sm:flex items-center gap-2">
                                    <span>navigate with</span>
                                    <kbd className="px-1.5 py-0.5 bg-[rgb(var(--bg))] rounded border border-[rgb(var(--border))]">↑</kbd>
                                    <kbd className="px-1.5 py-0.5 bg-[rgb(var(--bg))] rounded border border-[rgb(var(--border))]">↓</kbd>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default SearchModal
