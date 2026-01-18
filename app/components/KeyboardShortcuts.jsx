"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';

export default function KeyboardShortcuts() {
    const router = useRouter();
    const { windows, focusedId, closeWindow } = useWindow();

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Cmd+K or Ctrl+K for Search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                router.push('/search');
            }

            // PostHog-style: Esc closes the focused window (not just the last one)
            if (e.key === 'Escape') {
                // Prioritize focused window, fall back to last window
                const windowToClose = focusedId || (windows.length > 0 ? windows[windows.length - 1].id : null);
                if (windowToClose && windows.length > 1) {
                    // Don't close if it's the only window
                    closeWindow(windowToClose);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router, windows, focusedId, closeWindow]);

    return null;
}
