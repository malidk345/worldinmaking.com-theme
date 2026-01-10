'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import logger from '../utils/logger';

/**
 * Window Context for managing floating window instances
 * Simple rule: Every new/focused window gets the highest z-index
 */

const WindowContext = createContext(undefined);

export const WindowProvider = ({ children }) => {
    const [windows, setWindows] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Global z-index counter - always increases, never decreases
    const zIndexCounter = useRef(100);

    // Load state from localStorage on mount
    useEffect(() => {
        try {
            const savedWindows = localStorage.getItem('posthog-windows');

            if (savedWindows) {
                const parsedWindows = JSON.parse(savedWindows);
                // Assign fresh z-index values on load
                const loadedWindows = parsedWindows.map((w, index) => {
                    zIndexCounter.current += 1;
                    return {
                        ...w,
                        zIndex: zIndexCounter.current
                    };
                });
                setWindows(loadedWindows);
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
            username: w.username,
            isMaximized: w.isMaximized,
            pos: w.pos,
            size: w.size
        }));

        localStorage.setItem('posthog-windows', JSON.stringify(serializableWindows));
    }, [windows, isLoaded]);

    // Bring a window to front - simple: increment counter and assign
    const bringToFront = useCallback((id) => {
        zIndexCounter.current += 1;
        const newZ = zIndexCounter.current;

        setWindows(prev => prev.map(w =>
            w.id === id ? { ...w, zIndex: newZ, isMinimized: false } : w
        ));
    }, []);

    // Open a window - if exists, bring to front; if new, create with highest z-index
    const openWindow = useCallback((type, options = {}) => {
        const { id, title, initialX, initialY, initialWidth, initialHeight } = options;
        const windowId = id || `window-${type}-${Date.now()}`;

        zIndexCounter.current += 1;
        const newZ = zIndexCounter.current;

        setWindows(prev => {
            const exists = prev.find(w => w.id === windowId);

            if (exists) {
                // Bring existing window to front
                return prev.map(w => w.id === windowId
                    ? { ...w, zIndex: newZ, isMinimized: false }
                    : w
                );
            } else {
                // Create new window with highest z-index
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
                    zIndex: newZ,
                    isMaximized: options.isMaximized ?? true,
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
