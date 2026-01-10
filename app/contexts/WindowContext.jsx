'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger';

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

    // Load state from localStorage on mount
    useEffect(() => {
        try {
            const savedWindows = localStorage.getItem('posthog-windows');

            if (savedWindows) {
                const parsedWindows = JSON.parse(savedWindows);
                // Normalize zIndex values on load to avoid stale high values
                const normalizedWindows = parsedWindows.map((w, index) => ({
                    ...w,
                    zIndex: 10 + index // Reset zIndex to sequential values starting from 10
                }));
                setWindows(normalizedWindows);
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

        // Don't save zIndex to localStorage - it will be recalculated on load
        const serializableWindows = windows.map(w => ({
            id: w.id,
            type: w.type,
            title: w.title,
            username: w.username, // For author-profile windows
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
            if (targetWindow && targetWindow.zIndex === nextZ - 1) return prev;
            return prev.map(w => w.id === id ? { ...w, zIndex: nextZ } : w);
        });
    }, []);

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

                return [...prev, {
                    ...options,
                    id: windowId,
                    type,
                    title: title || type,
                    zIndex: nextZ,
                    isMaximized: options.isMaximized ?? true, // Respect provided value
                    isMinimized: false,
                    pos: { x: startX, y: startY },
                    size: { width: initialWidth ?? 700, height: initialHeight ?? 500 }
                }];
            }
        });
    }, []);

    const closeWindow = useCallback((id) => {
        setWindows(prev => prev.filter(w => w.id !== id));
    }, []);

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
