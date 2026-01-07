"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from '../components/DashboardHeader';
import { usePosts } from '../hooks/usePosts';

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

export default function SearchPage() {
    const { posts, loading } = usePosts();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const categories = ['all', ...new Set(posts.map(p => p.category))];

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
            const results = posts.filter(post => {
                const matchesSearch = post.title.toLowerCase().includes(lowerQuery) ||
                    post.description.toLowerCase().includes(lowerQuery);
                const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
                return matchesSearch && matchesCategory;
            });
            setFilteredPosts(results);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, posts, loading]);

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
                        <div className="bg-white/80 backdrop-blur-xl border border-black/5 rounded-2xl shadow-lg p-3 flex flex-col md:flex-row gap-3">
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
                                    className="w-full bg-white/50 border border-black/5 rounded-xl pl-10 pr-4 py-3 text-sm text-primary placeholder:text-secondary focus:outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                                />
                            </div>

                            {/* Category Filter */}
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
                                    <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                                </motion.div>
                            ) : filteredPosts.length > 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white border border-black/5 rounded-xl shadow-sm overflow-hidden flex flex-col divide-y divide-black/5"
                                >
                                    {filteredPosts.map((post, index) => (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                        >
                                            <Link
                                                href={`/post/${post.id}`}
                                                className="group flex items-center gap-4 p-4 hover:bg-black/5 transition-colors"
                                            >
                                                <div className="text-secondary group-hover:text-primary transition-colors bg-black/5 p-2 rounded-lg">
                                                    <DocIcon />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-primary group-hover:text-blue-600 transition-colors truncate">
                                                        {post.title}
                                                    </h3>
                                                    <p className="text-[11px] text-secondary truncate">
                                                        {post.description}
                                                    </p>
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
                                    <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-4">
                                        <SearchIcon />
                                    </div>
                                    <h3 className="text-lg font-bold text-primary mb-2">no results found</h3>
                                    <p className="text-secondary text-sm max-w-xs">
                                        we couldn't find anything matching "{searchQuery}". try different keywords or browse categories.
                                    </p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                                        className="mt-6 px-6 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-black/80 transition-colors"
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
