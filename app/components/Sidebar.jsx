"use client";

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import * as Icons from './SidebarIcons';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../contexts/ThemeContext';

// Menu item data structure
const MENU_ITEMS = {
    top: [
        { label: 'Home', icon: 'Home', path: '/' },
        { label: 'Search', icon: 'Search', path: '/search' },
        { label: 'Community', icon: 'Community', hasArrow: true, path: '/community' },
        { label: 'Services', icon: 'Services', path: '/services' },
        { label: 'Contact', icon: 'Contact', path: '/contact' },
        { label: 'About', icon: 'About', path: '/about' },
        { label: 'Write For wim', icon: 'WriteForWim', path: '/write-for-wim' },
        { label: 'Dark Mode', icon: 'DarkMode', path: '#', isThemeToggle: true },
    ],
    links: [
        { label: 'Instagram', icon: 'Instagram', path: '/instagram' },
        { label: 'X', icon: 'X', path: '/x' },
    ],
};

// Arrow icon component
const ArrowIcon = React.memo(() => (
    <svg
        className="LemonIcon size-3 text-tertiary"
        fill="currentColor"
        viewBox="0 0 24 24"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <path
            clipRule="evenodd"
            d="M8.47 3.47a.75.75 0 0 1 1.06 0l7.293 7.292a1.75 1.75 0 0 1 0 2.475L9.53 20.53a.75.75 0 0 1-1.06-1.06l7.293-7.293a.25.25 0 0 0 0-.354L8.47 4.53a.75.75 0 0 1 0-1.06Z"
            fillRule="evenodd"
        />
    </svg>
));
ArrowIcon.displayName = 'ArrowIcon';

// Section header component
const SectionHeader = React.memo(({ title }) => (
    <div className="py-1 px-2 mt-3 first:mt-0">
        <span className="text-xs font-semibold text-tertiary">{title}</span>
    </div>
));
SectionHeader.displayName = 'SectionHeader';

// Menu item component
const MenuItem = React.memo(({
    item,
    isActive,
    onClick,
    isThemeToggle,
    isDark,
    onThemeToggle
}) => {
    const IconComponent = Icons[item.icon];

    if (isThemeToggle) {
        return (
            <button
                className="button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm gap-1.5 rounded button-primitive--full-width justify-start shrink-0 text-left group flex items-center px-2 py-1 hover:bg-fill-button-tertiary-hover"
                title={isDark ? 'Light Mode' : 'Dark Mode'}
                onClick={onThemeToggle}
                type="button"
            >
                <span className="flex text-black w-5 h-5 items-center justify-center">
                    {isDark ? <Icons.LightMode /> : <Icons.DarkMode />}
                </span>
                <span className="truncate flex-1">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                <span
                    className={`w-8 h-4 rounded-full transition-colors ${isDark ? 'bg-primary-3000' : 'bg-gray-300'} relative`}
                    aria-hidden="true"
                >
                    <span
                        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                </span>
            </button>
        );
    }

    return (
        <Link
            className={`button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm gap-1.5 rounded button-primitive--full-width justify-start shrink-0 text-left group flex items-center px-2 py-1 hover:bg-fill-button-tertiary-hover ${isActive ? 'bg-fill-button-tertiary-active' : ''}`}
            href={item.path}
            title={item.label}
            onClick={onClick}
            aria-current={isActive ? 'page' : undefined}
        >
            <span className="flex text-black w-5 h-5 items-center justify-center">
                {IconComponent && <IconComponent />}
            </span>
            <span className="truncate flex-1">{item.label}</span>
            {item.beta && (
                <span className="LemonTag LemonTag--size-small LemonTag--warning ml-1">BETA</span>
            )}
            {item.hasArrow && (
                <span className="ml-auto">
                    <ArrowIcon />
                </span>
            )}
        </Link>
    );
});
MenuItem.displayName = 'MenuItem';

const Sidebar = () => {
    const { isMobileOpen, closeMobileSidebar, isSidebarOpen, closeSidebar } = useSidebar();
    const { toggleTheme, isDark } = useTheme();
    const pathname = usePathname();

    // Memoize active link check
    const isLinkActive = useCallback((path) => pathname === path, [pathname]);

    // Combined open state (mobile or desktop)
    const isOpen = isMobileOpen || isSidebarOpen;

    // Memoized handlers
    const handleClose = useCallback(() => {
        closeMobileSidebar();
        closeSidebar();
    }, [closeMobileSidebar, closeSidebar]);

    const handleLinkClick = useCallback(() => {
        closeMobileSidebar();
    }, [closeMobileSidebar]);

    // Dynamic year
    const currentYear = useMemo(() => new Date().getFullYear(), []);

    return (
        <>
            {/* Backdrop overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-[90] transition-opacity"
                    onClick={handleClose}
                    aria-hidden="true"
                />
            )}

            <nav
                className={`fixed top-0 left-0 flex flex-col bg-surface-tertiary transition-all duration-300 ease-in-out z-[100] ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
                style={{
                    width: 'var(--project-navbar-width)',
                    height: 'calc(100dvh - 16px)',
                    maxHeight: 'calc(100dvh - 16px)',
                    marginTop: '8px',
                    marginBottom: '8px',
                    marginLeft: '8px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-primary)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
                    paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'
                }}
                aria-label="Main navigation"
                role="navigation"
            >
                {/* Header */}
                <div className="relative flex items-center justify-center px-1" style={{ height: 'var(--scene-layout-header-height)' }}>
                    {/* Left Icon (Earth) */}
                    <div className="absolute left-3 flex items-center">
                        <button
                            className="p-1 rounded hover:bg-black/5 flex items-center justify-center transition-colors"
                            type="button"
                            aria-label="World in Making home"
                        >
                            <Image
                                src="/wim-logo-icon.png"
                                alt="World in Making"
                                width={20}
                                height={20}
                                className="w-5 h-5 object-contain"
                            />
                        </button>
                    </div>

                    {/* Center Label */}
                    <button
                        className="button-primitive button-primitive--size-xs button-primitive--height-sm text-xs font-medium flex items-center bg-black/5 hover:bg-black/10 border border-transparent rounded px-2 py-0.5 transition-colors"
                        type="button"
                    >
                        <span className="truncate text-blue-700">worldinmaking</span>
                    </button>

                    {/* Close Button */}
                    <button
                        className="absolute right-2 text-tertiary hover:text-primary p-1 rounded hover:bg-black/5 transition-colors"
                        onClick={handleClose}
                        title="Close sidebar"
                        aria-label="Close navigation"
                    >
                        <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path fillRule="evenodd" clipRule="evenodd" d="M6.225 4.811a.75.75 0 0 1 1.06 0L12 9.44l4.715-4.63a.75.75 0 0 1 1.06 1.061L13.06 10.5l4.715 4.63a.75.75 0 0 1-1.06 1.06L12 11.56l-4.715 4.63a.75.75 0 0 1-1.06-1.061L10.94 10.5 6.225 5.87a.75.75 0 0 1 0-1.06Z" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 Scrollable--vertical">
                        {/* Top items */}
                        <div className="px-1 flex flex-col gap-px" role="menu">
                            {MENU_ITEMS.top.map((item, i) => (
                                <MenuItem
                                    key={`top-${i}`}
                                    item={item}
                                    isActive={isLinkActive(item.path)}
                                    onClick={handleLinkClick}
                                    isThemeToggle={item.isThemeToggle}
                                    isDark={isDark}
                                    onThemeToggle={toggleTheme}
                                />
                            ))}
                        </div>

                        <div className="border-b border-primary h-px my-1 mx-1" aria-hidden="true" />

                        {/* Links Section */}
                        <div className="px-1 flex flex-col gap-px" role="menu">
                            <SectionHeader title="Links" />
                            {MENU_ITEMS.links.map((item, i) => (
                                <MenuItem
                                    key={`links-${i}`}
                                    item={item}
                                    isActive={isLinkActive(item.path)}
                                    onClick={handleLinkClick}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom section */}
                <div className="border-b border-primary h-px" aria-hidden="true" />
                <div className="p-1 flex flex-col gap-px" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
                    <Link
                        className={`button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm gap-1.5 rounded button-primitive--full-width justify-start shrink-0 text-left flex items-center px-2 py-1 hover:bg-fill-button-tertiary-hover group ${isLinkActive('/login') ? 'bg-fill-button-tertiary-active' : ''}`}
                        href="/login"
                        title="Login"
                        onClick={handleLinkClick}
                        aria-current={isLinkActive('/login') ? 'page' : undefined}
                    >
                        <span className="flex text-black w-5 h-5 items-center justify-center">
                            <Icons.User />
                        </span>
                        <span>Login</span>
                    </Link>

                    <div className="px-2 py-4 mt-auto">
                        <p className="text-[10px] text-tertiary leading-tight text-center">
                            all rights reserved {currentYear}.
                            <br />
                            designed by wim.
                        </p>
                    </div>
                </div>
            </nav>
        </>
    );
};

export default React.memo(Sidebar);
