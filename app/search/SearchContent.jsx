"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from '../components/DashboardHeader';
import { usePosts } from '../hooks/usePosts';
import { stripMarkdown } from '../lib/markdown';

// Icons
const SearchIcon = () => (
    <svg className="w-5 h-5 text-secondary group-focus-within:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const DocIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// Highlight matching text
const HighlightText = ({ text, query }) => {
    if (!query || query.length < 2) return <span>{text}</span>;

    // Escape special regex chars
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                    ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
                    : part
            )}
        </span>
    );
};

// Calculate relevance score
const calculateRelevance = (post, query) => {
    if (!query) return 0;
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Title match (highest weight)
    if (post.title.toLowerCase().includes(lowerQuery)) {
        score += 10;
        if (post.title.toLowerCase().startsWith(lowerQuery)) score += 5;
    }

    // Description match
    if (post.description?.toLowerCase().includes(lowerQuery)) {
        score += 5;
    }

    // Content match
    if (post.content?.toLowerCase().includes(lowerQuery)) {
        score += 3;
    }

    // Category exact match
    if (post.category?.toLowerCase() === lowerQuery) {
        score += 8;
    }

    // Author match
    if (post.author?.toLowerCase().includes(lowerQuery)) {
        score += 4;
    }

    return score;
};

// Get recent searches from localStorage
const getRecentSearches = () => {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
        return [];
    }
};

// Save search to localStorage
const saveRecentSearch = (query) => {
    if (typeof window === 'undefined' || !query || query.length < 2) return;
    try {
        const recent = getRecentSearches().filter(s => s !== query);
        const updated = [query, ...recent].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch {
        // Ignore localStorage errors
    }
};

export default function SearchPage() {
    const { posts, loading } = usePosts();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const [showRecent, setShowRecent] = useState(false);

    const categories = ['all', ...new Set(posts.map(p => p.category).filter(Boolean))];

    // Load recent searches on mount
    useEffect(() => {
        setRecentSearches(getRecentSearches());
    }, []);

    // Search logic with debounce
    useEffect(() => {
        if (loading) return;

        if (!searchQuery && selectedCategory === 'all') {
            setFilteredPosts(posts);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(() => {
            const lowerQuery = searchQuery.toLowerCase();

            let results = posts.filter(post => {
                // Check if post matches search query
                const matchesSearch = !searchQuery ||
                    post.title.toLowerCase().includes(lowerQuery) ||
                    post.description?.toLowerCase().includes(lowerQuery) ||
                    post.content?.toLowerCase().includes(lowerQuery) ||
                    post.author?.toLowerCase().includes(lowerQuery) ||
                    post.category?.toLowerCase().includes(lowerQuery);

                // Check if post matches category filter
                const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;

                return matchesSearch && matchesCategory;
            });

            // Sort by relevance if there's a search query
            if (searchQuery) {
                results = results
                    .map(post => ({ ...post, relevance: calculateRelevance(post, searchQuery) }))
                    .sort((a, b) => b.relevance - a.relevance);
            }

            setFilteredPosts(results);
            setIsSearching(false);

            // Save to recent searches
            if (searchQuery.length >= 2) {
                saveRecentSearch(searchQuery);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, posts, loading]);

    const handleRecentClick = (query) => {
        setSearchQuery(query);
        setShowRecent(false);
    };

    const clearRecentSearches = () => {
        localStorage.removeItem('recentSearches');
        setRecentSearches([]);
    };

    const removeRecentSearch = (query, e) => {
        e.stopPropagation();
        const updated = recentSearches.filter(s => s !== query);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
        setRecentSearches(updated);
    };

    return (
        <div className="flex-1 flex flex-col bg-bg-3000 h-full overflow-hidden">
            <DashboardHeader />

            <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-4xl mx-auto w-full">

                    {/* Header Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 text-center"
                    >
                        <h1 className="text-3xl font-extrabold text-primary mb-2 tracking-tight">search</h1>
                        <p className="text-secondary text-sm">find articles, tutorials, and community questions</p>
                    </motion.div>

                    {/* Search & Filter Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="sticky top-0 z-20 mb-8"
                    >
                        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-lg p-3 flex flex-col md:flex-row gap-3">
                            {/* Search Input */}
                            <div className="relative flex-1 group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <SearchIcon />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search for anything..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setShowRecent(true)}
                                    onBlur={() => setTimeout(() => setShowRecent(false), 200)}
                                    className="w-full bg-white/50 dark:bg-gray-800/50 border border-black/5 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-primary placeholder:text-secondary focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all"
                                />

                                {/* Recent Searches Dropdown */}
                                <AnimatePresence>
                                    {showRecent && recentSearches.length > 0 && !searchQuery && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-30"
                                        >
                                            <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 dark:border-white/5">
                                                <span className="text-xs font-bold text-secondary">recent searches</span>
                                                <button
                                                    onClick={clearRecentSearches}
                                                    className="text-xs text-red-500 hover:text-red-600"
                                                >
                                                    clear all
                                                </button>
                                            </div>
                                            {recentSearches.map((query, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleRecentClick(query)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left group"
                                                >
                                                    <ClockIcon />
                                                    <span className="flex-1 text-sm text-primary">{query}</span>
                                                    <button
                                                        onClick={(e) => removeRecentSearch(query, e)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <CloseIcon />
                                                    </button>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Category Filter */}
                            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all whitespace-nowrap border ${selectedCategory === category
                                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-md'
                                            : 'bg-white dark:bg-gray-800 text-secondary border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 hover:text-primary'
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Results Count */}
                    {searchQuery && !isSearching && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-4 px-1"
                        >
                            <span className="text-sm text-secondary">
                                found <span className="font-bold text-primary">{filteredPosts.length}</span> results for "{searchQuery}"
                            </span>
                        </motion.div>
                    )}

                    {/* Results List */}
                    <div className="min-h-[400px]">
                        <AnimatePresence mode="wait">
                            {isSearching ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center justify-center h-64"
                                >
                                    <div className="w-8 h-8 border-2 border-black/10 dark:border-white/10 border-t-black dark:border-t-white rounded-full animate-spin" />
                                </motion.div>
                            ) : filteredPosts.length > 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white dark:bg-gray-900 border border-black/5 dark:border-white/10 rounded-xl shadow-sm overflow-hidden flex flex-col divide-y divide-black/5 dark:divide-white/5"
                                >
                                    {filteredPosts.map((post, index) => (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                        >
                                            <Link
                                                href={`/post?id=${post.id}`}
                                                className="group flex items-center gap-4 p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <div className="text-secondary group-hover:text-primary transition-colors bg-black/5 dark:bg-white/5 p-2 rounded-lg">
                                                    <DocIcon />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-primary group-hover:text-blue-600 transition-colors truncate">
                                                        <HighlightText text={post.title} query={searchQuery} />
                                                    </h3>
                                                    <p className="text-[11px] text-secondary truncate">
                                                        <HighlightText text={stripMarkdown(post.description || '')} query={searchQuery} />
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-full text-secondary">
                                                            {post.category}
                                                        </span>
                                                        <span className="text-[10px] text-tertiary">
                                                            by {post.author}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <svg className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-20 text-center"
                                >
                                    <div className="w-16 h-16 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                                        <SearchIcon />
                                    </div>
                                    <h3 className="text-lg font-bold text-primary mb-2">no results found</h3>
                                    <p className="text-secondary text-sm max-w-xs">
                                        we couldn&apos;t find anything matching &quot;{searchQuery}&quot;. try different keywords or browse categories.
                                    </p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                                        className="mt-6 px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:bg-black/80 dark:hover:bg-white/80 transition-colors"
                                    >
                                        clear filters
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
