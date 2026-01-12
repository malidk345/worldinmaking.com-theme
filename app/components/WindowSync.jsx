"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';

export default function WindowSync() {
    const pathname = usePathname();
    const { openWindow, windows, bringToFront } = useWindow();

    // Use a ref to track the last synced path to avoid redundant calls
    const lastSyncedPath = useRef(null);

    useEffect(() => {
        if (!pathname || pathname === lastSyncedPath.current) return;

        // Map path to window type
        let type = null;
        let title = "";

        if (pathname === '/') {
            type = 'home';
            title = 'Home';
        } else if (pathname === '/explore') {
            type = 'explore';
            title = 'Explore';
        } else if (pathname === '/search') {
            type = 'search';
            title = 'Search';
        }

        if (type) {
            // Update last synced path before calling state-changing functions
            lastSyncedPath.current = pathname;

            const existing = windows.find(w => w.type === type);
            if (existing) {
                // If it's already the top window, don't bring to front
                const isTop = windows[windows.length - 1]?.id === existing.id;
                if (!isTop) {
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
    }, [pathname, openWindow, bringToFront, windows]); // windows is needed for find and isTop check

    return null;
}
