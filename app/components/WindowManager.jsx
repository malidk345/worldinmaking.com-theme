'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';
import HomeWindow from './HomeWindow';
import BlogWindow from './BlogWindow';
import AuthorProfileWindow from './AuthorProfileWindow';
import ProfileContent from '../profile/ProfileContent';

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

    // Window z-index range: 10-80 (stays below sidebar z-[90] and header z-50 overlay)
    // Header is z-50, Sidebar is z-[90-100], so windows must be 10-89
    const BASE_Z = 10;
    const MAX_Z = 80;

    return (
        <AnimatePresence>
            {windows.map((win, index) => {
                if (win.isMinimized) return null;

                // z-index: 10 + index, capped at MAX_Z
                const zIndex = Math.min(BASE_Z + index, MAX_Z);

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
                    case 'profile':
                        return (
                            <ProfileContent
                                {...commonProps}
                                isWindowMode={true}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </AnimatePresence>
    );
}
