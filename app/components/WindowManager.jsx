'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';
import { useTabs } from '../context/TabContext';
import HomeWindow from './HomeWindow';
import BlogWindow from './BlogWindow';
import ExplorePage from '../explore/ExploreContent';
import SearchPage from '../search/SearchContent';
import AuthorProfileWindow from './AuthorProfileWindow';
import ProfileContent from '../profile/ProfileContent';
import SettingsContent from '../settings/SettingsContent';
import LoginContent from '../login/LoginContent';
import CommunityContent from '../community/CommunityContent';
import AdminContent from '../admin/AdminContent';
import AboutContent from '../about/AboutContent';
import ContactContent from '../contact/ContactContent';
import ServicesContent from '../services/ServicesContent';
import WriteForWimContent from '../write-for-wim/WriteContent';
import InstagramContent from '../instagram/InstagramContent';
import XContent from '../x/XContent';
import Window from './Window';

/**
 * WindowManager
 * Simple rule: windows are rendered in array order.
 * Last window in array = on top (higher z-index).
 */
export default function WindowManager() {
    const { windows, closeWindow, bringToFront, updateWindow } = useWindow();
    const { tabs, closeTab } = useTabs();
    const router = useRouter();
    const pathname = usePathname();

    const handleClose = (id, type) => {
        closeWindow(id);

        // Map window type to likely path to find matching tab
        let targetPath = null;
        if (type === 'home') targetPath = '/';
        else if (type === 'post') {
            // For posts, we might not know exact ID here easily without extracting from window props or id
            // But usually post windows have id like 'post-window-{id}' or similar. 
            // Let's rely on type mapping for simple pages first.
            // If it's a blog post, the window ID is usually `blog-window-${id}` or `post-${id}`
        } else {
            targetPath = `/${type}`;
        }

        // Find tab with matching path
        if (targetPath) {
            const tab = tabs.find(t => t.path === targetPath || t.path.startsWith(`${targetPath}?`));
            if (tab) {
                const navigateTo = closeTab(tab.id);
                if (navigateTo && navigateTo !== pathname) {
                    router.push(navigateTo);
                    return; // closeTab handles navigation calculation
                }
            }
        }

        // Fallback navigation if tab wasn't found or closeTab didn't return nav
        if (type === 'blog' || type === 'post') {
            if (pathname.startsWith('/post')) {
                router.push('/');
            }
        } else if (type === 'profile' || type === 'explore' || type === 'search') {
            if (pathname.startsWith(`/${type}`) || (type === 'profile' && pathname.startsWith('/profile'))) {
                router.push('/');
            }
        }
    };

    // Window z-index range: 10-80 (stays below sidebar z-[90] and header z-50 overlay)
    const BASE_Z = 10;
    const MAX_Z = 80;

    return (
        <AnimatePresence>
            {windows.map((win, index) => {
                // Minimized windows should still be rendered (as titles/tabs)

                const zIndex = Math.min(BASE_Z + index, MAX_Z);

                const commonProps = {
                    key: win.id,
                    id: win.id,
                    zIndex,
                    initialX: win.x,
                    initialY: win.y,
                    initialWidth: win.width,
                    initialHeight: win.height,
                    isMaximized: win.isMaximized,
                    isMinimized: win.isMinimized,
                    onFocus: () => bringToFront(win.id),
                    onClose: () => handleClose(win.id, win.type),
                    onPositionChange: (pos) => updateWindow(win.id, { x: pos.x, y: pos.y }),
                    onSizeChange: (size) => updateWindow(win.id, { width: size.width, height: size.height }),
                    onMaximizeChange: (maximized) => updateWindow(win.id, { isMaximized: maximized }),
                    onMinimizeChange: (minimized) => updateWindow(win.id, { isMinimized: minimized })
                };

                switch (win.type) {
                    case 'home':
                        return <HomeWindow {...commonProps} />;
                    case 'blog':
                    case 'post':
                        return <BlogWindow {...commonProps} />;
                    case 'author-profile':
                        return (
                            <AuthorProfileWindow
                                {...commonProps}
                                username={win.username}
                            />
                        );
                    case 'profile':
                        return (
                            <Window {...commonProps} title="Profile" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}>
                                <ProfileContent isWindowMode={true} />
                            </Window>
                        );
                    case 'explore':
                        return (
                            <Window {...commonProps} title="Explore" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}>
                                <ExplorePage isWindowMode={true} />
                            </Window>
                        );
                    case 'search':
                        return (
                            <Window {...commonProps} title="Search" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}>
                                <SearchPage isWindowMode={true} />
                            </Window>
                        );
                    case 'settings':
                        return (
                            <Window {...commonProps} title="Settings" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>
                                <SettingsContent isWindowMode={true} />
                            </Window>
                        );
                    case 'login':
                        return (
                            <Window {...commonProps} title="Login" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}>
                                <LoginContent isWindowMode={true} />
                            </Window>
                        );
                    case 'community':
                        return (
                            <Window {...commonProps} title="Community" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}>
                                <CommunityContent isWindowMode={true} />
                            </Window>
                        );
                    case 'admin':
                        return (
                            <Window {...commonProps} title="Admin" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}>
                                <AdminContent isWindowMode={true} />
                            </Window>
                        );
                    case 'about':
                        return (
                            <Window {...commonProps} title="About" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                                <AboutContent isWindowMode={true} />
                            </Window>
                        );
                    case 'contact':
                        return (
                            <Window {...commonProps} title="Contact" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}>
                                <ContactContent isWindowMode={true} />
                            </Window>
                        );
                    case 'services':
                        return (
                            <Window {...commonProps} title="Services" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}>
                                <ServicesContent isWindowMode={true} />
                            </Window>
                        );
                    case 'write-for-wim':
                        return (
                            <Window {...commonProps} title="Write for WIM" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}>
                                <WriteForWimContent isWindowMode={true} />
                            </Window>
                        );
                    case 'instagram':
                        return (
                            <Window {...commonProps} title="Instagram" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}>
                                <InstagramContent isWindowMode={true} />
                            </Window>
                        );
                    case 'x':
                        return (
                            <Window {...commonProps} title="X" icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>}>
                                <XContent isWindowMode={true} />
                            </Window>
                        );
                    default:
                        return null;
                }
            })}
        </AnimatePresence>
    );
}
