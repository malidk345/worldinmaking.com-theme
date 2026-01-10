"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

const TabContext = createContext();

export function TabProvider({ children }) {
    const pathname = usePathname();
    const [tabs, setTabs] = useState([
        { id: 'home', title: 'home', path: '/', isActive: true }
    ]);
    const [history, setHistory] = useState([]);

    // Use ref to always have access to current tabs without stale closures
    const tabsRef = useRef(tabs);
    tabsRef.current = tabs;

    // Helper function to generate a readable title from pathname
    const getPageTitle = (path) => {
        if (path === '/') return 'home';

        // Known page mappings
        const pageNames = {
            '/search': 'search',
            '/about': 'about',
            '/contact': 'contact',
            '/services': 'services',
            '/community': 'community',
            '/explore': 'explore',
            '/login': 'login',
            '/settings': 'settings',
            '/admin': 'admin',
            '/instagram': 'instagram',
            '/x': 'x',
            '/write-for-wim': 'write for wim',
        };

        // Check if it's a known page
        if (pageNames[path]) {
            return pageNames[path];
        }

        // For paths like /post, extract the last segment
        const segments = path.split('/').filter(Boolean);
        if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1];
            // Replace hyphens with spaces and make it readable
            return lastSegment.replace(/-/g, ' ');
        }

        return 'page';
    };

    // Update active tab based on current pathname
    useEffect(() => {
        setTabs(prev => {
            const existingTab = prev.find(tab => tab.path === pathname);

            if (existingTab) {
                // If tab exists, just make it active
                return prev.map(tab => ({
                    ...tab,
                    isActive: tab.path === pathname
                }));
            } else {
                // If it's a new page, create a new tab
                const title = getPageTitle(pathname);

                const newTab = {
                    id: `tab-${Date.now()}`,
                    title: title,
                    path: pathname,
                    isActive: true
                };

                return [
                    ...prev.map(tab => ({ ...tab, isActive: false })),
                    newTab
                ];
            }
        });
    }, [pathname]);

    const addTab = useCallback((tab) => {
        setTabs(prev => {
            const existingTab = prev.find(t => t.path === tab.path);
            if (!existingTab) {
                return [
                    ...prev.map(t => ({ ...t, isActive: false })),
                    { ...tab, isActive: true }
                ];
            } else {
                return prev.map(t => ({
                    ...t,
                    isActive: t.path === tab.path
                }));
            }
        });
    }, []);

    const updateTabTitle = useCallback((path, title) => {
        setTabs(prev => prev.map(tab =>
            tab.path === path ? { ...tab, title } : tab
        ));
    }, []);

    const closeTab = useCallback((tabId) => {
        // Use ref to get current tabs (avoids stale closure)
        const currentTabs = tabsRef.current;
        const tabIndex = currentTabs.findIndex(t => t.id === tabId);

        if (tabIndex === -1) return null;

        const closedTab = currentTabs[tabIndex];
        const remainingTabs = currentTabs.filter(t => t.id !== tabId);

        // Add to history
        if (closedTab) {
            setHistory(prev => {
                const filtered = prev.filter(t => t.path !== closedTab.path);
                return [{ ...closedTab, isActive: false }, ...filtered].slice(0, 10);
            });
        }

        // Determine where to navigate
        let navigateTo = null;
        let newActiveIndex = -1;

        if (remainingTabs.length === 0) {
            navigateTo = '/search';
        } else if (closedTab.isActive) {
            // Go to previous tab, or first if we're at start
            newActiveIndex = Math.max(0, tabIndex - 1);
            navigateTo = remainingTabs[newActiveIndex].path;
        } else {
            // Stay on current active tab
            const activeTab = remainingTabs.find(t => t.isActive);
            navigateTo = activeTab?.path || remainingTabs[0].path;
        }

        // Update state
        setTabs(prev => {
            const currentRemaining = prev.filter(t => t.id !== tabId);

            if (currentRemaining.length === 0) {
                return [{ id: 'search', title: 'search', path: '/search', isActive: true }];
            }

            return currentRemaining.map((tab, idx) => ({
                ...tab,
                isActive: closedTab.isActive ? idx === newActiveIndex : tab.isActive
            }));
        });

        return navigateTo;
    }, []);

    const setActiveTab = useCallback((tabId) => {
        setTabs(prev => prev.map(tab => ({
            ...tab,
            isActive: tab.id === tabId
        })));
    }, []);

    const reopenTab = useCallback((tab) => {
        setHistory(prev => prev.filter(t => t.id !== tab.id));
        // Use functional update for addTab logic
        setTabs(prev => {
            const existingTab = prev.find(t => t.path === tab.path);
            if (!existingTab) {
                return [
                    ...prev.map(t => ({ ...t, isActive: false })),
                    { ...tab, isActive: true }
                ];
            } else {
                return prev.map(t => ({
                    ...t,
                    isActive: t.path === tab.path
                }));
            }
        });
    }, []);

    return (
        <TabContext.Provider value={{
            tabs,
            history,
            addTab,
            closeTab,
            setActiveTab,
            updateTabTitle,
            reopenTab
        }}>
            {children}
        </TabContext.Provider>
    );
}

export function useTabs() {
    const context = useContext(TabContext);
    if (!context) {
        throw new Error('useTabs must be used within a TabProvider');
    }
    return context;
}
