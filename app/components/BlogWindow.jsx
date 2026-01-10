'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import UserAvatar from './UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import Window from './Window';
import BlogWindowToolbar from './BlogWindowToolbar';
import { useTabs } from '../context/TabContext';
import { getPostById, usePosts } from '../hooks/usePosts';
import { SidebarPanel, TableOfContents, Document } from './Icons';
import VoteControl from './VoteControl';
import CommentSection from './CommentSection';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';

/**
 * BlogWindow
 * Blog post content wrapped in a floating window
 * Toolbar icons on the left, window controls on the right
 */
export default function BlogWindow({ onClose }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const slug = searchParams.get('id');
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const { posts } = usePosts();
    const { updateTabTitle } = useTabs();

    // Toolbar states
    const [showSidebar, setShowSidebar] = useState(false);
    const [showTOC, setShowTOC] = useState(false);

    useEffect(() => {
        if (slug) {
            setLoading(true);
            getPostById(slug).then(data => {
                setPost(data);
                setLoading(false);
            });
        }
    }, [slug]);

    const suggestedPosts = posts.filter(p => p.id !== slug);
    const headings = post?.headings || [];

    useEffect(() => {
        if (post && post.title) {
            // Update the active tab's title with the post title
            updateTabTitle(post.title);
        }
    }, [post, updateTabTitle]);

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            router.push('/');
        }
    };

    // Loading state
    if (loading) {
        return (
            <Window
                id="blog-window"
                title="loading..."
                onClose={handleClose}
                toolbar={
                    <BlogWindowToolbar
                        showSidebar={false}
                        setShowSidebar={() => { }}
                        showTOC={false}
                        setShowTOC={() => { }}
                    />
                }
            >
                <div className="flex-1 flex items-center justify-center h-full bg-bg-3000">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-8 w-64 bg-black/10 rounded mb-4"></div>
                        <div className="h-4 w-48 bg-black/10 rounded"></div>
                    </div>
                </div>
            </Window>
        );
    }

    // Not found state
    if (!post) {
        return (
            <Window
                id="blog-window"
                title="not found"
                onClose={handleClose}
                toolbar={null}
            >
                <div className="flex-1 overflow-y-auto bg-primary">
                    <div className="max-w-3xl mx-auto px-6 py-12 text-center">
                        <h1 className="text-2xl font-bold text-primary mb-4">Post not found</h1>
                        <button onClick={handleClose} className="text-secondary hover:text-primary hover:underline">
                            ← Back to home
                        </button>
                    </div>
                </div>
            </Window>
        );
    }

    return (
        <Window
            id="blog-window"
            title={post.title}
            onClose={handleClose}
            toolbar={
                <BlogWindowToolbar
                    showSidebar={showSidebar}
                    setShowSidebar={setShowSidebar}
                    showTOC={showTOC}
                    setShowTOC={setShowTOC}
                />
            }
        >
            <div className="flex-1 flex overflow-hidden relative h-full">
                {/* Backdrop for sidebars */}
                {(showSidebar || showTOC) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { setShowSidebar(false); setShowTOC(false); }}
                        className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
                    />
                )}

                {/* Suggested Posts Sidebar */}
                <AnimatePresence>
                    {showSidebar && (
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                            className="absolute left-2 top-2 bottom-2 w-[80%] z-40 bg-white shadow-2xl overflow-hidden flex flex-col border border-black/15 rounded-lg"
                        >
                            <div className="px-3 py-2.5 border-b border-black/15 flex items-center justify-between bg-[#f9fafb]">
                                <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                    <SidebarPanel className="size-3.5" />
                                    suggested posts
                                </span>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="text-secondary hover:text-primary p-1 rounded-md hover:bg-black/5 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto scrollbar-hide bg-white py-1">
                                <div className="flex flex-col">
                                    {suggestedPosts.slice(0, 10).map((p, idx) => (
                                        <Link
                                            key={p.id}
                                            href={`/post?id=${p.id}`}
                                            className={`flex gap-3 px-4 py-3 hover:bg-black/5 transition-colors group ${idx !== suggestedPosts.slice(0, 10).length - 1 ? 'border-b border-black/5' : ''}`}
                                            onClick={() => setShowSidebar(false)}
                                        >
                                            <div className="size-8 rounded bg-gray-100 flex items-center justify-center shrink-0 border border-black/10 text-secondary group-hover:text-[#254b85] transition-colors">
                                                <Document className="size-4" />
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h4 className="text-[14px] font-bold text-primary line-clamp-1 group-hover:text-[#254b85] transition-colors leading-tight">
                                                    {p.title}
                                                </h4>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-[10px] text-tertiary font-bold uppercase tracking-wider">{p.authorName}</span>
                                                    <span className="text-[10px] text-tertiary">•</span>
                                                    <span className="text-[10px] text-tertiary font-semibold">{p.category}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Table of Contents Sidebar */}
                <AnimatePresence>
                    {showTOC && headings.length > 0 && (
                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                            className="absolute right-2 top-2 bottom-2 w-[80%] z-40 bg-white shadow-2xl overflow-hidden flex flex-col border border-black/15 rounded-lg"
                        >
                            <div className="px-3 py-2.5 border-b border-black/15 flex items-center justify-between bg-[#f9fafb]">
                                <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                    <TableOfContents className="size-3.5" />
                                    contents
                                </span>
                                <button
                                    onClick={() => setShowTOC(false)}
                                    className="text-secondary hover:text-primary p-1 rounded-md hover:bg-black/5 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide bg-white">
                                <nav className="flex flex-col">
                                    {headings.map((heading, i) => (
                                        <a
                                            key={i}
                                            href={`#${heading.id}`}
                                            className={`text-[14px] py-2.5 px-4 transition-all flex items-center group ${heading.level === 2
                                                ? 'font-bold text-primary hover:bg-black/5'
                                                : 'text-secondary pl-8 text-[13px] hover:text-primary hover:bg-black/5'}`}
                                            onClick={() => setShowTOC(false)}
                                        >
                                            <div className={`size-1.5 rounded-full mr-3 shrink-0 ${heading.level === 2 ? 'bg-[#254b85]' : 'bg-black/10 group-hover:bg-black/20'}`} />
                                            <span className="line-clamp-1">{heading.text}</span>
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main Content - 10px margin from window edges */}
                <main className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar" style={{ padding: '10px', paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}>
                    {/* Centered container for web-friendly reading width */}
                    <article className="max-w-4xl mx-auto" style={{ margin: '10px auto' }}>
                        {/* Title */}
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary leading-[1.1] tracking-tight mb-6">
                            {post.title}
                        </h1>

                        {/* Hero Image - only show if image exists */}
                        {post.image && (
                            <div className="relative aspect-2/1 rounded-lg overflow-hidden border mb-6" style={{ borderColor: 'var(--border-primary)' }}>
                                <Image
                                    src={post.image}
                                    alt={post.title}
                                    fill
                                    className="object-cover"
                                    priority
                                    unoptimized
                                />
                            </div>
                        )}

                        {/* Meta Info */}
                        <div
                            className="flex flex-nowrap items-center border border-(--border-primary) rounded-lg overflow-x-auto divide-x divide-(--border-primary) bg-(--posthog-3000-50) text-xs whitespace-nowrap mb-6"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <div className="flex items-center gap-2 px-3 py-2 bg-(--posthog-3000-100)">
                                <div className="relative">
                                    <UserAvatar
                                        src={post.authorAvatar}
                                        name={post.authorName}
                                        size={16}
                                        className="border border-black/20"
                                    />
                                </div>
                                <span className="font-bold text-primary">
                                    {post.authorName}
                                </span>
                            </div>
                            <div className="px-3 py-2 text-secondary">
                                {post.date}
                            </div>
                            <div className="px-3 py-2 text-secondary capitalize">
                                {post.category}
                            </div>
                        </div>

                        {/* Description - 10% larger font (14px -> 15.4px) */}
                        <p className="mb-6" style={{ fontSize: '15.4px', lineHeight: '23.1px', color: 'rgb(0, 0, 0)' }}>
                            {post.description}
                        </p>

                        {/* Markdown Content - PostHog Typography with 10% larger fonts */}
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeSlug, rehypeRaw]}
                                components={{
                                    h2: ({ node, ...props }) => <h2 className="mt-8 mb-4 scroll-mt-24" style={{ fontSize: '23.6px', lineHeight: '33px', fontWeight: 700, letterSpacing: '-0.54px', color: 'rgb(0, 0, 0)' }} {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="mt-6 mb-3 scroll-mt-24" style={{ fontSize: '16.5px', lineHeight: '30.8px', fontWeight: 700, color: 'rgb(0, 0, 0)' }} {...props} />,
                                    h4: ({ node, ...props }) => <h4 className="mt-4 mb-2 scroll-mt-24" style={{ fontWeight: 600, color: 'rgb(0, 0, 0)' }} {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-4" style={{ fontSize: '15.4px', lineHeight: '23.1px', color: 'rgb(0, 0, 0)' }} {...props} />,
                                    a: ({ node, ...props }) => <a className="text-accent hover:underline" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-1" style={{ fontSize: '15.4px', lineHeight: '23.1px', color: 'rgb(0, 0, 0)' }} {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-1" style={{ fontSize: '15.4px', lineHeight: '23.1px', color: 'rgb(0, 0, 0)' }} {...props} />,
                                    li: ({ node, ...props }) => <li style={{ fontSize: '15.4px', lineHeight: '23.1px', color: 'rgb(0, 0, 0)' }} {...props} />,
                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-accent pl-4 italic my-4" style={{ color: 'rgb(0, 0, 0)' }} {...props} />,
                                    code: ({ node, inline, ...props }) =>
                                        inline ? (
                                            <code className="bg-black/5 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                        ) : (
                                            <code className="block bg-black/5 p-4 rounded-lg text-sm font-mono overflow-x-auto" {...props} />
                                        ),
                                    pre: ({ node, ...props }) => <pre className="bg-black/5 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
                                    hr: ({ node, ...props }) => <hr className="border-t border-black/20 my-8" {...props} />,
                                    img: ({ node, ...props }) => <img className="rounded-lg max-w-full h-auto my-4" {...props} />,
                                }}
                            >
                                {post.content || ''}
                            </ReactMarkdown>
                        </div>

                        {/* Author Section */}
                        <div className="mt-8 pt-6 border-t border-black/20">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <UserAvatar
                                        src={post.authorAvatar}
                                        name={post.authorName}
                                        size={48}
                                    />
                                </div>
                                <div>
                                    <h4 className="font-bold text-primary">{post.authorName}</h4>
                                    <p className="text-xs text-secondary">Author</p>
                                </div>
                            </div>
                        </div>

                        {/* Vote and Comments */}
                        <div className="mt-8 space-y-6">
                            <VoteControl postId={post.id} />
                            <CommentSection postId={post.id} />
                        </div>
                    </article>
                </main>
            </div>
        </Window>
    );
}

