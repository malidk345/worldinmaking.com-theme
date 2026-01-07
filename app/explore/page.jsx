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

export default function ExplorePage() {
    const { posts, loading } = usePosts();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const categories = ['all', ...new Set(posts.map(p => p.category))];

    useEffect(() => {
        if (loading) return;

        // If query is empty and category is all, show all posts immediately (no loading)
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
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, posts, loading]);

    return (
        <div className="flex-1 flex flex-col bg-bg-3000 h-full overflow-hidden">
            <DashboardHeader />

            <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-5xl mx-auto w-full">

                    {/* Header Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 text-center"
                    >
                        <h1 className="text-3xl font-extrabold text-primary mb-2 tracking-tight">explore content</h1>
                        <p className="text-secondary text-sm">discover the latest articles, tutorials, and community questions</p>
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

                    {/* Results Grid */}
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
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                >
                                    {filteredPosts.map((post, index) => (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Link href={`/post/${post.id}`} className="group block h-full">
                                                <article className="h-full bg-white border border-black/5 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                                                    {/* Image */}
                                                    <div className="relative aspect-video overflow-hidden bg-gray-100">
                                                        <Image
                                                            src={post.image}
                                                            alt={post.title}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                            unoptimized
                                                        />
                                                        <div className="absolute top-3 left-3">
                                                            <span className="px-2 py-1 bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm">
                                                                {post.category}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="p-5 flex-1 flex flex-col">
                                                        <h3 className="text-lg font-bold text-primary mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                                                            {post.title}
                                                        </h3>
                                                        <p className="text-secondary text-xs leading-relaxed line-clamp-2 mb-4 flex-1">
                                                            {post.description}
                                                        </p>

                                                        <div className="flex items-center justify-between pt-4 border-t border-black/5 mt-auto">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-full overflow-hidden relative">
                                                                    <Image
                                                                        src={post.authorAvatar}
                                                                        alt={post.authorName}
                                                                        fill
                                                                        className="object-cover"
                                                                        unoptimized
                                                                    />
                                                                </div>
                                                                <span className="text-[11px] font-medium text-secondary">{post.authorName}</span>
                                                            </div>
                                                            <span className="text-[10px] text-tertiary">{post.date}</span>
                                                        </div>
                                                    </div>
                                                </article>
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
