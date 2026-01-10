"use client";
import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext(undefined);

export function SidebarProvider({ children }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Desktop sidebar state

    const toggleMobileSidebar = () => setIsMobileOpen(prev => !prev);
    const closeMobileSidebar = () => setIsMobileOpen(false);

    // Desktop sidebar controls
    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const openSidebar = () => setIsSidebarOpen(true);
    const closeSidebar = () => setIsSidebarOpen(false);

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
