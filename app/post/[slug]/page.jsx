"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import DashboardHeader from '../../components/DashboardHeader';
import { useTabs } from '../../context/TabContext';
import { getPostById, usePosts } from '../../hooks/usePosts';
import { SidebarPanel, TableOfContents } from '../../components/Icons';
import VoteControl from '../../components/VoteControl';
import CommentSection from '../../components/CommentSection';

export const runtime = 'edge';

export default function BlogPost() {
    const params = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const { posts } = usePosts(); // Fetch all posts for suggestions

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (params.slug) {
            setLoading(true);
            getPostById(params.slug).then(data => {
                setPost(data);
                setLoading(false);
            });
        }
    }, [params.slug]);

    const { updateTabTitle } = useTabs();

    // State for sidebar and TOC panels
    const [showSidebar, setShowSidebar] = useState(false);
    const [showTOC, setShowTOC] = useState(false);

    // Get suggested posts (other posts excluding current)
    const suggestedPosts = posts.filter(p => p.id !== params.slug);

    // Extract headings from content for TOC
    const headings = post?.content?.split('\n').filter(l => l.startsWith('## ')).map(line => {
        const text = line.replace('## ', '');
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        return { text, id };
    }) || [];

    // Update tab title when post loads
    useEffect(() => {
        if (post) {
            updateTabTitle(post.title);
        }
    }, [post, updateTabTitle]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-bg-3000">
                <DashboardHeader />
                <div className="animate-pulse flex flex-col items-center mt-20">
                    <div className="h-8 w-64 bg-black/10 rounded mb-4"></div>
                    <div className="h-4 w-48 bg-black/10 rounded"></div>
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex-1 flex flex-col">
                <DashboardHeader />
                <div className="flex-1 overflow-y-auto bg-primary">
                    <div className="max-w-3xl mx-auto px-6 py-12 text-center">
                        <h1 className="text-2xl font-bold text-primary mb-4">Post not found</h1>
                        <Link href="/" className="text-secondary hover:text-primary hover:underline">
                            ← Back to home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />

            {/* Blog Post Toolbar - Similar to Home page filter bar */}
            <div className="scene-sticky-bar @2xl/main-content:sticky z-20 bg-primary @2xl/main-content:top-[calc(var(--scene-layout-header-height)+var(--scene-title-section-height,64px))] space-y-2 py-2 px-3 rounded-t-xl mt-3">
                <div className="flex gap-2 justify-between">
                    <div className="flex-1 flex gap-2 items-end flex-wrap border border-transparent">
                        <div className="w-full">
                            <div className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small LemonButton--has-icon LemonButton--has-side-icon w-full">
                                <span className="LemonButton__chrome justify-between px-3">
                                    {/* Sidebar Toggle Button */}
                                    <button
                                        onClick={() => setShowSidebar(!showSidebar)}
                                        className={`flex items-center gap-2 p-1 rounded transition-colors ${showSidebar ? 'bg-accent text-primary' : 'hover:bg-accent/50'}`}
                                        title="Suggested Posts"
                                    >
                                        <SidebarPanel />
                                        <span className="text-xs font-medium hidden sm:inline">suggested</span>
                                    </button>
                                    {/* TOC Toggle Button */}
                                    <button
                                        onClick={() => setShowTOC(!showTOC)}
                                        className={`flex items-center gap-2 p-1 rounded transition-colors ${showTOC ? 'bg-accent text-primary' : 'hover:bg-accent/50'}`}
                                        title="Table of Contents"
                                    >
                                        <span className="text-xs font-medium hidden sm:inline">contents</span>
                                        <TableOfContents />
                                    </button>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area with Sidebars */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Backdrop Overlay - Transparent for click outside */}
                {(showSidebar || showTOC) && (
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => { setShowSidebar(false); setShowTOC(false); }}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar" style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}>
                    <article className="max-w-[1400px] mx-auto">

                        {/* 1. Article Header */}
                        <div className="px-6 pt-8 md:pt-12">
                            <div className="max-w-[900px] mx-auto">
                                {/* Main Title */}
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary leading-[1.1] tracking-tight mb-8">
                                    {post.title}
                                </h1>

                                {/* Hero Image - Below Title */}
                                <div className="relative aspect-[2/1] rounded-lg overflow-hidden border mb-6" style={{ borderColor: 'var(--border-primary)' }}>
                                    <Image
                                        src={post.image}
                                        alt={post.title}
                                        fill
                                        className="object-cover"
                                        priority
                                        unoptimized
                                    />
                                </div>

                                {/* Meta Info - worldinmaking.com Style Meta Bar */}
                                <div
                                    className="flex flex-nowrap items-center border border-[var(--border-primary)] rounded-lg overflow-x-auto divide-x divide-[var(--border-primary)] bg-[var(--posthog-3000-50)] text-xs whitespace-nowrap mb-8"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {/* Author Section */}
                                    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--posthog-3000-100)]">
                                        <div className="w-4 h-4 rounded-full overflow-hidden relative shrink-0">
                                            <Image
                                                src={post.authorAvatar}
                                                alt={post.authorName}
                                                width={16}
                                                height={16}
                                                className="object-cover"
                                                unoptimized
                                            />
                                        </div>
                                        <span className="font-bold text-primary">
                                            {post.authorName}
                                        </span>
                                    </div>

                                    {/* Date */}
                                    <div className="px-3 py-2 text-secondary">
                                        {post.date}
                                    </div>

                                    {/* Category */}
                                    <div className="px-3 py-2 text-secondary">
                                        {post.category}
                                    </div>

                                    {/* Read Time */}
                                    <div className="px-3 py-2 text-secondary">
                                        5 min read
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Article Content Grid */}
                        <div className="px-1">
                            <div className="w-full flex flex-col lg:flex-row gap-4 relative">

                                {/* Sidebar: Table of Contents */}
                                <aside className="hidden lg:block w-[200px] shrink-0">
                                    <div className="sticky top-24">
                                        <h4 className="text-[11px] font-bold text-secondary uppercase tracking-[0.2em] opacity-40 mb-8">In this article</h4>
                                        <nav className="flex flex-col gap-5">
                                            {post.content.split('\n').filter(l => l.startsWith('## ')).map((line, i) => {
                                                const heading = line.replace('## ', '');
                                                const id = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                                                return (
                                                    <a
                                                        key={i}
                                                        href={`#${id}`}
                                                        className="text-[13px] text-secondary font-bold hover:text-primary transition-all leading-snug opacity-70 hover:opacity-100"
                                                    >
                                                        {heading}
                                                    </a>
                                                );
                                            })}
                                            <div className="h-px w-full bg-primary/10 mt-4 mb-4" />
                                            <a href="#community" className="text-[13px] text-secondary font-bold hover:text-primary transition-all opacity-70 hover:opacity-100">
                                                Community questions
                                            </a>
                                        </nav>
                                    </div>
                                </aside>

                                {/* Content Body - worldinmaking.com Style */}
                                <div className="flex-1 w-full article-content">
                                    {/* White container - nearly full width with minimal margin */}
                                    <div className="bg-white rounded-lg p-4 mx-1 border border-[var(--border-primary)]">
                                        {/* Lead Text - worldinmaking.com style with relaxed leading */}
                                        <p className="text-base text-gray-900 leading-relaxed mb-3">
                                            {post.description}
                                        </p>

                                        <hr className="my-6" />

                                        {/* Blog content with worldinmaking.com body font style */}
                                        <div className="text-gray-900 leading-relaxed">
                                            {post.content.split('\n').map((line, i) => {
                                                // Heading 2
                                                if (line.startsWith('## ')) {
                                                    const text = line.replace('## ', '');
                                                    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                                                    return <h2 key={i} id={id} className="text-[1.75rem] font-bold text-primary mt-4 mb-2 tracking-[-0.015em] scroll-mt-24">{text}</h2>;
                                                }

                                                // Heading 3
                                                if (line.startsWith('### ')) {
                                                    return <h3 key={i} className="text-xl font-bold text-primary mt-4 mb-1 tracking-[-0.015em]">{line.replace('### ', '')}</h3>;
                                                }

                                                // Blockquote
                                                if (line.startsWith('> ')) {
                                                    return <blockquote key={i} className="px-6 py-4 rounded bg-[var(--posthog-3000-50)] border border-primary mb-4 text-[15px] leading-relaxed">{line.replace('> ', '')}</blockquote>;
                                                }

                                                // Lists - worldinmaking.com style
                                                if (line.startsWith('- ')) {
                                                    const content = line.replace('- ', '');
                                                    const isBold = content.startsWith('**');
                                                    return (
                                                        <li key={i} className="text-base leading-relaxed mb-0.5 ml-6 list-disc text-gray-900">
                                                            {isBold ? (
                                                                <strong className="text-gray-900 font-semibold">{content.replace(/\*\*/g, '')}</strong>
                                                            ) : content}
                                                        </li>
                                                    );
                                                }

                                                // Paragraphs - worldinmaking.com style
                                                if (line.trim() === '') return null;
                                                return <p key={i} className="text-base text-gray-900 leading-relaxed mb-3">{line}</p>;
                                            })}
                                        </div>
                                    </div>

                                    {/* worldinmaking.com style post footer */}
                                    <div className="space-y-2 mt-2">
                                        {/* Vote Control - worldinmaking.com style */}
                                        <VoteControl postId={post.id} />

                                        {/* Discuss in Community - worldinmaking.com style */}
                                        <button
                                            className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small w-full"
                                        >
                                            <span className="LemonButton__chrome flex items-center justify-between px-3 py-1 bg-white w-full">
                                                <span className="flex items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                    </svg>
                                                    <span>discuss in community</span>
                                                </span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                                                    <path d="m9 18 6-6-6-6" />
                                                </svg>
                                            </span>
                                        </button>



                                        {/* Comment Section - worldinmaking.com style */}
                                        <CommentSection postId={post.id} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>
                </main>

                <AnimatePresence>
                    {showTOC && (
                        <motion.aside
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed right-4 top-[calc(var(--scene-layout-header-height)+60px)] bottom-4 w-[240px] z-40 bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-black/5"
                        >
                            <div className="px-3 py-2 border-b border-black/5 flex items-center justify-between bg-white/50">
                                <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                    <TableOfContents className="w-3.5 h-3.5 text-accent" />
                                    in this article
                                </span>
                                <button
                                    onClick={() => setShowTOC(false)}
                                    className="text-secondary hover:text-primary p-0.5 rounded-md hover:bg-black/5 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-1.5 scrollbar-hide">
                                <nav className="flex flex-col gap-0.5">
                                    {headings.map((heading, i) => (
                                        <a
                                            key={i}
                                            href={`#${heading.id}`}
                                            onClick={() => setShowTOC(false)}
                                            className="text-[12px] text-secondary hover:text-primary hover:bg-black/5 transition-all py-1.5 px-2.5 rounded-lg leading-snug block"
                                        >
                                            {heading.text}
                                        </a>
                                    ))}
                                    <div className="h-px w-full bg-black/5 my-1.5 opacity-50" />
                                    <a
                                        href="#community"
                                        onClick={() => setShowTOC(false)}
                                        className="text-[12px] text-secondary hover:text-primary hover:bg-black/5 transition-all py-1.5 px-2.5 rounded-lg block font-medium"
                                    >
                                        Community questions
                                    </a>
                                </nav>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Suggested Posts Panel */}
                <AnimatePresence>
                    {showSidebar && (
                        <motion.aside
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed left-4 top-[calc(var(--scene-layout-header-height)+60px)] bottom-24 w-[240px] z-40 bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-black/5"
                        >
                            <div className="px-3 py-2 border-b border-black/5 flex items-center justify-between bg-white/50">
                                <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                    <SidebarPanel className="w-3.5 h-3.5 text-accent" />
                                    suggested
                                </span>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="text-secondary hover:text-primary p-0.5 rounded-md hover:bg-black/5 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                                <div className="flex flex-col gap-2">
                                    {posts.filter(p => p.id !== post.id).slice(0, 4).map((suggestedPost) => (
                                        <Link
                                            key={suggestedPost.id}
                                            href={`/post/${suggestedPost.slug}`}
                                            onClick={() => setShowSidebar(false)}
                                            className="group block p-2 rounded-lg bg-white/50 hover:bg-white border border-transparent hover:border-black/5 hover:shadow-sm transition-all"
                                        >
                                            <h4 className="text-[13px] font-bold text-primary leading-tight mb-0.5 group-hover:text-blue-600 transition-colors line-clamp-2">
                                                {suggestedPost.title}
                                            </h4>
                                            <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                                                {suggestedPost.description}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
