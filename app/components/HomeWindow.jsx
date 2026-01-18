'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from './Icons';
import Window from './Window';
import HomeWindowToolbar from './HomeWindowToolbar';
import { useWindow } from '../contexts/WindowContext';
import DashboardGrid from './DashboardGrid';
import { usePosts } from '../hooks/usePosts';
import { SkeletonDashboardGrid } from './Skeleton';
import { stripMarkdown } from '../lib/markdown';
import Link from 'next/link';
import Image from 'next/image';

/**
 * HomeWindow
 * The Home/Dashboard content wrapped in a floating window
 * Features the window controls and toolbar as specified
 */
export default function HomeWindow(props) {
    const { onClose, zIndex, onFocus, isFocused, isMaximized, isMinimized, ...restProps } = props;
    const { posts, loading } = usePosts();
    const { openWindow } = useWindow();

    const handleAuthorClick = (e, authorName) => {
        e.preventDefault();
        e.stopPropagation();
        openWindow('author-profile', {
            id: `author-${authorName}`,
            title: `Author: @${authorName}`,
            username: authorName,
            isMaximized: false
        });
    };

    // State for toolbar functionality
    const [showCategories, setShowCategories] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
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
        <Window
            id="home-window"
            title="home"
            onClose={onClose}
            zIndex={zIndex}
            onFocus={onFocus}
            isFocused={isFocused}
            isMaximized={isMaximized}
            isMinimized={isMinimized}
            {...restProps}
            toolbar={
                <HomeWindowToolbar
                    showCategories={showCategories}
                    setShowCategories={setShowCategories}
                    showFilter={showFilter}
                    setShowFilter={setShowFilter}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />
            }
        >
            <div className="w-full h-full flex flex-col min-h-0 relative">
                {/* Backdrop Overlay */}
                <AnimatePresence>
                    {(showCategories || showFilter) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowCategories(false); setShowFilter(false); }}
                            className="absolute inset-0 z-50"
                            style={{ backgroundColor: 'rgba(0,0,0,0)' }}
                        />
                    )}
                </AnimatePresence>

                {/* Categories Sidebar/Panel */}
                <AnimatePresence>
                    {showCategories && (
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                            className="absolute left-2 top-2 bottom-2 w-[60%] max-w-[320px] z-60 overflow-hidden flex flex-col border border-(--border-primary) rounded-md"
                            style={{
                                backgroundColor: 'rgb(229, 231, 224)',
                                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)'
                            }}
                        >
                            <div className="px-2.5 py-1.5 border-b border-black/5 flex items-center justify-between" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
                                    <Layout className="size-3 text-secondary" />
                                    categories
                                </span>
                                <button
                                    onClick={() => setShowCategories(false)}
                                    className="text-tertiary hover:text-primary p-0.5 rounded hover:bg-black/5 transition-colors"
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
                                            className={`text-[12px] text-left transition-all py-2 px-3 rounded-md capitalize flex items-center justify-between group mx-1 mb-0.5 ${selectedCategory === category
                                                ? 'bg-[#254b85] text-white font-bold shadow-sm'
                                                : 'text-secondary hover:text-primary hover:bg-black/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`size-1 rounded-full ${selectedCategory === category ? 'bg-white' : 'bg-black/20 group-hover:bg-[#254b85]/40'}`} />
                                                <span className={selectedCategory === category ? 'translate-x-0.5 transition-transform' : 'transition-transform'}>{category}</span>
                                            </div>
                                            <span className={`text-[9px] py-0.5 px-1.5 rounded-full ${selectedCategory === category ? 'bg-white/20 text-white font-bold' : 'bg-black/5 text-secondary group-hover:bg-black/10 font-bold'}`}>
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
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute left-2 top-2 bottom-2 w-[60%] max-w-[320px] z-60 overflow-hidden flex flex-col border border-(--border-primary) rounded-md"
                            style={{
                                backgroundColor: 'rgb(229, 231, 224)',
                                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)'
                            }}
                        >
                            <div className="px-2.5 py-1.5 border-b border-black/10 flex items-center justify-between" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                                    <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                    filter & sort
                                </span>
                                <button
                                    onClick={() => setShowFilter(false)}
                                    className="text-tertiary hover:text-primary p-0.5 rounded hover:bg-black/5 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="p-3 flex flex-col gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1.5">category</label>
                                    <div className="relative">
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => handleCategorySelect(e.target.value)}
                                            className="w-full appearance-none bg-white border border-black/10 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-primary focus:outline-none focus:border-[#254b85]/30 transition-colors"
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
                                <button
                                    onClick={() => setShowFilter(false)}
                                    className="LemonButton LemonButton--primary LemonButton--small w-full mt-2"
                                >
                                    <span className="LemonButton__chrome flex items-center justify-center gap-2 py-1">
                                        Apply Filters
                                    </span>
                                </button>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Posts Content */}
                <div className="flex-1 overflow-y-auto px-3 py-6" style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}>
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
                                    href={`/post?s=${post.slug || post.id}`}
                                    className="group flex items-center gap-4 p-3 bg-white rounded-md hover:shadow-md transition-all"
                                    style={{ border: '1px solid var(--border-primary)' }}
                                >
                                    {/* Thumbnail - conditional */}
                                    <div className="w-16 h-16 rounded overflow-hidden shrink-0 relative bg-gray-100" style={{ border: '1px solid var(--border-primary)' }}>
                                        {post.image ? (
                                            <Image
                                                src={post.image}
                                                alt={post.title}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-300">
                                                {post.title?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                        )}
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
                                    <div
                                        className="flex items-center gap-2 pr-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={(e) => handleAuthorClick(e, post.authorName)}
                                    >
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
        </Window>
    );
}
