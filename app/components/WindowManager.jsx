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
    const { windows, closeWindow } = useWindow();
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
            {windows.map((win) => {
                // Return null if window is minimized (they are usually hidden or moved to taskbar)
                if (win.isMinimized) return null;

                switch (win.type) {
                    case 'home':
                        return (
                            <HomeWindow
                                key={win.id}
                                onClose={() => handleClose(win.id, win.type)}
                            />
                        );
                    case 'blog':
                    case 'post':
                        return (
                            <BlogWindow
                                key={win.id}
                                onClose={() => handleClose(win.id, win.type)}
                            />
                        );
                    case 'author-profile':
                        return (
                            <AuthorProfileWindow
                                key={win.id}
                                username={win.username}
                                onClose={() => handleClose(win.id, win.type)}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </AnimatePresence>
    );
}
