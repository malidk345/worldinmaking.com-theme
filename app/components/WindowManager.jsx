'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';
import HomeWindow from './HomeWindow';
import BlogWindow from './BlogWindow';
import AuthorProfileWindow from './AuthorProfileWindow';

/**
 * WindowManager
 * Responsbile for rendering all active windows from the WindowContext
 */
export default function WindowManager() {
    const { windows, closeWindow, bringToFront } = useWindow();
    const router = useRouter();
    const pathname = usePathname();

    const handleClose = (id, type) => {
        closeWindow(id);

        // Navigation logic for specific routes
        if (type === 'blog' || type === 'post') {
            if (pathname.startsWith('/post')) {
                router.push('/');
            }
        } else if (type === 'profile') {
            if (pathname.startsWith('/profile')) {
                router.push('/');
            }
        }
    };

    return (
        <AnimatePresence>
            {/* Sort windows by zIndex to ensure proper stacking order in DOM */}
            {[...windows].sort((a, b) => a.zIndex - b.zIndex).map((win) => {
                // Return null if window is minimized (they are usually hidden or moved to taskbar)
                if (win.isMinimized) return null;

                const commonProps = {
                    key: win.id,
                    zIndex: win.zIndex,
                    onFocus: () => bringToFront(win.id),
                    onClose: () => handleClose(win.id, win.type)
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
                    default:
                        return null;
                }
            })}
        </AnimatePresence>
    );
}
