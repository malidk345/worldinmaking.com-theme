"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';

const PATH_MAP = {
    '/': { type: 'home', title: 'Home' },
    '/explore': { type: 'search', title: 'Explore' },
    '/search': { type: 'search', title: 'Search' },
    '/settings': { type: 'settings', title: 'Settings' },
    '/profile': { type: 'profile', title: 'Profile' },
    '/community': { type: 'community', title: 'Community' },
    '/login': { type: 'login', title: 'Login' },
    '/admin': { type: 'admin', title: 'Admin' },
    '/about': { type: 'about', title: 'About' },
    '/contact': { type: 'contact', title: 'Contact' },
    '/services': { type: 'services', title: 'Services' },
    '/write-for-wim': { type: 'write-for-wim', title: 'Write for WIM' },
    '/instagram': { type: 'instagram', title: 'Instagram' },
    '/x': { type: 'x', title: 'X' }
};

export default function WindowSync() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { openWindow, windows, bringToFront } = useWindow();

    const lastSyncedPath = useRef(null);
    const windowsRef = useRef(windows);

    // Keep ref in sync
    useEffect(() => {
        windowsRef.current = windows;
    }, [windows]);

    useEffect(() => {
        if (!pathname) return;

        // Normalize pathname to remove trailing slash (except for root)
        const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');

        if (normalizedPath === lastSyncedPath.current) return;

        let type = null;
        let title = "";

        const config = PATH_MAP[normalizedPath];

        if (config) {
            type = config.type;
            title = config.title;
        } else if (pathname.startsWith('/post')) {
            type = 'post';
            const postId = searchParams.get('id');
            if (postId) {
                lastSyncedPath.current = normalizedPath; // Set for post pages too

                const currentWindows = windowsRef.current;
                const existing = currentWindows.find(w => w.type === 'post' && w.id === `post-window-${postId}`);
                if (existing) {
                    const isTop = currentWindows[currentWindows.length - 1]?.id === existing.id;
                    if (!isTop || existing.isMinimized) {
                        bringToFront(existing.id);
                    }
                } else {
                    openWindow('post', {
                        id: `post-window-${postId}`,
                        title: 'Loading...',
                        isMaximized: true
                    });
                }
                return; // Early return for post pages
            }
        }

        if (type) {
            lastSyncedPath.current = normalizedPath;

            const currentWindows = windowsRef.current;
            const existing = currentWindows.find(w => w.type === type);
            if (existing) {
                const isTop = currentWindows[currentWindows.length - 1]?.id === existing.id;
                if (!isTop || existing.isMinimized) {
                    bringToFront(existing.id);
                }
            } else {
                openWindow(type, {
                    id: `${type}-window`,
                    title: title,
                    isMaximized: true
                });
            }
        }
    }, [pathname, searchParams, openWindow, bringToFront]);

    return null;
}

