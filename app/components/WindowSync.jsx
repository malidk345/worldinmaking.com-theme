"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';

export default function WindowSync() {
    const pathname = usePathname();
    const { openWindow, windows, bringToFront } = useWindow();

    const lastSyncedPath = useRef(null);

    useEffect(() => {
        if (!pathname) return;

        // Normalize pathname to remove trailing slash (except for root)
        const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');

        if (normalizedPath === lastSyncedPath.current) return;

        let type = null;
        let title = "";

        const pathMap = {
            '/': { type: 'home', title: 'Home' },
            '/explore': { type: 'explore', title: 'Explore' },
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

        const config = pathMap[normalizedPath];

        if (config) {
            type = config.type;
            title = config.title;
        } else if (pathname.startsWith('/post')) {
            // Blog/Post windows are usually handled by explicit clicks, 
            // but we could sync them here too if needed.
        }

        if (type) {
            lastSyncedPath.current = normalizedPath;

            const existing = windows.find(w => w.type === type);
            if (existing) {
                const isTop = windows[windows.length - 1]?.id === existing.id;
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
    }, [pathname, openWindow, bringToFront, windows]);

    return null;
}
