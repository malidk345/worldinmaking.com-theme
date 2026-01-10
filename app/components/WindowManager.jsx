'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
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
                                onClose={() => closeWindow(win.id)}
                            />
                        );
                    case 'blog':
                    case 'post':
                        return (
                            <BlogWindow
                                key={win.id}
                                onClose={() => closeWindow(win.id)}
                            />
                        );
                    case 'author-profile':
                        return (
                            <AuthorProfileWindow
                                key={win.id}
                                username={win.username}
                                onClose={() => closeWindow(win.id)}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </AnimatePresence>
    );
}
