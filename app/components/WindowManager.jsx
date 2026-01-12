'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useWindow } from '../contexts/WindowContext';
import { useTabs } from '../context/TabContext';
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

// Wrapper components for pages - memoized for stable identity
const ProfileWindow = React.memo((props) => (
    <Window {...props} title="Profile">
        <ProfileContent isWindowMode={true} />
    </Window>
));
ProfileWindow.displayName = 'ProfileWindow';

const ExploreWindow = React.memo((props) => (
    <Window {...props} title="Explore">
        <ExplorePage isWindowMode={true} />
    </Window>
));
ExploreWindow.displayName = 'ExploreWindow';

const SearchWindow = React.memo((props) => (
    <Window {...props} title="Search">
        <SearchPage isWindowMode={true} />
    </Window>
));
SearchWindow.displayName = 'SearchWindow';

const SettingsWindow = React.memo((props) => (
    <Window {...props} title="Settings">
        <SettingsContent isWindowMode={true} />
    </Window>
));
SettingsWindow.displayName = 'SettingsWindow';

const LoginWindow = React.memo((props) => (
    <Window {...props} title="Login">
        <LoginContent isWindowMode={true} />
    </Window>
));
LoginWindow.displayName = 'LoginWindow';

const CommunityWindow = React.memo((props) => (
    <Window {...props} title="Community">
        <CommunityContent isWindowMode={true} />
    </Window>
));
CommunityWindow.displayName = 'CommunityWindow';

const AdminWindow = React.memo((props) => (
    <Window {...props} title="Admin">
        <AdminContent isWindowMode={true} />
    </Window>
));
AdminWindow.displayName = 'AdminWindow';

const AboutWindow = React.memo((props) => (
    <Window {...props} title="About">
        <AboutContent isWindowMode={true} />
    </Window>
));
AboutWindow.displayName = 'AboutWindow';

const ContactWindow = React.memo((props) => (
    <Window {...props} title="Contact">
        <ContactContent isWindowMode={true} />
    </Window>
));
ContactWindow.displayName = 'ContactWindow';

const ServicesWindow = React.memo((props) => (
    <Window {...props} title="Services">
        <ServicesContent isWindowMode={true} />
    </Window>
));
ServicesWindow.displayName = 'ServicesWindow';

const WriteForWimWindow = React.memo((props) => (
    <Window {...props} title="Write for WIM">
        <WriteForWimContent isWindowMode={true} />
    </Window>
));
WriteForWimWindow.displayName = 'WriteForWimWindow';

const InstagramWindow = React.memo((props) => (
    <Window {...props} title="Instagram">
        <InstagramContent isWindowMode={true} />
    </Window>
));
InstagramWindow.displayName = 'InstagramWindow';

const XWindow = React.memo((props) => (
    <Window {...props} title="X">
        <XContent isWindowMode={true} />
    </Window>
));
XWindow.displayName = 'XWindow';

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
    const { windows, closeWindow, bringToFront, updateWindow } = useWindow();
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

        // 2. Find and close the matching tab (use ref for current value)
        const currentTabs = tabsRef.current;
        const currentPathname = pathnameRef.current;

        let tab = currentTabs.find(t => t.id === id);

        if (!tab) {
            // Try to find tab by path
            let targetPath = type === 'home' ? '/' : `/${type}`;
            if (type === 'post') {
                const postId = id.replace('post-window-', '');
                targetPath = `/post?id=${postId}`;
            }
            tab = currentTabs.find(t => t.path === targetPath || t.path.startsWith(`${targetPath}?`));
        }

        // 3. Close tab and navigate if needed
        if (tab) {
            const navigateTo = closeTab(tab.id);
            if (navigateTo && navigateTo !== currentPathname) {
                router.push(navigateTo);
            }
        } else if (currentPathname !== '/') {
            // Fallback: if no tab found but we're not on home, go home
            router.push('/');
        }
    }, [closeWindow, closeTab, router]);

    return (
        <AnimatePresence mode="sync">
            {windows.map((win, index) => {
                const zIndex = Math.min(BASE_Z + index, MAX_Z);
                const isFocused = index === windows.length - 1;
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
                    onMinimizeChange: (minimized) => updateWindow(win.id, { isMinimized: minimized }),
                    username: win.username
                };

                return <WindowComponent {...commonProps} />;
            })}
        </AnimatePresence>
    );
}

