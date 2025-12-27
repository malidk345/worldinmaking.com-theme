'use client';

import React, { useState } from 'react';
import {
    XIcon,
    ContactIcon,
    InstagramIcon,
    BackIcon,
    HomeIcon,
    ServicesIcon,
    AboutIcon,
    SearchIcon,
    CloseIcon,
    ReaderIcon,
    GlobeIcon
} from './Icons';
import { useWindow } from '../contexts/WindowContext';
import { usePosts } from '../hooks/usePosts';
import { BlogPost } from '../types';

const Sidebar: React.FC = () => {
    const {
        activeSidebar,
        toggleSidebar,
        windows,
        recentlyClosed,
        bringToFront,
        closeWindow,
        restorePost,
        openWindow
    } = useWindow();

    const { posts } = usePosts();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPosts = searchQuery
        ? posts.filter(post => {
            const query = searchQuery.toLowerCase();
            return (
                (post.title || '').toLowerCase().includes(query) ||
                (post.category || '').toLowerCase().includes(query) ||
                (post.author || '').toLowerCase().includes(query) ||
                (post.excerpt || '').toLowerCase().includes(query) ||
                (typeof post.content === 'string' && post.content.toLowerCase().includes(query)) // Search in content if string
            );
        })
        : [];

    const handleOpenPage = (page: string) => {
        if (page === 'home') {
            openWindow('home');
        } else {
            openWindow(page as 'services' | 'contact' | 'about' | 'wim');
        }
        toggleSidebar(null);
    };

    const handleOpenPost = (post: BlogPost) => {
        openWindow('post', post);
        toggleSidebar(null);
    };

    const onClose = () => toggleSidebar(null);

    return (
        <aside
            className={`
        fixed top-[8px] left-[8px] bottom-[8px] 
        w-[calc(100vw-16px)] md:w-[calc(40%-8px)]
        z-60 glass rounded-[21px] 
        sidebar-transition
        ${!!activeSidebar ? 'translate-x-0' : '-translate-x-[115%] sidebar-closed'}
      `}
            style={{
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)'
            }}
            aria-label="sidebar navigation"
            aria-hidden={!activeSidebar}
        >
            <div className="content">
                <div className="content__content">
                    <div className="heading">
                        <div className="flex items-center justify-between w-full pl-1 pr-1">
                            <div
                                className="select-none text-xs font-medium px-2 py-0.5 rounded border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 text-blue-900 dark:text-blue-300"
                            >
                                worldinmaking
                            </div>
                            <button
                                onClick={onClose}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 text-zinc-600 dark:text-zinc-300"
                                aria-label="close sidebar"
                            >
                                <BackIcon />
                            </button>
                        </div>

                        {/* SEARCH BAR - Only visible in Search Mode */}
                        {activeSidebar === 'search' && (
                            <div className="w-full px-1 mt-2">
                                <div className="relative">
                                    <input
                                        type="search"
                                        placeholder="search title, author, content..."
                                        autoFocus
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-black/5 dark:bg-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 lowercase [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                                        <SearchIcon size={14} />
                                    </div>
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white p-1"
                                        >
                                            <div className="scale-75"><CloseIcon /></div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="links">
                        <nav className="h-full">
                            {/* === MODE: MENU === */}
                            {activeSidebar === 'menu' && (
                                <>
                                    <div className="mt-2"></div>
                                    <h3>links</h3>
                                    <ul>
                                        <SidebarLink onClick={() => handleOpenPage('home')} icon={<HomeIcon />} text="home" />
                                        <SidebarLink onClick={() => handleOpenPage('services')} icon={<ServicesIcon />} text="services" />
                                        <SidebarLink onClick={() => handleOpenPage('contact')} icon={<ContactIcon />} text="contact" />
                                        <SidebarLink onClick={() => handleOpenPage('about')} icon={<AboutIcon />} text="about" />
                                        <SidebarLink onClick={() => handleOpenPage('wim')} icon={<GlobeIcon />} text="write for wim" />
                                    </ul>
                                    <h3>socials</h3>
                                    <ul>
                                        <SidebarLink href="https://x.com/intent/follow?screen_name=jh3yy" icon={<XIcon />} text="x" />
                                        <SidebarLink href="https://instagram.com/jh3yyyy" icon={<InstagramIcon />} text="instagram" />
                                    </ul>
                                </>
                            )}

                            {/* === MODE: SEARCH === */}
                            {activeSidebar === 'search' && (
                                <div className="px-2 pb-4">
                                    {!searchQuery ? (
                                        <div className="text-center mt-12 text-zinc-400 text-sm">
                                            type to search...
                                        </div>
                                    ) : filteredPosts.length === 0 ? (
                                        <div className="text-center mt-12 text-zinc-400 text-sm">
                                            no results found.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col mt-2">
                                            {filteredPosts.map((post, idx) => (
                                                <React.Fragment key={post.id}>
                                                    <div
                                                        onClick={() => handleOpenPost(post)}
                                                        className="group flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                                                        role="button"
                                                        tabIndex={0}
                                                    >
                                                        <div className="text-zinc-500 dark:text-zinc-400">
                                                            <ReaderIcon />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate block leading-tight">
                                                                {post.title}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {idx < filteredPosts.length - 1 && (
                                                        <div className="h-px bg-black/10 dark:bg-white/10 mx-2" />
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* === MODE: TABS (List Layout) === */}
                            {activeSidebar === 'tabs' && (
                                <div className="px-2 pb-4 mt-2">
                                    <h3 className="text-xs font-bold text-zinc-400 mb-2 px-2 lowercase">active tabs</h3>
                                    <div className="flex flex-col">
                                        {/* Active Windows */}
                                        {windows.map((win, idx) => (
                                            <React.Fragment key={win.id}>
                                                <div
                                                    onClick={() => {
                                                        bringToFront(win.id);
                                                        onClose();
                                                    }}
                                                    className="group flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                                                    role="button"
                                                    tabIndex={0}
                                                >
                                                    <div className="text-zinc-700 dark:text-zinc-300">
                                                        {win.type === 'home' ? <HomeIcon /> : <ReaderIcon />}
                                                    </div>
                                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1 leading-none pt-0.5">
                                                        {win.title}
                                                    </span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                                                        className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                        title="close tab"
                                                        aria-label={`close window ${win.title}`}
                                                    >
                                                        <div className="scale-75"><CloseIcon /></div>
                                                    </button>
                                                </div>
                                                {/* Separator line between items, but not after the last one */}
                                                {idx < windows.length - 1 && (
                                                    <div className="h-px bg-zinc-200 dark:bg-white/10 mx-2 my-0.5" />
                                                )}
                                            </React.Fragment>
                                        ))}

                                        {/* Recently Closed (Faded) - Add a spacer before if windows exist */}
                                        {recentlyClosed.length > 0 && windows.length > 0 && (
                                            <div className="h-4"></div>
                                        )}

                                        {recentlyClosed.map((post, idx) => (
                                            <div
                                                key={`history-${post.id}-${idx}`}
                                                onClick={() => {
                                                    restorePost(post);
                                                    onClose();
                                                }}
                                                className="group flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-all opacity-40 hover:opacity-100"
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`restore post ${post.title}`}
                                            >
                                                <div className="text-zinc-700 dark:text-zinc-300">
                                                    <ReaderIcon />
                                                </div>
                                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1 leading-none pt-0.5">
                                                    {post.title.toLowerCase()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </nav>
                    </div>
                </div>
            </div>
        </aside>
    );
};

// Modified SidebarLink to support both external href and internal onClick
const SidebarLink: React.FC<{ href?: string, onClick?: () => void, icon: React.ReactNode, text: string }> = ({ href, onClick, icon, text }) => {
    if (onClick) {
        return (
            <li>
                <button onClick={onClick}>
                    {icon}
                    <span>{text}</span>
                </button>
            </li>
        );
    }
    return (
        <li>
            <a href={href} target="_blank" rel="noopener noreferrer">
                {icon}
                <span>{text}</span>
            </a>
        </li>
    );
};

export default Sidebar;
