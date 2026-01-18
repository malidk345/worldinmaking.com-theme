"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

const SidebarContext = createContext(undefined);

export function SidebarProvider({ children }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Desktop sidebar state

    const toggleMobileSidebar = useCallback(() => setIsMobileOpen(prev => !prev), []);
    const closeMobileSidebar = useCallback(() => setIsMobileOpen(false), []);

    // Desktop sidebar controls
    const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);
    const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
    const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

    return (
        <SidebarContext.Provider value={{
            isMobileOpen,
            toggleMobileSidebar,
            closeMobileSidebar,
            isSidebarOpen,
            toggleSidebar,
            openSidebar,
            closeSidebar
        }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
