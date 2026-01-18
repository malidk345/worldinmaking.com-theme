'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';
import { useTabs } from '../contexts/TabContext';
import HomeWindow from './HomeWindow';
import BlogWindow from './BlogWindow';
import ExplorePage from '../explore/ExploreContent';
import SearchPage from '../search/SearchContent';
import AuthorProfileWindow from './AuthorProfileWindow';
import ProfileContent from '../profile/ProfileContent';
import SettingsContent from '../settings/SettingsContent';
import LoginContent from '../login/LoginContent';
import CommunityContent from '../community/CommunityContent';
import AdminContent from '../admin/AdminContent';
import AboutContent from '../about/AboutContent';
import ContactContent from '../contact/ContactContent';
import ServicesContent from '../services/ServicesContent';
import WriteForWimContent from '../write-for-wim/WriteContent';
import InstagramContent from '../instagram/InstagramContent';
import XContent from '../x/XContent';
import Window from './Window';
import ErrorBoundary from './ErrorBoundary';

// Generic wrapper for standard pages to reduce duplication
const PageWindow = React.memo(({ title, children, ...props }) => (
    <Window {...props} title={title}>
        {children}
    </Window>
));
PageWindow.displayName = 'PageWindow';

const ProfileWindow = (props) => <PageWindow {...props} title="Profile"><ProfileContent isWindowMode={true} /></PageWindow>;
const ExploreWindow = (props) => <PageWindow {...props} title="Explore"><ExplorePage isWindowMode={true} /></PageWindow>;
const SearchWindow = (props) => <PageWindow {...props} title="Search"><SearchPage isWindowMode={true} /></PageWindow>;
const SettingsWindow = (props) => <PageWindow {...props} title="Settings"><SettingsContent isWindowMode={true} /></PageWindow>;
const LoginWindow = (props) => <PageWindow {...props} title="Login"><LoginContent isWindowMode={true} /></PageWindow>;
const CommunityWindow = (props) => <PageWindow {...props} title="Community"><CommunityContent isWindowMode={true} /></PageWindow>;
const AdminWindow = (props) => <PageWindow {...props} title="Admin"><AdminContent isWindowMode={true} /></PageWindow>;
const AboutWindow = (props) => <PageWindow {...props} title="About"><AboutContent isWindowMode={true} /></PageWindow>;
const ContactWindow = (props) => <PageWindow {...props} title="Contact"><ContactContent isWindowMode={true} /></PageWindow>;
const ServicesWindow = (props) => <PageWindow {...props} title="Services"><ServicesContent isWindowMode={true} /></PageWindow>;
const WriteForWimWindow = (props) => <PageWindow {...props} title="Write for WIM"><WriteForWimContent isWindowMode={true} /></PageWindow>;
const InstagramWindow = (props) => <PageWindow {...props} title="Instagram"><InstagramContent isWindowMode={true} /></PageWindow>;
const XWindow = (props) => <PageWindow {...props} title="X"><XContent isWindowMode={true} /></PageWindow>;

/**
 * Window Registry
 * Maps window types to their respective components.
 */
const WINDOW_COMPONENTS = {
    'home': HomeWindow,
    'blog': BlogWindow,
    'post': BlogWindow,
    'author-profile': AuthorProfileWindow,
    'profile': ProfileWindow,
    'explore': ExploreWindow,
    'search': SearchWindow,
    'settings': SettingsWindow,
    'login': LoginWindow,
    'community': CommunityWindow,
    'admin': AdminWindow,
    'about': AboutWindow,
    'contact': ContactWindow,
    'services': ServicesWindow,
    'write-for-wim': WriteForWimWindow,
    'instagram': InstagramWindow,
    'x': XWindow
};

const BASE_Z = 10;
const MAX_Z = 80;

export default function WindowManager() {
    const { windows, focusedId, closeWindow, bringToFront, updateWindow } = useWindow();
    const { tabs, closeTab } = useTabs();
    const router = useRouter();
    const pathname = usePathname();

    // Refs to avoid stale closures
    const tabsRef = useRef(tabs);
    const pathnameRef = useRef(pathname);

    useEffect(() => {
        tabsRef.current = tabs;
    }, [tabs]);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    const handleClose = useCallback((id, type) => {
        // 1. Close the window
        closeWindow(id);

        // 2. Determine and close the matching tab
        const currentTabs = tabsRef.current;
        const currentPathname = pathnameRef.current;

        let tabToClose = currentTabs.find(t => t.id === id);

        if (!tabToClose) {
            let targetPath = type === 'home' ? '/' : `/${type}`;
            if (type === 'post') {
                const postId = id.replace('post-window-', '');
                targetPath = `/post?id=${postId}`;
            }
            tabToClose = currentTabs.find(t => t.path === targetPath || t.path.startsWith(`${targetPath}?`));
        }

        if (tabToClose) {
            const navigateTo = closeTab(tabToClose.id);
            if (navigateTo && navigateTo !== currentPathname) {
                router.push(navigateTo);
            }
        } else if (currentPathname !== '/') {
            router.push('/');
        }
    }, [closeWindow, closeTab, router]);

    return (
        <AnimatePresence mode="sync">
            {windows.map((win, index) => {
                // PostHog Stack Logic: Higher index = higher z-index
                // If focused, we ensure it's at least at a certain priority level
                const isFocused = win.id === focusedId;
                const zIndex = isFocused ? MAX_Z : Math.min(BASE_Z + index, MAX_Z - 1);
                const WindowComponent = WINDOW_COMPONENTS[win.type];

                if (!WindowComponent) return null;

                const commonProps = {
                    key: win.id,
                    id: win.id,
                    zIndex,
                    isFocused,
                    initialX: win.x,
                    initialY: win.y,
                    initialWidth: win.width,
                    initialHeight: win.height,
                    isMaximized: win.isMaximized,
                    isMinimized: win.isMinimized,
                    onFocus: () => bringToFront(win.id),
                    onClose: () => handleClose(win.id, win.type),
                    onPositionChange: (pos) => updateWindow(win.id, { x: pos.x, y: pos.y }),
                    onSizeChange: (size) => updateWindow(win.id, { width: size.width, height: size.height }),
                    onMaximizeChange: (maximized) => updateWindow(win.id, { isMaximized: maximized }),
                    onMinimizeChange: (minimized) => {
                        updateWindow(win.id, { isMinimized: minimized });
                    },
                    username: win.username
                };

                return (
                    <ErrorBoundary
                        key={`error-${win.id}`}
                        message={`Window "${win.type}" encountered an error.`}
                    >
                        <WindowComponent {...commonProps} />
                    </ErrorBoundary>
                );
            })}
        </AnimatePresence>
    );
}

