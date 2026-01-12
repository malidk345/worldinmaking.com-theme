'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';
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
import Window from './Window';

/**
 * WindowManager
 * Simple rule: windows are rendered in array order.
 * Last window in array = on top (higher z-index).
 */
export default function WindowManager() {
    const { windows, closeWindow, bringToFront, updateWindow } = useWindow();
    const router = useRouter();
    const pathname = usePathname();

    const handleClose = (id, type) => {
        closeWindow(id);

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
                            <ProfileContent
                                {...commonProps}
                                isWindowMode={true}
                            />
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
                    default:
                        return null;
                }
            })}
        </AnimatePresence>
    );
}
