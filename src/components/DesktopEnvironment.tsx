'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import Window from './Window';
import Image from 'next/image';
import AdminContent from './AdminContent';
import SettingsContent from './SettingsContent';
import AuthorProfileContent from './AuthorProfileContent';
import { UserAvatar } from './UserAvatar';
import { ContentsIcon, ReaderIcon, GridIcon, ListIcon } from './Icons';
import ReactionControl from './ReactionControl';
import BlogCommentSection from './BlogCommentSection';
import LoginContent from './LoginContent';
import { supabase } from '../lib/supabase';

// Providers & Hooks
import { useToast } from '../contexts/ToastContext';
import { useWindow } from '../contexts/WindowContext';
import { usePosts } from '../hooks/usePosts';

// Data
import { BLOG_POSTS } from '../data/posts';
import { slugify } from '../utils/helpers';
import { BlogPost } from '../types';

// Helper to get icon based on category
const getCategoryIcon = () => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-black dark:text-zinc-200">
            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clipRule="evenodd" />
            <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
        </svg>
    );
};



// Content for the Blog Window Sidebar (Recommended Posts)
const GetBlogRecommendedSidebar = ({ currentPostId, onPostClick }: { currentPostId: number, onPostClick: (post: BlogPost) => void }) => {
    const recommended = BLOG_POSTS.filter(post => post.id !== currentPostId).slice(0, 4);

    return (
        <div>
            <h4 className="text-xs font-bold text-zinc-400 lowercase tracking-wider mb-4">read next</h4>
            <div className="flex flex-col">
                {recommended.map((post, idx) => (
                    <React.Fragment key={post.id}>
                        <div
                            onClick={() => onPostClick(post)}
                            className="group cursor-pointer block py-3"
                        >
                            <h5 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white leading-snug transition-colors lowercase">
                                {post.title}
                            </h5>
                            <span className="text-xs text-zinc-400 mt-1 block lowercase">{post.date}</span>
                        </div>
                        {idx < recommended.length - 1 && (
                            <div className="h-px bg-zinc-100 dark:bg-white/10 w-full" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

// Content for the Blog Window Sidebar (Table of Contents) - Updated to support Active State
const GetBlogTOCSidebar = ({ headings = [], activeSection }: { headings?: string[], activeSection?: string }) => (
    <div>
        <h4 className="text-xs font-bold text-zinc-400 lowercase tracking-wider mb-4">contents</h4>
        <ul className="space-y-2 border-l-2 border-zinc-100 dark:border-zinc-700 ml-1">
            {headings.map((heading, idx) => {
                const id = slugify(heading);
                const isActive = activeSection === id;
                return (
                    <li key={idx} className="relative">
                        <div className={`absolute -left-[10px] top-1.5 w-[2px] h-[14px] bg-black dark:bg-white rounded-full transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                        <a
                            href={`#${id}`}
                            onClick={(e) => {
                                e.preventDefault();
                                const element = document.getElementById(id);
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }}
                            className={`
                 text-sm block leading-tight lowercase transition-all duration-200 pl-3
                 ${isActive ? 'text-black dark:text-white font-bold translate-x-1' : 'text-zinc-500 hover:text-black dark:hover:text-zinc-300'}
              `}
                        >
                            {heading}
                        </a>
                    </li>
                );
            })}
        </ul>
    </div>
);

// Import new components for animated desktop
import { HolographicGlobe } from './HolographicGlobe';
import { OrbitalMenu } from './OrbitalMenu';
import { AmbientBackground } from './AmbientBackground';

// New Component: Empty Desktop State with Holographic Globe Animation
const EmptyDesktop = ({ openWindow }: { openWindow: (type: 'home' | 'post' | 'services' | 'about' | 'contact' | 'wim' | 'login' | 'privacy' | 'terms' | 'cookies' | 'admin' | 'settings' | 'author', data?: any) => void }) => {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
            {/* Ambient Background Effects */}
            <AmbientBackground />

            {/* Main Content Area */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">

                {/* The Central Globe Canvas */}
                <div className="relative z-0">
                    <HolographicGlobe />
                </div>

                {/* The Orbital Navigation */}
                <OrbitalMenu openWindow={openWindow} />

                {/* Footer Copyright */}
                <div className="absolute bottom-12 left-0 w-full flex justify-center pointer-events-none">
                    <div className="px-4 py-1.5 rounded-full border border-black/10 dark:border-white/10">
                        <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-500 font-sans font-normal lowercase">
                            ® all rights reserved 2024. designed by wim
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};


// Main Content Component
const DesktopEnvironment: React.FC = () => {
    const {
        activeSidebar,
        toggleSidebar,
        windows,
        bringToFront,
        closeWindow,
        viewMode,
        setViewMode,
        openWindow,
        activeWindowSidebarMode,
        setActiveWindowSidebarMode
    } = useWindow();

    const { addToast } = useToast();
    const { posts } = usePosts();
    const searchParams = useSearchParams();

    // Deep Linking: Open post from URL
    useEffect(() => {
        const postId = searchParams.get('post');
        if (postId && posts.length > 0) {
            const foundPost = posts.find(p => p.id.toString() === postId);
            if (foundPost) {
                openWindow('post', foundPost);
            }
        }
    }, [posts, searchParams, openWindow]);

    // Dynamic Page Title: Update browser title based on active window
    useEffect(() => {
        if (windows.length > 0) {
            // Find top-most window
            const topWindow = [...windows].sort((a, b) => b.zIndex - a.zIndex)[0];
            if (topWindow) {
                const title = topWindow.type === 'post' && topWindow.data
                    ? topWindow.data.title
                    : topWindow.title || 'desktop';
                document.title = `${title.toLowerCase()} | worldinmaking`;
            }
        } else {
            document.title = 'worldinmaking | a digital collective';
        }
    }, [windows]);

    // Load More & Filter Logic
    const [visibleCount, setVisibleCount] = useState(12);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const filteredHomePosts = selectedCategory
        ? posts.filter(p => p.category && p.category.toLowerCase() === selectedCategory.toLowerCase())
        : posts;
    const displayedPosts = filteredHomePosts.slice(0, visibleCount);

    const homeCategories = Array.from(new Set(posts.map(p => p.category))).filter(Boolean).sort();

    const handlePostClick = (post: BlogPost) => {
        openWindow('post', post);
    };

    const handleAuthorClick = (e: React.MouseEvent, authorName: string | undefined | null) => {
        e.stopPropagation();
        if (authorName) openWindow('author', { authorName } as any);
    };

    return (
        <>
            <Header />
            <Sidebar />

            <main className={`pt-24 px-6 transition-all duration-300 pb-32 ${activeSidebar ? 'opacity-30 blur-md scale-[0.98]' : ''} overflow-y-auto h-full relative`}>
                {/* Render Empty State if no windows are open */}
                {windows.length === 0 && <EmptyDesktop openWindow={openWindow} />}

                <div className="relative">

                    {/* Render All Open Windows */}
                    {windows.map((win) => {
                        if (win.type === 'home') {
                            return (
                                <Window
                                    key={win.id}
                                    title="home"
                                    sidebarContent={
                                        <nav className="space-y-6">
                                            <div>
                                                <h4 className="text-xs font-bold text-zinc-400 lowercase tracking-wider mb-3">menu</h4>
                                                <ul className="space-y-2">
                                                    <li>
                                                        <button
                                                            onClick={() => setSelectedCategory(null)}
                                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full text-left lowercase transition-colors ${!selectedCategory ? 'bg-black text-white dark:bg-white dark:text-black font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10'}`}
                                                        >
                                                            all posts
                                                        </button>
                                                    </li>
                                                    {homeCategories.map(cat => (
                                                        <li key={cat}>
                                                            <button
                                                                onClick={() => setSelectedCategory(cat.toLowerCase())}
                                                                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full text-left lowercase transition-colors ${selectedCategory === cat.toLowerCase() ? 'bg-black text-white dark:bg-white dark:text-black font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10'}`}
                                                            >
                                                                {cat}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </nav>
                                    }
                                    zIndex={win.zIndex}
                                    initialX={win.initialX}
                                    initialY={win.initialY}
                                    onFocus={() => bringToFront(win.id)}
                                    onClose={() => closeWindow(win.id)}
                                    customControls={
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                onClick={() => setViewMode('grid')}
                                                className={`w-6 h-6 flex items-center justify-center rounded transition-all active:scale-90 ${viewMode === 'grid' ? 'bg-black/10 dark:bg-white/20' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                                                title="grid view"
                                            >
                                                <GridIcon />
                                            </button>
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={`w-6 h-6 flex items-center justify-center rounded transition-all active:scale-90 ${viewMode === 'list' ? 'bg-black/10 dark:bg-white/20' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                                                title="list view"
                                            >
                                                <ListIcon />
                                            </button>
                                        </div>
                                    }
                                >
                                    <div className="space-y-6">
                                        {/* View Mode Switching */}
                                        {viewMode === 'grid' ? (
                                            /* GRID VIEW (Morphing Disclosure) */
                                            <div className="morphing-disclosure grid gap-4 grid-cols-1 md:grid-cols-2">
                                                {displayedPosts.map((post) => (
                                                    <details
                                                        key={post.id}
                                                        open
                                                        className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:translate-y-[-2px] mb-0!"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handlePostClick(post);
                                                        }}
                                                    >
                                                        <summary className="pointer-events-none lowercase text-black dark:text-white">
                                                            {getCategoryIcon()}
                                                            <span>{post.title}</span>
                                                        </summary>

                                                        <div className="md-content pointer-events-none">
                                                            <p className="text-zinc-600 dark:text-zinc-400 mb-5 lowercase">
                                                                {post.excerpt}
                                                            </p>

                                                            <hr className="border-t border-black/10 dark:border-white/10 mb-4" />

                                                            <div className="flex items-center justify-between lowercase">
                                                                <div className="flex items-center gap-2">
                                                                    <UserAvatar
                                                                        src={post.authorAvatar}
                                                                        name={post.author || 'User'}
                                                                        size={20}
                                                                    />
                                                                    <button
                                                                        className="text-xs font-bold text-black dark:text-white hover:underline decoration-1 underline-offset-2"
                                                                        onClick={(e) => handleAuthorClick(e, post.author)}
                                                                    >
                                                                        {post.author}
                                                                    </button>
                                                                </div>

                                                                <div
                                                                    className="flex items-center gap-3 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wide whitespace-nowrap overflow-x-auto"
                                                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                                                >
                                                                    <span>{post.date}</span>
                                                                    <span className="text-zinc-300 dark:text-zinc-600">/</span>
                                                                    <span>{post.wordCount} words</span>
                                                                    <span className="text-zinc-300 dark:text-zinc-600">/</span>
                                                                    <span className="text-black dark:text-white font-bold">{post.category}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </details>
                                                ))}
                                            </div>
                                        ) : (
                                            /* LIST VIEW (Focus Table) */
                                            <div className="blog-table-view">
                                                <div className="members">
                                                    <table role="grid">
                                                        <thead>
                                                            <tr>
                                                                <th></th>
                                                                <th>article</th>
                                                                <th>author</th>
                                                                <th>date</th>
                                                                <th>category</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {displayedPosts.map(post => (
                                                                <tr
                                                                    key={post.id}
                                                                    onClick={() => handlePostClick(post)}
                                                                    className="group"
                                                                    tabIndex={0}
                                                                >
                                                                    <td>
                                                                        {getCategoryIcon()}
                                                                    </td>
                                                                    <td className="allow-wrap">
                                                                        <div
                                                                            className="text-cell font-medium lowercase cursor-pointer outline-none"
                                                                            tabIndex={0}
                                                                        >
                                                                            {post.title}
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            readOnly
                                                                            aria-label="author name"
                                                                            type="text"
                                                                            value={post.author || ''}
                                                                            className="text-zinc-500 dark:text-zinc-400 lowercase cursor-pointer bg-transparent"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            readOnly
                                                                            aria-label="date"
                                                                            type="text"
                                                                            value={post.date}
                                                                            className="text-zinc-400 dark:text-zinc-500 lowercase cursor-pointer bg-transparent"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 lowercase">
                                                                            {post.category}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Load More Button */}
                                        {visibleCount < BLOG_POSTS.length && (
                                            <div className="flex justify-center pt-8 pb-4">
                                                <button
                                                    onClick={() => setVisibleCount(prev => prev + 12)}
                                                    className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full text-sm font-medium transition-colors lowercase"
                                                >
                                                    load more articles
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </Window>
                            );
                        } else if (win.type === 'services') {
                            return (
                                <Window
                                    key={win.id}
                                    title="services"
                                    zIndex={win.zIndex}
                                    onFocus={() => bringToFront(win.id)}
                                    onClose={() => closeWindow(win.id)}
                                    initialX={win.initialX}
                                    initialY={win.initialY}
                                >
                                    <div className="p-4">
                                        <h2 className="text-xl font-bold mb-6 lowercase">what we do</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {['web design', 'development', 'branding', 'seo', 'consulting', 'analytics'].map(service => (
                                                <div key={service} className="p-6 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-white/5 hover:border-black/20 dark:hover:border-white/30 transition-colors">
                                                    <h3 className="font-bold text-lg mb-2 lowercase">{service}</h3>
                                                    <p className="text-sm text-zinc-500 lowercase">
                                                        comprehensive {service} solutions tailored for modern businesses seeking growth and digital presence.
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Window>
                            );
                        } else if (win.type === 'about') {
                            return (
                                <Window
                                    key={win.id}
                                    title="about"
                                    zIndex={win.zIndex}
                                    onFocus={() => bringToFront(win.id)}
                                    onClose={() => closeWindow(win.id)}
                                    initialX={win.initialX}
                                    initialY={win.initialY}
                                >
                                    <div className="p-4 max-w-2xl mx-auto text-center space-y-8">
                                        <div className="w-24 h-24 mx-auto rounded-full bg-zinc-200 overflow-hidden relative">
                                            <Image
                                                src="https://i.pravatar.cc/300?u=50"
                                                alt="team"
                                                fill
                                                className="object-cover grayscale"
                                            />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black lowercase mb-4">we are worldinmaking</h2>
                                            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed lowercase">
                                                a digital collective focused on minimizing the noise. we believe in interfaces that disappear, content that breathes, and code that performs. established in 2024, we are rethinking how the web should feel.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 border-t border-zinc-100 dark:border-white/10 pt-8">
                                            <div>
                                                <div className="text-2xl font-bold">12+</div>
                                                <div className="text-xs text-zinc-400 lowercase">awards won</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold">50+</div>
                                                <div className="text-xs text-zinc-400 lowercase">projects</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold">5</div>
                                                <div className="text-xs text-zinc-400 lowercase">team members</div>
                                            </div>
                                        </div>
                                    </div>
                                </Window>
                            );
                        } else if (win.type === 'wim') {
                            return (
                                <Window
                                    key={win.id}
                                    title="write for wim"
                                    zIndex={win.zIndex}
                                    onFocus={() => bringToFront(win.id)}
                                    onClose={() => closeWindow(win.id)}
                                    initialX={win.initialX}
                                    initialY={win.initialY}
                                >
                                    <div className="p-4 max-w-2xl mx-auto space-y-8">
                                        <section className="space-y-4">
                                            <h2 className="text-2xl font-black lowercase">the wim philosophy</h2>
                                            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed lowercase">
                                                worldinmaking is a digital collective focused on minimizing the noise. we believe in interfaces that disappear, content that breathes, and code that performs.
                                            </p>
                                            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed lowercase">
                                                we are looking for writers, designers, and developers who share our obsession with simplicity and substance. if you have a unique perspective on the future of the web, we want to hear from you.
                                            </p>
                                        </section>

                                        <hr className="border-black/5 dark:border-white/5" />

                                        <section>
                                            <h3 className="font-bold text-lg mb-6 lowercase">submit your pitch</h3>
                                            <form
                                                className="space-y-4"
                                                onSubmit={async (e) => {
                                                    e.preventDefault();
                                                    const form = e.target as HTMLFormElement;
                                                    const name = (form.elements[0] as HTMLInputElement).value;
                                                    const email = (form.elements[1] as HTMLInputElement).value;
                                                    const portfolio = (form.elements[2] as HTMLInputElement).value;
                                                    const pitch = (form.elements[3] as HTMLTextAreaElement).value;

                                                    const { error } = await supabase.from('wim_applications').insert({
                                                        name, email, portfolio_url: portfolio, pitch
                                                    });

                                                    if (error) {
                                                        addToast('submission failed: ' + error.message, 'error');
                                                    } else {
                                                        addToast('pitch submitted successfully. good luck.', 'success');
                                                        form.reset();
                                                    }
                                                }}
                                            >
                                                <div className="grid grid-cols-2 gap-4">
                                                    <input required name="name" type="text" placeholder="name" className="w-full p-3 bg-zinc-50 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10 outline-none focus:border-black dark:focus:border-white lowercase" />
                                                    <input required name="email" type="email" placeholder="email" className="w-full p-3 bg-zinc-50 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10 outline-none focus:border-black dark:focus:border-white lowercase" />
                                                </div>
                                                <input required name="portfolio" type="url" placeholder="portfolio / writing sample url" className="w-full p-3 bg-zinc-50 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10 outline-none focus:border-black dark:focus:border-white lowercase" />
                                                <textarea required name="pitch" rows={5} placeholder="what would you like to write about?" className="w-full p-3 bg-zinc-50 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10 outline-none focus:border-black dark:focus:border-white resize-none lowercase"></textarea>
                                                <button className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg lowercase hover:opacity-90">
                                                    submit application
                                                </button>
                                            </form>
                                        </section>
                                    </div>
                                </Window>
                            );
                        } else if (win.type === 'privacy' || win.type === 'terms' || win.type === 'cookies') {
                            // Generic handler for legal documents
                            const legalContent = {
                                privacy: {
                                    title: "privacy policy",
                                    text: "Your privacy is critically important to us. At Worldinmaking, we have a few fundamental principles: We don't ask you for personal information unless we truly need it. We don't share your personal information with anyone except to comply with the law, develop our products, or protect our rights. We don't store personal information on our servers unless required for the on-going operation of one of our services."
                                },
                                terms: {
                                    title: "terms of service",
                                    text: "By accessing this website, you are agreeing to be bound by these web site Terms and Conditions of Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site."
                                },
                                cookies: {
                                    title: "cookie policy",
                                    text: "A cookie is a string of information that a website stores on a visitor's computer, and that the visitor's browser provides to the website each time the visitor returns. Worldinmaking uses cookies to help us identify and track visitors, their usage of our website, and their website access preferences."
                                }
                            }[win.type];

                            return (
                                <Window
                                    key={win.id}
                                    title={legalContent.title}
                                    zIndex={win.zIndex}
                                    onFocus={() => bringToFront(win.id)}
                                    onClose={() => closeWindow(win.id)}
                                    initialX={win.initialX}
                                    initialY={win.initialY}
                                >
                                    <div className="p-8 max-w-2xl mx-auto prose prose-zinc dark:prose-invert">
                                        <h2 className="lowercase mb-4 font-bold">{legalContent.title}</h2>
                                        <p className="lowercase leading-relaxed">{legalContent.text}</p>
                                        <p className="lowercase leading-relaxed mt-4 text-zinc-500">
                                            Last updated: October 24, 2024. If you have any questions about this policy, please contact us.
                                        </p>
                                    </div>
                                </Window>
                            );
                        } else if (win.type === 'login') {
                            return (
                                <Window
                                    key={win.id}
                                    title="member access"
                                    zIndex={win.zIndex}
                                    onFocus={() => bringToFront(win.id)}
                                    onClose={() => closeWindow(win.id)}
                                    initialX={win.initialX}
                                    initialY={win.initialY}
                                >
                                    <LoginContent onClose={() => closeWindow(win.id)} />
                                </Window>
                            )
                        } else if (win.type === 'contact') {
                            return (
                                <Window
                                    key={win.id}
                                    title="contact"
                                    zIndex={win.zIndex}
                                    onFocus={() => bringToFront(win.id)}
                                    onClose={() => closeWindow(win.id)}
                                    initialX={win.initialX}
                                    initialY={win.initialY}
                                >
                                    <div className="p-4 max-w-xl mx-auto">
                                        <h2 className="text-xl font-bold mb-6 lowercase">get in touch</h2>
                                        <form
                                            className="space-y-4"
                                            onSubmit={async (e) => {
                                                e.preventDefault();
                                                const form = e.target as HTMLFormElement;
                                                const name = (form.elements[0] as HTMLInputElement).value;
                                                const email = (form.elements[1] as HTMLInputElement).value;
                                                const subject = (form.elements[2] as HTMLInputElement).value;
                                                const message = (form.elements[3] as HTMLTextAreaElement).value;

                                                const { error } = await supabase.from('contact_messages').insert({
                                                    name, email, message: `[${subject}] ${message}`
                                                }); // Storing subject in message for simplicity or you can alter table

                                                if (error) {
                                                    addToast('failed to send: ' + error.message, 'error');
                                                } else {
                                                    addToast('message sent. we will be in touch.', 'success');
                                                    form.reset();
                                                }
                                            }}
                                        >
                                            <div className="grid grid-cols-2 gap-4">
                                                <input required name="name" type="text" placeholder="name" className="w-full p-3 bg-zinc-50 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10 outline-none focus:border-black dark:focus:border-white lowercase" />
                                                <input required name="email" type="email" placeholder="email" className="w-full p-3 bg-zinc-50 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10 outline-none focus:border-black dark:focus:border-white lowercase" />
                                            </div>
                                            <input required name="subject" type="text" placeholder="subject" className="w-full p-3 bg-zinc-50 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10 outline-none focus:border-black dark:focus:border-white lowercase" />
                                            <textarea required name="message" rows={5} placeholder="message" className="w-full p-3 bg-zinc-50 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/10 outline-none focus:border-black dark:focus:border-white resize-none lowercase"></textarea>
                                            <button className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg lowercase hover:opacity-90">
                                                send message
                                            </button>
                                        </form>
                                        <div className="mt-8 text-center text-sm text-zinc-400 lowercase">
                                            or email us directly at hello@worldinmaking.com
                                        </div>
                                    </div>
                                </Window>
                            );
                        } else if (win.type === 'admin') {
                            return (
                                <Window
                                    key={win.id}
                                    title="control center"
                                    zIndex={win.zIndex}
                                    initialX={win.initialX}
                                    initialY={win.initialY}
                                    onFocus={() => bringToFront(win.id)}
                                    onClose={() => closeWindow(win.id)}
                                >
                                    <AdminContent />
                                </Window>
                            );
                        } else if (win.type === 'settings') {
                            return (
                                <Window
                                    key={win.id}
                                    title="settings"
                                    zIndex={win.zIndex}
                                    initialX={win.initialX}
                                    initialY={win.initialY}
                                    onFocus={() => bringToFront(win.id)}
                                    onClose={() => closeWindow(win.id)}
                                >
                                    <SettingsContent />
                                </Window>
                            );
                        } else if (win.type === 'author' && win.data) {
                            return (
                                <Window
                                    key={win.id}
                                    title={`profile: ${win.data.authorName}`}
                                    zIndex={win.zIndex}
                                    initialX={win.initialX}
                                    initialY={win.initialY}
                                    onFocus={() => bringToFront(win.id)}
                                    onClose={() => closeWindow(win.id)}
                                    initialWidth={600}
                                    initialHeight={500}
                                >
                                    <AuthorProfileContent authorName={(win.data as any).author || (win.data as any).authorName} openWindow={openWindow as any} />
                                </Window>
                            );
                        } else if (win.type === 'post' && win.data) {
                            const activePost = win.data;
                            return (
                                <div key={win.id}>
                                    <Window
                                        title={activePost.title.toLowerCase()}
                                        onClose={() => closeWindow(win.id)}
                                        zIndex={win.zIndex}
                                        initialX={win.initialX}
                                        initialY={win.initialY}
                                        onFocus={() => bringToFront(win.id)}
                                        sidebarContent={
                                            activeWindowSidebarMode === 'toc'
                                                ? (props) => <GetBlogTOCSidebar headings={activePost.headings} activeSection={props.activeSection} />
                                                : <GetBlogRecommendedSidebar currentPostId={activePost.id} onPostClick={handlePostClick} />
                                        }
                                        sidebarPosition={activeWindowSidebarMode === 'toc' ? 'right' : 'left'} // Pass position based on mode
                                        customControls={({ toggleMaximize, isMaximized, maximizeMode, openSidebar }) => (
                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    onClick={() => {
                                                        setActiveWindowSidebarMode('toc');
                                                        openSidebar();
                                                    }}
                                                    className={`w-6 h-6 flex items-center justify-center rounded transition-all active:scale-90 ${activeWindowSidebarMode === 'toc' ? 'bg-black/10 dark:bg-white/20' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                                                    title="table of contents"
                                                >
                                                    <ContentsIcon />
                                                </button>
                                                <button
                                                    onClick={() => toggleMaximize('fullscreen')}
                                                    className={`w-6 h-6 flex items-center justify-center rounded transition-all active:scale-90 ${isMaximized && maximizeMode === 'fullscreen' ? 'bg-black/10 dark:bg-white/20' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                                                    title="reading mode (fullscreen)"
                                                >
                                                    <ReaderIcon />
                                                </button>
                                            </div>
                                        )}
                                    >
                                        <article className="prose prose-zinc max-w-none dark:prose-invert prose-p:text-black dark:prose-p:text-zinc-100 prose-headings:text-black dark:prose-headings:text-white">
                                            <header className="mb-6 not-prose border-b border-black/5 dark:border-white/5 pb-6 lowercase">
                                                {/* Title - resized to previous subtitle size (text-xl) */}
                                                <h1 className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white mb-4 px-3">
                                                    {activePost.title}
                                                </h1>

                                                {/* Divided Meta Container */}
                                                <div
                                                    className="flex flex-nowrap items-center mx-3 border border-black/10 dark:border-white/10 rounded-lg overflow-x-auto divide-x divide-black/10 dark:divide-white/10 bg-zinc-50/50 dark:bg-white/5 text-xs whitespace-nowrap"
                                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                                >
                                                    {/* Author */}
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/10">
                                                        <UserAvatar
                                                            src={activePost.authorAvatar}
                                                            name={activePost.author || 'User'}
                                                            size={16}
                                                        />
                                                        <button
                                                            onClick={(e) => handleAuthorClick(e, activePost.author)}
                                                            className="font-bold text-black dark:text-white hover:underline decoration-1 underline-offset-2"
                                                        >
                                                            {activePost.author}
                                                        </button>
                                                    </div>

                                                    {/* Date */}
                                                    <div className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                                                        {activePost.date}
                                                    </div>

                                                    {/* Category */}
                                                    <div className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                                                        {activePost.category}
                                                    </div>

                                                    {/* Word Count */}
                                                    <div className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                                                        {activePost.wordCount} words
                                                    </div>
                                                </div>
                                            </header>

                                            {/* Body Content - Full Black */}
                                            <div
                                                className="text-black dark:text-zinc-100 leading-relaxed lowercase px-3"
                                                dangerouslySetInnerHTML={{ __html: activePost.content }}
                                            />

                                            {/* Engagement Section */}
                                            <div className="px-3">
                                                <ReactionControl postId={activePost.id} />
                                                <BlogCommentSection postId={Number(activePost.id)} />
                                            </div>
                                        </article>



                                    </Window>
                                </div>
                            );
                        }
                        return null;
                    })}

                </div>
            </main>

            {/* Mobile Sidebar Backdrop */}
            {activeSidebar && (
                <div
                    className="fixed inset-0 bg-black/5 dark:bg-white/5 backdrop-blur-[2px] z-40 transition-opacity"
                    onClick={() => toggleSidebar(null)}
                />
            )}
        </>
    );
};

export default DesktopEnvironment;
