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
 * Simple rule: windows are rendered in array order.
 * Last window in array = on top (higher z-index).
 */
export default function WindowManager() {
    const { windows, closeWindow, bringToFront } = useWindow();
    const router = useRouter();
    const pathname = usePathname();

    const handleClose = (id, type) => {
        closeWindow(id);

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

    // Base z-index for windows
    const BASE_Z = 100;

    return (
        <AnimatePresence>
            {windows.map((win, index) => {
                if (win.isMinimized) return null;

                // z-index based on position in array: later = higher
                const zIndex = BASE_Z + index;

                const commonProps = {
                    key: win.id,
                    zIndex,
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
