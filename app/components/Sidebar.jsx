"use client";
import React from 'react';
import * as Icons from './SidebarIcons';

// Menu item data structure
const menuItems = {
    top: [
        { label: 'Home', icon: 'Home', path: '/' },
        { label: 'Search', icon: 'Search', path: '/search' },
        { label: 'Community', icon: 'Community', hasArrow: true, path: '/community' },
        { label: 'Services', icon: 'Services', path: '/services' },
        { label: 'Contact', icon: 'Contact', path: '/contact' },
        { label: 'About', icon: 'About', path: '/about' },
        { label: 'Write For wim', icon: 'WriteForWim', path: '/write-for-wim' },
        { label: 'Dark Mode', icon: 'DarkMode', path: '#' },
    ],
    links: [
        { label: 'Instagram', icon: 'Instagram', path: '/instagram' },
        { label: 'X', icon: 'X', path: '/x' },
    ],
};

// Arrow icon SVG
const ArrowIcon = () => (
    <svg className="LemonIcon size-3 text-tertiary" fill="currentColor" viewBox="0 0 24 24" width="100%" xmlns="http://www.w3.org/2000/svg">
        <path clipRule="evenodd" d="M8.47 3.47a.75.75 0 0 1 1.06 0l7.293 7.292a1.75 1.75 0 0 1 0 2.475L9.53 20.53a.75.75 0 0 1-1.06-1.06l7.293-7.293a.25.25 0 0 0 0-.354L8.47 4.53a.75.75 0 0 1 0-1.06Z" fillRule="evenodd"></path>
    </svg>
);

// Section header component
const SectionHeader = ({ title }) => (
    <div className="py-1 px-2 mt-3 first:mt-0">
        <span className="text-xs font-semibold text-tertiary">{title}</span>
    </div>
);

import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../contexts/ThemeContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const { isMobileOpen, closeMobileSidebar } = useSidebar();
    const { theme, toggleTheme, isDark } = useTheme();
    const pathname = usePathname();

    const isLinkActive = (path) => pathname === path;

    return (
        <>
            {/* Mobile backdrop overlay - closes sidebar when clicked */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/30 z-[90] transition-opacity"
                    onClick={closeMobileSidebar}
                    aria-hidden="true"
                />
            )}

            <nav
                className={`flex flex-col bg-surface-tertiary border-r border-primary transition-all duration-300 ease-in-out z-[100] max-lg:fixed max-lg:top-0 max-lg:left-0 ${isMobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}`}
                style={{
                    width: isCollapsed ? '50px' : 'var(--project-navbar-width)',
                    height: '100dvh',
                    maxHeight: '100dvh',
                    paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))'
                }}
            >
                {/* Header with org/project selector */}
                {/* Header with org/project selector */}
                <div className="relative flex items-center justify-center px-1" style={{ height: 'var(--scene-layout-header-height)' }}>
                    {/* Left Icon (Earth) */}
                    <div className={`absolute flex items-center transition-all ${isCollapsed ? 'left-1/2 -translate-x-1/2' : 'left-3'}`}>
                        <button className="p-1 rounded hover:bg-black/5 flex items-center justify-center transition-colors" type="button">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-black">
                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM2.25 12c0-4.97 3.74-9.063 8.63-9.712-.132.846-.132 2.067-.027 2.146.41.311.666 1.03.58 1.458a2.59 2.59 0 0 1-.36.75 3.38 3.38 0 0 0-.25 1.708 7.23 7.23 0 0 0 2.808 4.796c.277.262.336.568.167.729-.65.617-.507 1.25-.098 1.52.417.275.467 1.25.107 1.777a.64.64 0 0 1-.166.155c-1.127.75-3.037.49-3.793.425a8.3 8.3 0 0 1-2.91-1.096A9.708 9.708 0 0 1 2.25 12Zm17.84-4.258a1.59 1.59 0 0 0-.58-.553 1.9 1.9 0 0 0-1.874.14 5.3 5.3 0 0 0-.398.243c-.497.33-.878.567-1.428.694-.52.12-.53.5-.02.593.18.033.344.06.494.086 1.15.2 2.052.88 2.13 1.638.077.74-.53 1.674-1.298 2.046a.376.376 0 0 0-.206.314c-.033.456.28.093.578.852.298.76.107 1.603.018 1.956-.514 2.016-1.503 2.807-2.618 3.366A9.76 9.76 0 0 0 21.75 12a9.72 9.72 0 0 0-1.66-5.258Z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {/* Center Label (worldinmaking) */}
                    {!isCollapsed && (
                        <button className="button-primitive button-primitive--size-xs button-primitive--height-sm text-xs font-medium flex items-center bg-black/5 hover:bg-black/10 border border-transparent rounded px-2 py-0.5 transition-colors" type="button">
                            <span className="truncate text-blue-700">worldinmaking</span>
                        </button>
                    )}

                    {/* Right Icon (Close) - Mobile Only */}
                    <button
                        className="lg:hidden absolute right-2 text-tertiary hover:text-primary p-1"
                        onClick={closeMobileSidebar}
                    >
                        <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M6.225 4.811a.75.75 0 0 1 1.06 0L12 9.44l4.715-4.63a.75.75 0 0 1 1.06 1.061L13.06 10.5l4.715 4.63a.75.75 0 0 1-1.06 1.06L12 11.56l-4.715 4.63a.75.75 0 0 1-1.06-1.061L10.94 10.5 6.225 5.87a.75.75 0 0 1 0-1.06Z"></path>
                        </svg>
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 Scrollable--vertical">
                        {/* Top items */}
                        <div className="px-1 flex flex-col gap-px">
                            {menuItems.top.map((item, i) => {
                                // Special handling for Dark Mode toggle
                                if (item.label === 'Dark Mode') {
                                    return (
                                        <button
                                            key={`top-${i}`}
                                            className="button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm gap-1.5 rounded button-primitive--full-width justify-start shrink-0 text-left group flex items-center px-2 py-1 hover:bg-fill-button-tertiary-hover"
                                            title={isCollapsed ? item.label : ''}
                                            onClick={toggleTheme}
                                        >
                                            <span className="flex text-tertiary group-hover:text-primary w-5 h-5 items-center justify-center">
                                                {isDark ? <Icons.LightMode /> : <Icons.DarkMode />}
                                            </span>
                                            {!isCollapsed && <span className="truncate flex-1">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                                            {!isCollapsed && (
                                                <span className={`w-8 h-4 rounded-full transition-colors ${isDark ? 'bg-primary-3000' : 'bg-gray-300'} relative`}>
                                                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                </span>
                                            )}
                                        </button>
                                    );
                                }

                                return (
                                    <Link
                                        key={`top-${i}`}
                                        className={`button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm gap-1.5 rounded button-primitive--full-width justify-start shrink-0 text-left group flex items-center px-2 py-1 hover:bg-fill-button-tertiary-hover ${isLinkActive(item.path) ? 'bg-fill-button-tertiary-active' : ''}`}
                                        href={item.path}
                                        title={isCollapsed ? item.label : ''}
                                        onClick={closeMobileSidebar}
                                    >
                                        <span className="flex text-tertiary group-hover:text-primary w-5 h-5 items-center justify-center">
                                            {Icons[item.icon] && React.createElement(Icons[item.icon])}
                                        </span>
                                        {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                                        {!isCollapsed && item.beta && (
                                            <span className="LemonTag LemonTag--size-small LemonTag--warning ml-1">BETA</span>
                                        )}
                                        {!isCollapsed && item.hasArrow && (
                                            <span className="ml-auto">
                                                <ArrowIcon />
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="border-b border-primary h-px my-1 mx-1"></div>

                        {/* Tree navigation */}
                        <div className="px-1 flex flex-col gap-px">
                            {/* Links Section */}
                            {!isCollapsed && <SectionHeader title="Links" />}
                            {menuItems.links.map((item, i) => (
                                <Link
                                    key={`links-${i}`}
                                    className={`button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm gap-1.5 rounded button-primitive--full-width justify-start shrink-0 text-left group flex items-center px-2 py-1 hover:bg-fill-button-tertiary-hover ${isLinkActive(item.path) ? 'bg-fill-button-tertiary-active' : ''}`}
                                    href={item.path}
                                    title={isCollapsed ? item.label : ''}
                                    onClick={closeMobileSidebar}
                                >
                                    <span className="flex text-tertiary group-hover:text-primary w-5 h-5 items-center justify-center">
                                        {Icons[item.icon] && React.createElement(Icons[item.icon])}
                                    </span>
                                    {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                                    {!isCollapsed && item.beta && (
                                        <span className="LemonTag LemonTag--size-small LemonTag--warning ml-1">BETA</span>
                                    )}
                                </Link>
                            ))}


                        </div>
                    </div>
                </div>

                {/* Bottom section */}
                <div className="border-b border-primary h-px"></div>
                <div className="p-1 flex flex-col gap-px" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
                    <button
                        className="button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm gap-1.5 rounded button-primitive--full-width justify-start shrink-0 text-left flex items-center px-2 py-1 hover:bg-fill-button-tertiary-hover"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? 'Expand nav' : 'Collapse nav'}
                    >
                        <svg className="LemonIcon text-tertiary w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path clipRule="evenodd" d="M15.78 9.22a.75.75 0 0 1 0 1.06L14.06 12l1.72 1.72a.75.75 0 1 1-1.06 1.06l-2.25-2.25a.75.75 0 0 1 0-1.06l2.25-2.25a.75.75 0 0 1 1.06 0Z" fillRule="evenodd"></path>
                            <path clipRule="evenodd" d="M4.75 4.5a.25.25 0 0 0-.25.25v14.5c0 .138.112.25.25.25h14.5a.25.25 0 0 0 .25-.25V4.75a.25.25 0 0 0-.25-.25H4.75ZM3 4.75C3 3.784 3.784 3 4.75 3h14.5c.966 0 1.75.784 1.75 1.75v14.5A1.75 1.75 0 0 1 19.25 21H4.75A1.75 1.75 0 0 1 3 19.25V4.75Z" fillRule="evenodd"></path>
                            <path clipRule="evenodd" d="M7.5 20.25V3.75H9v16.5H7.5Z" fillRule="evenodd"></path>
                        </svg>
                        {!isCollapsed && <span>Collapse nav</span>}
                    </button>

                    <Link
                        className={`button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm gap-1.5 rounded button-primitive--full-width justify-start shrink-0 text-left flex items-center px-2 py-1 hover:bg-fill-button-tertiary-hover group ${isLinkActive('/login') ? 'bg-fill-button-tertiary-active' : ''}`}
                        href="/login"
                        title={isCollapsed ? 'Login' : ''}
                        onClick={closeMobileSidebar}
                    >
                        <span className="flex text-tertiary group-hover:text-primary w-5 h-5 items-center justify-center">
                            <Icons.User />
                        </span>
                        {!isCollapsed && <span>Login</span>}
                    </Link>

                    {!isCollapsed && (
                        <div className="px-2 py-4 mt-auto">
                            <p className="text-[10px] text-tertiary leading-tight text-center">
                                all rights reserved 2025.
                                <br />
                                designed by wim.
                            </p>
                        </div>
                    )}
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
