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
                    default:
                        return null;
                }
            })}
        </AnimatePresence>
    );
}
