'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Window Context - Simple window management
 * 
 * Simple rule: The last window in the array is always on top.
 * - openWindow: adds new window to end, or moves existing to end
 * - bringToFront: moves window to end of array
 * - closeWindow: removes window from array
 */

const WindowContext = createContext(undefined);

export const WindowProvider = ({ children }) => {
    const [windows, setWindows] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('posthog-windows');
            if (saved) {
                setWindows(JSON.parse(saved));
            }
        } catch (e) {
            console.error("[WindowContext] Failed to load", e);
        } finally {
            setIsLoaded(true)
        }
    }, []);

    // Throttled Save to localStorage
    useEffect(() => {
        if (!isLoaded) return;

        const saveTimeout = setTimeout(() => {
            const toSave = windows.map(w => ({
                id: w.id,
                type: w.type,
                title: w.title,
                username: w.username,
                isMaximized: w.isMaximized,
                isMinimized: w.isMinimized,
                x: w.x,
                y: w.y,
                width: w.width,
                height: w.height
            }));
            localStorage.setItem('posthog-windows', JSON.stringify(toSave));
        }, 2000); // 2 second throttle

        return () => clearTimeout(saveTimeout);
    }, [windows, isLoaded]);

    // Bring window to front = move to end of array AND un-minimize
    const bringToFront = useCallback((id) => {
        setWindows(prev => {
            const idx = prev.findIndex(w => w.id === id);
            if (idx === -1) return prev;

            const win = { ...prev[idx], isMinimized: false };

            // Optimization: If already at end and not minimized, do nothing
            if (idx === prev.length - 1 && !prev[idx].isMinimized) return prev;

            return [...prev.slice(0, idx), ...prev.slice(idx + 1), win];
        });
    }, []);

    // Open window - if exists move to end, if not create at end
    const openWindow = useCallback((type, options = {}) => {
        const windowId = options.id || `window-${type}-${Date.now()}`;

        setWindows(prev => {
            const existingIdx = prev.findIndex(w => w.id === windowId);

            if (existingIdx !== -1) {
                // Move existing to end (bring to front)
                const win = { ...prev[existingIdx], isMinimized: false };
                return [...prev.slice(0, existingIdx), ...prev.slice(existingIdx + 1), win];
            }

            // Create new window at end
            return [...prev, {
                id: windowId,
                type,
                title: options.title || type,
                username: options.username,
                isMaximized: options.isMaximized ?? true,
                isMinimized: false,
                x: options.x ?? 100,
                y: options.y ?? 100,
                width: options.width ?? 700,
                height: options.height ?? 500
            }];
        });
    }, []);

    // Close window
    const closeWindow = useCallback((id) => {
        setWindows(prev => prev.filter(w => w.id !== id));
    }, []);

    // Toggle minimize
    const toggleMinimize = useCallback((id) => {
        setWindows(prev => prev.map(w =>
            w.id === id ? { ...w, isMinimized: !w.isMinimized } : w
        ));
    }, []);

    // Toggle maximize
    const toggleMaximize = useCallback((id) => {
        setWindows(prev => prev.map(w =>
            w.id === id ? { ...w, isMaximized: !w.isMaximized, isMinimized: false } : w
        ));
    }, []);

    // Update specific window properties (position, size, etc.)
    const updateWindow = useCallback((id, updates) => {
        setWindows(prev => prev.map(w =>
            w.id === id ? { ...w, ...updates } : w
        ));
    }, []);

    if (!isLoaded) return null;

    return (
        <WindowContext.Provider value={{
            windows,
            openWindow,
            closeWindow,
            bringToFront,
            toggleMinimize,
            toggleMaximize,
            updateWindow
        }}>
            {children}
        </WindowContext.Provider>
    );
};

export const useWindow = () => {
    const context = useContext(WindowContext);
    if (!context) throw new Error('useWindow must be used within WindowProvider');
    return context;
};

export default WindowContext;
