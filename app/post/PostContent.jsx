"use client";
import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import DashboardHeader from '../components/DashboardHeader';
import { useTabs } from '../context/TabContext';
import { getPostById, usePosts } from '../hooks/usePosts';
import { SidebarPanel, TableOfContents } from '../components/Icons';
import VoteControl from '../components/VoteControl';
import CommentSection from '../components/CommentSection';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

function BlogPostContent() {
    const searchParams = useSearchParams();
    const slug = searchParams.get('id');
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const { posts } = usePosts();

    useEffect(() => {
        if (slug) {
            setLoading(true);
            getPostById(slug).then(data => {
                setPost(data);
                setLoading(false);
            });
        }
    }, [slug]);

    const { updateTabTitle } = useTabs();

    const [showSidebar, setShowSidebar] = useState(false);
    const [showTOC, setShowTOC] = useState(false);

    const suggestedPosts = posts.filter(p => p.id !== slug);

    // Use headings from usePosts hook (extracted from Markdown)
    const headings = post?.headings || [];

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

            <div className="scene-sticky-bar @2xl/main-content:sticky z-20 bg-primary @2xl/main-content:top-[calc(var(--scene-layout-header-height)+var(--scene-title-section-height,64px))] space-y-2 py-2 px-3 rounded-t-xl mt-3">
                <div className="flex gap-2 justify-between">
                    <div className="flex-1 flex gap-2 items-end flex-wrap border border-transparent">
                        <div className="w-full">
                            <div className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small LemonButton--has-icon LemonButton--has-side-icon w-full">
                                <span className="LemonButton__chrome justify-between px-3">
                                    <button
                                        onClick={() => setShowSidebar(!showSidebar)}
                                        className={`flex items-center gap-2 p-1 rounded transition-colors ${showSidebar ? 'bg-accent text-primary' : 'hover:bg-accent/50'}`}
                                        title="Suggested Posts"
                                    >
                                        <SidebarPanel />
                                        <span className="text-xs font-medium hidden sm:inline">suggested</span>
                                    </button>
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

            <div className="flex-1 flex overflow-hidden relative">

                {(showSidebar || showTOC) && (
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => { setShowSidebar(false); setShowTOC(false); }}
                    />
                )}

                <main className="flex-1 overflow-y-auto bg-bg-3000 custom-scrollbar" style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}>
                    <article className="max-w-[1400px] mx-auto">

                        <div className="px-6 pt-8 md:pt-12">
                            <div className="max-w-[900px] mx-auto">
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary leading-[1.1] tracking-tight mb-8">
                                    {post.title}
                                </h1>

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

                                <div
                                    className="flex flex-nowrap items-center border border-(--border-primary) rounded-lg overflow-x-auto divide-x divide-(--border-primary) bg-(--posthog-3000-50) text-xs whitespace-nowrap mb-8"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    <div className="flex items-center gap-2 px-3 py-2 bg-(--posthog-3000-100)">
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
                                    <div className="px-3 py-2 text-secondary">
                                        {post.date}
                                    </div>
                                    <div className="px-3 py-2 text-secondary">
                                        {post.category}
                                    </div>
                                    <div className="px-3 py-2 text-secondary">
                                        5 min read
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-1">
                            <div className="w-full flex flex-col lg:flex-row gap-4 relative">
                                <aside className="hidden lg:block w-[200px] shrink-0">
                                    <div className="sticky top-24">
                                        <h4 className="text-[11px] font-bold text-secondary uppercase tracking-[0.2em] opacity-40 mb-8">In this article</h4>
                                        <nav className="flex flex-col gap-5">
                                            {headings.map((heading, i) => (
                                                <a
                                                    key={i}
                                                    href={`#${heading.id}`}
                                                    className="text-[13px] text-secondary font-bold hover:text-primary transition-all leading-snug opacity-70 hover:opacity-100"
                                                >
                                                    {heading.text}
                                                </a>
                                            ))}
                                        </nav>
                                    </div>
                                </aside>

                                <div className="flex-1 w-full article-content">
                                    <div className="bg-white rounded-lg p-6 mx-1 border border-(--border-primary)">
                                        <p className="text-lg text-gray-700 leading-relaxed mb-6 font-medium">
                                            {post.description}
                                        </p>
                                        <hr className="my-8 border-gray-100" />

                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeSlug]}
                                            className="prose prose-lg max-w-none text-gray-900 leading-relaxed"
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-primary" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-[1.75rem] font-bold text-primary mt-10 mb-4 tracking-[-0.015em] scroll-mt-24" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-primary mt-8 mb-3 tracking-[-0.015em]" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-5 text-[17px] leading-7 text-gray-800" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc ml-6 mb-6 space-y-2 text-gray-800" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mb-6 space-y-2 text-gray-800" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="px-6 py-4 rounded-lg bg-gray-50 border-l-4 border-primary mb-8 text-lg font-medium text-gray-700 italic" {...props} />,
                                                a: ({ node, ...props }) => <a className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors" {...props} />,
                                                code: ({ node, inline, className, children, ...props }) => {
                                                    const match = /language-(\w+)/.exec(className || '')
                                                    return !inline ? (
                                                        <pre className="not-prose bg-[#1f2937] text-gray-100 p-4 rounded-lg overflow-x-auto mb-6 text-sm font-mono leading-normal shadow-sm">
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </pre>
                                                    ) : (
                                                        <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-[0.9em] font-mono font-medium" {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                },
                                                img: ({ node, ...props }) => <img className="rounded-xl my-8 w-full h-auto border border-gray-100 shadow-sm" {...props} />,
                                                hr: ({ node, ...props }) => <hr className="my-10 border-gray-100" {...props} />,
                                            }}
                                        >
                                            {post.content}
                                        </ReactMarkdown>
                                    </div>

                                    <div className="space-y-2 mt-2">
                                        <VoteControl postId={post.id} />
                                        <button className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small w-full">
                                            <span className="LemonButton__chrome flex items-center justify-between px-3 py-1 bg-white w-full">
                                                <span className="flex items-center gap-2">
                                                    <span>discuss in community</span>
                                                </span>
                                            </span>
                                        </button>
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
                                </nav>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showSidebar && (
                        <motion.aside
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed left-4 top-[calc(var(--scene-layout-header-height)+60px)] bottom-24 w-[240px] z-40 bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-black/5"
                        >
                            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                                <div className="flex flex-col gap-2">
                                    {suggestedPosts.slice(0, 4).map((suggestedPost) => (
                                        <Link
                                            key={suggestedPost.id}
                                            href={`/post?id=${suggestedPost.slug}`}
                                            onClick={() => setShowSidebar(false)}
                                            className="group block p-2 rounded-lg bg-white/50 hover:bg-white border border-transparent hover:border-black/5 hover:shadow-sm transition-all"
                                        >
                                            <h4 className="text-[13px] font-bold text-primary leading-tight mb-0.5 group-hover:text-blue-600 transition-colors line-clamp-2">
                                                {suggestedPost.title}
                                            </h4>
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

export default function BlogPost() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <BlogPostContent />
        </Suspense>
    );
}
