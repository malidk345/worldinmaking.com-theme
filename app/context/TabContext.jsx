"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const TabContext = createContext();

export function TabProvider({ children }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Combine pathname with search params to get full path
    const fullPath = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

    const [tabs, setTabs] = useState([
        { id: 'home', title: 'home', path: '/', isActive: true }
    ]);
    const [history, setHistory] = useState([]);

    // Use ref to always have access to current tabs without stale closures
    const tabsRef = useRef(tabs);
    tabsRef.current = tabs;

    // Helper function to generate a readable title from pathname
    const getPageTitle = (path) => {
        // Remove query string for title extraction
        const cleanPath = path.split('?')[0];

        if (cleanPath === '/') return 'home';

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
            '/post': 'loading...', // Will be updated by BlogWindow
        };

        // Check if it's a known page
        if (pageNames[cleanPath]) {
            return pageNames[cleanPath];
        }

        // For paths like /post, extract the last segment
        const segments = cleanPath.split('/').filter(Boolean);
        if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1];
            // Replace hyphens with spaces and make it readable
            return lastSegment.replace(/-/g, ' ');
        }

        return 'page';
    };

    // Update active tab based on current pathname + search params
    useEffect(() => {
        setTabs(prev => {
            // Look for existing tab with same full path
            const existingTab = prev.find(tab => tab.path === fullPath);

            if (existingTab) {
                // If tab exists, just make it active
                return prev.map(tab => ({
                    ...tab,
                    isActive: tab.path === fullPath
                }));
            } else {
                // Check if there's a tab with same pathname (without query)
                // This handles /post pages where query changes
                const samePathnameTab = prev.find(tab => {
                    const tabPathname = tab.path.split('?')[0];
                    return tabPathname === pathname && pathname === '/post';
                });

                if (samePathnameTab) {
                    // Update existing post tab with new query
                    return prev.map(tab => {
                        if (tab.id === samePathnameTab.id) {
                            return {
                                ...tab,
                                path: fullPath,
                                title: 'loading...', // Will be updated by BlogWindow
                                isActive: true
                            };
                        }
                        return { ...tab, isActive: false };
                    });
                }

                // Create new tab
                const title = getPageTitle(fullPath);

                const newTab = {
                    id: `tab-${Date.now()}`,
                    title: title,
                    path: fullPath,
                    isActive: true
                };

                return [
                    ...prev.map(tab => ({ ...tab, isActive: false })),
                    newTab
                ];
            }
        });
    }, [fullPath, pathname]);

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

    const updateTabTitle = useCallback((pathOrTitle, title) => {
        // Support both (path, title) and legacy (title) call signatures
        if (title === undefined) {
            // Legacy: just title passed, update active tab
            setTabs(prev => prev.map(tab =>
                tab.isActive ? { ...tab, title: pathOrTitle } : tab
            ));
        } else {
            // New: (path, title) passed
            setTabs(prev => prev.map(tab =>
                tab.path === pathOrTitle ? { ...tab, title } : tab
            ));
        }
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
