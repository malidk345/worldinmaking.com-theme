'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WindowInstance, BlogPost, SidebarMode } from '../types';
import { BLOG_POSTS } from '../data/posts';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { slugify } from '../utils/helpers';

interface WindowContextType {
    windows: WindowInstance[];
    activeSidebar: SidebarMode;
    recentlyClosed: BlogPost[];
    viewMode: 'grid' | 'list';

    openWindow: (type: WindowInstance['type'], data?: BlogPost) => void;
    closeWindow: (id: string) => void;
    bringToFront: (id: string) => void;
    toggleSidebar: (mode: SidebarMode) => void;
    setViewMode: (mode: 'grid' | 'list') => void;
    restorePost: (post: BlogPost) => void;
    activeWindowSidebarMode: 'recommended' | 'toc';
    setActiveWindowSidebarMode: (mode: 'recommended' | 'toc') => void;
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

// Helper to calculate next Z-Index
const getNextZIndex = (currentWindows: WindowInstance[]) => {
    if (currentWindows.length === 0) return 10;
    const maxZ = Math.max(...currentWindows.map(w => w.zIndex));
    return maxZ + 1;
};

export const WindowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [windows, setWindows] = useState<WindowInstance[]>([]);
    const [activeSidebar, setActiveSidebar] = useState<SidebarMode>(null);
    const [recentlyClosed, setRecentlyClosed] = useState<BlogPost[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeWindowSidebarMode, setActiveWindowSidebarMode] = useState<'recommended' | 'toc'>('recommended');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load state from localStorage on mount
    useEffect(() => {
        try {
            const savedWindows = localStorage.getItem('app-windows');
            const savedHistory = localStorage.getItem('app-history');

            if (savedWindows) {
                const parsedWindows: { id: string; type: WindowInstance['type']; title?: string; zIndex: number; dataId?: number; initialX?: number; initialY?: number }[] = JSON.parse(savedWindows);
                // Rehydrate windows (finding data for posts)
                const hydratedWindows: WindowInstance[] = parsedWindows.map(w => {
                    let data = undefined;
                    if (w.type === 'post' && w.dataId) {
                        data = BLOG_POSTS.find(p => p.id === w.dataId);
                    }
                    return { ...w, data };
                });

                // If no windows (e.g. first load ever), show Home
                if (hydratedWindows.length === 0) {
                    setWindows([{ id: 'home', type: 'home', title: 'home', zIndex: 10, initialX: 50, initialY: 80 }]);
                } else {
                    setWindows(hydratedWindows);
                }
            } else {
                // Default initial state
                setWindows([{ id: 'home', type: 'home', title: 'home', zIndex: 10, initialX: 50, initialY: 80 }]);
            }

            if (savedHistory) {
                // Rehydrate history
                const parsedHistoryIds: number[] = JSON.parse(savedHistory);
                const hydratedHistory = parsedHistoryIds
                    .map(id => BLOG_POSTS.find(p => p.id === id))
                    .filter((p): p is BlogPost => !!p);
                setRecentlyClosed(hydratedHistory);
            }
        } catch (e) {
            console.error("Failed to load state", e);
            setWindows([{ id: 'home', type: 'home', title: 'home', zIndex: 10, initialX: 50, initialY: 80 }]);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (!isLoaded) return;

        // Serialize windows (store ID, type, dataId, zIndex) - NOT the full React node or big data
        const serializableWindows = windows.map(w => ({
            id: w.id,
            type: w.type,
            title: w.title,
            zIndex: w.zIndex,
            dataId: w.data?.id, // Only save the ID of the post
            initialX: w.initialX,
            initialY: w.initialY
        }));

        localStorage.setItem('app-windows', JSON.stringify(serializableWindows));
    }, [windows, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        // Save history (only IDs)
        const historyIds = recentlyClosed.map(p => p.id);
        localStorage.setItem('app-history', JSON.stringify(historyIds));
    }, [recentlyClosed, isLoaded]);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // --- URL SYNC LOGIC ---

    // 1. Initial Load: URL -> State
    useEffect(() => {
        if (!isLoaded) return;

        // Check for 'app' parameter
        const appParam = searchParams.get('app');
        const postParam = searchParams.get('post'); // slug or id

        if (appParam) {
            if (appParam === 'post' && postParam) {
                // Find post by ID or Slug
                const post = BLOG_POSTS.find(p => p.id.toString() === postParam || slugify(p.title) === postParam);
                if (post) {
                    // Check if already open to avoid conflict with localStorage restoration
                    setWindows(prev => {
                        if (prev.some(w => w.id === `post-${post.id}`)) return prev;
                        return [...prev, {
                            id: `post-${post.id}`,
                            type: 'post',
                            data: post,
                            title: post.title.toLowerCase(),
                            zIndex: getNextZIndex(prev) + 1, // Ensure it's on top
                            initialX: 50, // Default position
                            initialY: 80
                        }];
                    });
                }
            } else if (appParam !== 'home') {
                // Generic window
                openWindow(appParam as any);
            }
        }
    }, [isLoaded]); // Run once after hydration

    // 2. State Change: State -> URL
    useEffect(() => {
        if (!isLoaded) return;

        // Find the active (topmost) window
        // Filter out minimized windows if we want? No, minimized windows are still "open".
        // But usually URL reflects the focused window.

        let activeWindow: WindowInstance | undefined;

        if (windows.length > 0) {
            // Sort by zIndex descending
            const sorted = [...windows].sort((a, b) => b.zIndex - a.zIndex);
            activeWindow = sorted[0];
        }

        const params = new URLSearchParams();

        if (activeWindow && activeWindow.type !== 'home') {
            params.set('app', activeWindow.type);
            if (activeWindow.type === 'post' && activeWindow.data) {
                params.set('post', slugify(activeWindow.data.title));
            }
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        } else {
            // If home is active or no windows, clean URL
            // Check if we need to clean to avoid duplicate push
            if (searchParams.toString() !== '') {
                router.push(pathname, { scroll: false });
            }
        }
    }, [windows, isLoaded, pathname, router]);


    const bringToFront = useCallback((id: string) => {
        setWindows(prev => {
            const targetWindow = prev.find(w => w.id === id);
            const nextZ = getNextZIndex(prev);
            if (targetWindow && targetWindow.zIndex === nextZ - 1) return prev;
            return prev.map(w => w.id === id ? { ...w, zIndex: nextZ } : w);
        });
    }, []);

    const openWindow = (type: WindowInstance['type'], data?: BlogPost) => {
        const id = type === 'home' ? 'home' : (type === 'post' ? `post-${data?.id}` : type);

        setWindows(prev => {
            const exists = prev.find(w => w.id === id);
            const nextZ = getNextZIndex(prev);

            if (exists) {
                return prev.map(w => w.id === id ? { ...w, zIndex: nextZ } : w);
            } else {
                // Cascade Logic
                const lastWin = prev[prev.length - 1];
                let startX = 32;
                let startY = 80;

                if (lastWin && typeof window !== 'undefined') {
                    const cascadeOffset = 30;
                    const resetThresholdX = window.innerWidth * 0.6;
                    const resetThresholdY = window.innerHeight * 0.6;

                    if (lastWin.initialX && lastWin.initialY &&
                        lastWin.initialX < resetThresholdX &&
                        lastWin.initialY < resetThresholdY
                    ) {
                        startX = lastWin.initialX + cascadeOffset;
                        startY = lastWin.initialY + cascadeOffset;
                    }
                }

                return [...prev, {
                    id,
                    type,
                    data,
                    title: type === 'post' ? data?.title.toLowerCase() : (type === 'wim' ? 'write for wim' : (type === 'login' ? 'member access' : type)),
                    zIndex: nextZ,
                    initialX: startX,
                    initialY: startY
                }];
            }
        });

        if (type === 'post') {
            setActiveWindowSidebarMode('recommended');
        }

        if (activeSidebar === 'search') {
            setActiveSidebar(null);
        }
    };

    const closeWindow = (id: string) => {
        const win = windows.find(w => w.id === id);
        if (win && win.type === 'post' && win.data) {
            setRecentlyClosed(prev => {
                if (prev.find(p => p.id === win.data!.id)) return prev;
                return [win.data!, ...prev].slice(0, 10);
            });
        }
        setWindows(prev => prev.filter(w => w.id !== id));
    };

    const toggleSidebar = (mode: SidebarMode) => {
        setActiveSidebar(prev => prev === mode ? null : mode);
    };

    const restorePost = (post: BlogPost) => {
        openWindow('post', post);
    };

    // --- Accessibility: Keyboard Navigation (Alt + Arrow Keys) ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Alt + Left/Right Arrow
            if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
                e.preventDefault();

                if (windows.length <= 1) return;

                // Sort windows by zIndex to find the current top and order
                const sortedWindows = [...windows].sort((a, b) => a.zIndex - b.zIndex);
                const topWindow = sortedWindows[sortedWindows.length - 1];
                const currentIndex = sortedWindows.findIndex(w => w.id === topWindow.id);

                let nextWindow;
                if (e.key === 'ArrowLeft') {
                    // Previous window (visually behind)
                    nextWindow = currentIndex > 0 ? sortedWindows[currentIndex - 1] : sortedWindows[sortedWindows.length - 1];
                } else {
                    // Next window (cycle loop)
                    nextWindow = currentIndex < sortedWindows.length - 1 ? sortedWindows[currentIndex + 1] : sortedWindows[0];
                }

                if (nextWindow) {
                    bringToFront(nextWindow.id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [windows, bringToFront]);

    // Don't render children until client-side state is loaded
    if (!isLoaded) {
        return null;
    }

    return (
        <WindowContext.Provider value={{
            windows,
            activeSidebar,
            recentlyClosed,
            viewMode,
            openWindow,
            closeWindow,
            bringToFront,
            toggleSidebar,
            setViewMode,
            restorePost,
            activeWindowSidebarMode,
            setActiveWindowSidebarMode
        }}>
            {children}
        </WindowContext.Provider>
    );
};

export const useWindow = () => {
    const context = useContext(WindowContext);
    if (!context) throw new Error('useWindow must be used within a WindowProvider');
    return context;
};
