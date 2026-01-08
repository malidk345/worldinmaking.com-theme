"use client";
import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Desktop sidebar state

    const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen);
    const closeMobileSidebar = () => setIsMobileOpen(false);

    // Desktop sidebar controls
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
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
    return useContext(SidebarContext);
}

