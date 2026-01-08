"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from './DashboardHeader';
import DashboardGrid from './DashboardGrid';
import { usePosts } from '../hooks/usePosts';
import { SkeletonDashboardGrid } from './Skeleton';
import { stripMarkdown } from '../lib/markdown';

export default function Dashboard() {
    // Fetch posts from Supabase
    const { posts, loading } = usePosts();

    // State for toolbar functionality
    const [showCategories, setShowCategories] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Get unique categories from posts
    const categories = ['all', ...new Set(posts.map(post => post.category))];

    // Filter posts by selected category
    const filteredPosts = selectedCategory === 'all'
        ? posts
        : posts.filter(post => post.category === selectedCategory);

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setShowCategories(false);
    };

    return (
        <div className="Dashboard w-full h-full flex flex-col min-h-0">
            <DashboardHeader
                showCategories={showCategories}
                setShowCategories={setShowCategories}
                showFilter={showFilter}
                setShowFilter={setShowFilter}
                viewMode={viewMode}
                setViewMode={setViewMode}
            />

            {/* Main Content Area */}
            <div className="Dashboard__content flex-1 w-full min-h-0 relative overflow-y-auto overflow-x-hidden" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>

                {/* Backdrop Overlay - Transparent for click outside */}
                <AnimatePresence>
                    {(showCategories || showFilter) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowCategories(false); setShowFilter(false); }}
                            className="fixed inset-0 z-50 bg-black/5"
                        />
                    )}
                </AnimatePresence>

                {/* Categories Sidebar/Panel */}
                <AnimatePresence>
                    {showCategories && (
                        <motion.aside
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed left-4 top-[calc(var(--scene-layout-header-height)+60px)] w-[200px] z-[60] bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-black/5"
                        >
                            <div className="px-3 py-2 border-b border-black/5 flex items-center justify-between bg-white/50">
                                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">categories</span>
                                <button
                                    onClick={() => setShowCategories(false)}
                                    className="text-secondary hover:text-primary p-0.5 rounded-md hover:bg-black/5 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-1.5 scrollbar-hide">
                                <nav className="flex flex-col gap-0.5">
                                    {categories.map((category) => (
                                        <button
                                            key={category}
                                            onClick={() => handleCategorySelect(category)}
                                            className={`text-[12px] text-left transition-all py-1.5 px-2.5 rounded-lg capitalize flex items-center justify-between group ${selectedCategory === category
                                                ? 'bg-black text-white font-semibold shadow-sm'
                                                : 'text-secondary hover:text-primary hover:bg-black/5'
                                                }`}
                                        >
                                            <span className={selectedCategory === category ? 'translate-x-0.5 transition-transform' : 'transition-transform'}>{category}</span>
                                            <span className={`text-[9px] py-0.5 px-1.5 rounded-full ${selectedCategory === category ? 'bg-white/20 text-white' : 'bg-black/5 text-secondary group-hover:bg-black/10'}`}>
                                                {category === 'all' ? posts.length : posts.filter(p => p.category === category).length}
                                            </span>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Filter Panel */}
                <AnimatePresence>
                    {showFilter && (
                        <motion.aside
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed left-4 top-[calc(var(--scene-layout-header-height)+60px)] w-[250px] z-[60] bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-black/5"
                        >
                            <div className="px-3 py-2 border-b border-black/5 flex items-center justify-between bg-white/50">
                                <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                    filter & sort
                                </span>
                                <button
                                    onClick={() => setShowFilter(false)}
                                    className="text-secondary hover:text-primary p-0.5 rounded-md hover:bg-black/5 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="p-3 flex flex-col gap-3">
                                {/* Category Filter */}
                                <div>
                                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1.5">category</label>
                                    <div className="relative">
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => handleCategorySelect(e.target.value)}
                                            className="w-full appearance-none bg-white border border-black/10 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-primary focus:outline-none focus:border-black/30 transition-colors"
                                        >
                                            {categories.map(c => (
                                                <option key={c} value={c} className="capitalize">{c}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Apply Button */}
                                <button
                                    onClick={() => setShowFilter(false)}
                                    className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small w-full mt-2"
                                >
                                    <span className="LemonButton__chrome flex items-center justify-center gap-2 py-1 bg-white">
                                        Apply Filters
                                    </span>
                                </button>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Posts Content */}
                <div className="px-3 py-6">
                    {/* Active Filter Indicator */}
                    {selectedCategory !== 'all' && (
                        <div className="mb-4 flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-secondary uppercase">Filtered by:</span>
                            <span className="text-[12px] font-semibold bg-black text-white px-2 py-0.5 rounded capitalize flex items-center gap-1">
                                {selectedCategory}
                                <button onClick={() => setSelectedCategory('all')} className="hover:opacity-70">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 0 0-1.42 0L12 10.59 7.12 5.7a1 1 0 0 0-1.42 1.42L10.59 12l-4.88 4.88a1 1 0 1 0 1.42 1.42L12 13.41l4.88 4.88a1 1 0 0 0 1.42-1.42L13.41 12l4.88-4.88a1 1 0 0 0 0-1.41z" /></svg>
                                </button>
                            </span>
                        </div>
                    )}

                    {loading ? (
                        <SkeletonDashboardGrid count={6} />
                    ) : viewMode === 'grid' ? (
                        <DashboardGrid posts={filteredPosts} />
                    ) : (
                        /* List View */
                        <div className="flex flex-col gap-2">
                            {filteredPosts.map(post => (
                                <Link
                                    key={post.id}
                                    href={`/post?id=${post.id}`}
                                    className="group flex items-center gap-4 p-3 bg-white rounded-md hover:shadow-md transition-all"
                                    style={{ border: '1px solid var(--border-primary)' }}
                                >
                                    {/* Thumbnail */}
                                    <div className="w-16 h-16 rounded overflow-hidden shrink-0 relative" style={{ border: '1px solid var(--border-primary)' }}>
                                        <Image
                                            src={post.image}
                                            alt={post.title}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-secondary uppercase">{post.category}</span>
                                            <span className="text-[10px] text-secondary">•</span>
                                            <span className="text-[10px] text-secondary">{post.date}</span>
                                        </div>
                                        <h3 className="text-[15px] font-bold text-primary line-clamp-1 group-hover:text-accent transition-colors">
                                            {post.title}
                                        </h3>
                                        <p className="text-[13px] text-secondary line-clamp-1 mt-0.5">
                                            {stripMarkdown(post.description)}
                                        </p>
                                    </div>

                                    {/* Author */}
                                    <div className="flex items-center gap-2 pr-2 shrink-0">
                                        <div className="text-right hidden sm:block">
                                            <div className="text-[11px] font-bold text-primary">{post.authorName}</div>
                                            <div className="text-[10px] text-secondary">Author</div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full overflow-hidden relative border border-white shadow-sm">
                                            <Image
                                                src={post.authorAvatar}
                                                alt={post.authorName}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
