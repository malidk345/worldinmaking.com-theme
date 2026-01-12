"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from '../components/DashboardHeader';
import PageWindow from '../components/PageWindow';
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

const HighlightText = ({ text, query }) => {
    if (!query || query.length < 2) return <span>{text}</span>;
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

const calculateRelevance = (post, query) => {
    if (!query) return 0;
    const lowerQuery = query.toLowerCase();
    let score = 0;
    if (post.title.toLowerCase().includes(lowerQuery)) {
        score += 10;
        if (post.title.toLowerCase().startsWith(lowerQuery)) score += 5;
    }
    if (post.description?.toLowerCase().includes(lowerQuery)) score += 5;
    if (post.content?.toLowerCase().includes(lowerQuery)) score += 3;
    if (post.category?.toLowerCase() === lowerQuery) score += 8;
    if (post.author?.toLowerCase().includes(lowerQuery)) score += 4;
    return score;
};

const getRecentSearches = () => {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
        return [];
    }
};

const saveRecentSearch = (query) => {
    if (typeof window === 'undefined' || !query || query.length < 2) return;
    try {
        const recent = getRecentSearches().filter(s => s !== query);
        const updated = [query, ...recent].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch {
    }
};

export default function SearchPage({ isWindowMode = false }) {
    const router = useRouter();
    const { posts, loading } = usePosts();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const [showRecent, setShowRecent] = useState(false);

    const categories = ['all', ...new Set(posts.map(p => p.category).filter(Boolean))];

    useEffect(() => {
        setRecentSearches(getRecentSearches());
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setDebouncedSearchQuery('');
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setIsSearching(false);
            if (searchQuery.length >= 2) saveRecentSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const filteredPosts = React.useMemo(() => {
        if (loading) return [];
        const lowerQuery = debouncedSearchQuery.toLowerCase();
        let results = posts.filter(post => {
            const matchesSearch = !lowerQuery ||
                post.title.toLowerCase().includes(lowerQuery) ||
                post.description?.toLowerCase().includes(lowerQuery) ||
                post.content?.toLowerCase().includes(lowerQuery) ||
                post.author?.toLowerCase().includes(lowerQuery) ||
                post.category?.toLowerCase().includes(lowerQuery);
            const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
        if (lowerQuery) {
            results = results
                .map(post => ({ ...post, relevance: calculateRelevance(post, lowerQuery) }))
                .sort((a, b) => b.relevance - a.relevance);
        }
        return results;
    }, [posts, loading, debouncedSearchQuery, selectedCategory]);

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

    const handleClose = () => {
        router.push('/');
    };

    const content = (
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-4xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 text-center"
                >
                    <h1 className="text-3xl font-extrabold text-primary mb-2 tracking-tight">search</h1>
                    <p className="text-secondary text-sm">find articles, tutorials, and community questions</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="sticky top-0 z-20 mb-8"
                >
                    <div className="bg-white/80 backdrop-blur-xl border border-black/5 rounded-2xl shadow-lg p-3 flex flex-col md:flex-row gap-3">
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
                                className="w-full bg-white/50 border border-black/5 rounded-xl pl-10 pr-4 py-3 text-sm text-primary placeholder:text-secondary focus:outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                            />

                            <AnimatePresence>
                                {showRecent && recentSearches.length > 0 && !searchQuery && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden z-30"
                                    >
                                        <div className="flex items-center justify-between px-4 py-2 border-b border-black/5">
                                            <span className="text-xs font-bold text-secondary">recent searches</span>
                                            <button onClick={clearRecentSearches} className="text-xs text-red-500 hover:text-red-600">clear all</button>
                                        </div>
                                        {recentSearches.map((query, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleRecentClick(query)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/5 transition-colors text-left group"
                                            >
                                                <ClockIcon />
                                                <span className="flex-1 text-sm text-primary">{query}</span>
                                                <button onClick={(e) => removeRecentSearch(query, e)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600">
                                                    <CloseIcon />
                                                </button>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all whitespace-nowrap border ${selectedCategory === category
                                        ? 'bg-black text-white border-black shadow-md'
                                        : 'bg-white text-secondary border-black/5 hover:bg-black/5 hover:text-primary'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <div className="min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {isSearching ? (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center h-64">
                                <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                            </motion.div>
                        ) : filteredPosts.length > 0 ? (
                            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-black/5 rounded-xl shadow-sm overflow-hidden flex flex-col divide-y divide-black/5">
                                {filteredPosts.map((post, index) => (
                                    <motion.div key={post.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}>
                                        <Link href={`/post?id=${post.id}`} className="group flex items-center gap-4 p-4 hover:bg-black/5 transition-colors">
                                            <div className="text-secondary group-hover:text-primary transition-colors bg-black/5 p-2 rounded-lg"><DocIcon /></div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-primary group-hover:text-blue-600 transition-colors truncate">
                                                    <HighlightText text={post.title} query={searchQuery} />
                                                </h3>
                                                <p className="text-[11px] text-secondary truncate">
                                                    <HighlightText text={stripMarkdown(post.description || '')} query={searchQuery} />
                                                </p>
                                            </div>
                                            <svg className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </Link>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-4"><SearchIcon /></div>
                                <h3 className="text-lg font-bold text-primary mb-2">no results found</h3>
                                <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} className="mt-6 px-6 py-2 bg-black text-white rounded-lg text-xs font-bold transition-colors">clear filters</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );

    if (isWindowMode) return content;

    return (
        <div className="flex-1 flex flex-col bg-bg-3000 h-full overflow-hidden">
            <DashboardHeader title="Search" showSearch={false} />
            <PageWindow id="search-window" title="search" onClose={handleClose}>
                {content}
            </PageWindow>
        </div>
    );
}
