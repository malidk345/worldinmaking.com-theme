"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';

export default function KeyboardShortcuts() {
    const router = useRouter();
    const { windows, closeWindow } = useWindow();

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Cmd+K or Ctrl+K for Search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                router.push('/search');
            }

            // Esc to close top-most window
            if (e.key === 'Escape') {
                if (windows.length > 0) {
                    const topWindow = windows[windows.length - 1];
                    closeWindow(topWindow.id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router, windows, closeWindow]);

    return null;
}
