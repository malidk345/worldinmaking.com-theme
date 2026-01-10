'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger';
import { useTabs } from '../context/TabContext';

/**
 * Window Context for managing floating window instances
 * Adapted from worldinmaking.com window system for posthog-next
 */

const WindowContext = createContext(undefined);

// Helper to calculate next Z-Index
const getNextZIndex = (currentWindows) => {
    if (currentWindows.length === 0) return 10;
    const maxZ = Math.max(...currentWindows.map(w => w.zIndex));
    return maxZ + 1;
};

export const WindowProvider = ({ children }) => {
    const [windows, setWindows] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const { setActiveTab, addTab, closeTab: closeTabContext } = useTabs();

    // Load state from localStorage on mount
    useEffect(() => {
        try {
            const savedWindows = localStorage.getItem('posthog-windows');

            if (savedWindows) {
                const parsedWindows = JSON.parse(savedWindows);
                setWindows(parsedWindows);
            }
        } catch (e) {
            logger.error("[WindowContext] Failed to load window state", e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (!isLoaded) return;

        const serializableWindows = windows.map(w => ({
            id: w.id,
            type: w.type,
            title: w.title,
            zIndex: w.zIndex,
            isMaximized: w.isMaximized,
            pos: w.pos,
            size: w.size
        }));

        localStorage.setItem('posthog-windows', JSON.stringify(serializableWindows));
    }, [windows, isLoaded]);

    const bringToFront = useCallback((id) => {
        setWindows(prev => {
            const targetWindow = prev.find(w => w.id === id);
            const nextZ = getNextZIndex(prev);

            // Sync with tabs - map home-window to home
            const tabId = id === 'home-window' ? 'home' : id;
            setActiveTab(tabId);

            if (targetWindow && targetWindow.zIndex === nextZ - 1) return prev;
            return prev.map(w => w.id === id ? { ...w, zIndex: nextZ, isMinimized: false } : w);
        });
    }, [setActiveTab]);

    const openWindow = useCallback((type, options = {}) => {
        const { id, title, initialX, initialY, initialWidth, initialHeight } = options;
        const windowId = id || `window-${type}-${Date.now()}`;

        setWindows(prev => {
            const exists = prev.find(w => w.id === windowId);
            const nextZ = getNextZIndex(prev);

            if (exists) {
                // Bring existing window to front
                return prev.map(w => w.id === windowId ? { ...w, zIndex: nextZ, isMinimized: false } : w);
            } else {
                // Calculate cascade position
                const lastWin = prev[prev.length - 1];
                let startX = initialX ?? 50;
                let startY = initialY ?? 80;

                if (lastWin && typeof window !== 'undefined') {
                    const cascadeOffset = 30;
                    const resetThresholdX = window.innerWidth * 0.6;
                    const resetThresholdY = window.innerHeight * 0.6;

                    if (lastWin.pos?.x && lastWin.pos?.y &&
                        lastWin.pos.x < resetThresholdX &&
                        lastWin.pos.y < resetThresholdY
                    ) {
                        startX = lastWin.pos.x + cascadeOffset;
                        startY = lastWin.pos.y + cascadeOffset;
                    }
                }

                const newWindow = {
                    ...options,
                    id: windowId,
                    type,
                    title: title || type,
                    zIndex: nextZ,
                    isMaximized: options.isMaximized ?? true, // Respect provided value
                    isMinimized: false,
                    pos: { x: startX, y: startY },
                    size: { width: initialWidth ?? 700, height: initialHeight ?? 500 }
                };

                // Sync with tabs
                let tabPath = options.path || '#';
                if (type === 'home') tabPath = '/';
                else if (type === 'blog' || type === 'post') tabPath = `/post?id=${windowId.replace('blog-window-', '')}`;
                else if (type === 'author-profile') tabPath = `/profile/${options.username || 'user'}`;

                const tabId = windowId === 'home-window' ? 'home' : windowId;
                addTab({
                    id: tabId,
                    title: title || type,
                    path: tabPath,
                });

                return [...prev, newWindow];
            }
        });
    }, [addTab]);

    const closeWindow = useCallback((id) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        // Sync with tabs
        const tabId = id === 'home-window' ? 'home' : id;
        closeTabContext(tabId);
    }, [closeTabContext]);

    const updateWindow = useCallback((id, updates) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    }, []);

    const toggleMaximize = useCallback((id) => {
        setWindows(prev => prev.map(w => {
            if (w.id === id) {
                return { ...w, isMaximized: !w.isMaximized, isMinimized: false };
            }
            return w;
        }));
    }, []);

    const toggleMinimize = useCallback((id) => {
        setWindows(prev => prev.map(w => {
            if (w.id === id) {
                return { ...w, isMinimized: !w.isMinimized };
            }
            return w;
        }));
    }, []);

    // Keyboard navigation (Alt + Arrow Keys)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
                e.preventDefault();

                if (windows.length <= 1) return;

                const sortedWindows = [...windows].sort((a, b) => a.zIndex - b.zIndex);
                const topWindow = sortedWindows[sortedWindows.length - 1];
                const currentIndex = sortedWindows.findIndex(w => w.id === topWindow.id);

                let nextWindow;
                if (e.key === 'ArrowLeft') {
                    nextWindow = currentIndex > 0 ? sortedWindows[currentIndex - 1] : sortedWindows[sortedWindows.length - 1];
                } else {
                    nextWindow = currentIndex < sortedWindows.length - 1 ? sortedWindows[currentIndex + 1] : sortedWindows[0];
                }

                if (nextWindow) {
                    bringToFront(nextWindow.id);
                }
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [windows, bringToFront]);

    // Sync window focus with active tab
    const { tabs } = useTabs();
    useEffect(() => {
        const activeTab = tabs.find(t => t.isActive);
        if (activeTab) {
            const windowId = activeTab.id === 'home' ? 'home-window' : activeTab.id;
            const targetWindow = windows.find(w => w.id === windowId);

            // Only bring to front if it's already open but not frontmost (or minimized)
            if (targetWindow && (targetWindow.isMinimized || targetWindow.zIndex !== getNextZIndex(windows) - 1)) {
                // We use setWindows directly here to avoid infinite loop with bringToFront potentially calling setActiveTab
                setWindows(prev => {
                    const nextZ = getNextZIndex(prev);
                    return prev.map(w => w.id === windowId ? { ...w, zIndex: nextZ, isMinimized: false } : w);
                });
            }
        }
    }, [tabs]); // Watch tabs for changes in isActive status

    // Don't render children until client-side state is loaded
    if (!isLoaded) {
        return null;
    }

    return (
        <WindowContext.Provider value={{
            windows,
            openWindow,
            closeWindow,
            updateWindow,
            bringToFront,
            toggleMaximize,
            toggleMinimize
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

export default WindowContext;
