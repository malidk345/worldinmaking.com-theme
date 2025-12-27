'use client';

import React from 'react';
import {
    SnippetThemeToggler,
    HamburgerIcon,
    SearchIcon,
    UserIcon,
    WindowIcon
} from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useWindow } from '../contexts/WindowContext';

const Header: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const { activeSidebar, toggleSidebar, windows, openWindow } = useWindow();

    return (
        <header className="fixed top-[8px] left-[8px] right-[8px] z-50">
            <nav
                className={`
          glass px-4 h-[38px] rounded-xl flex items-center justify-between transition-all duration-300
          ${activeSidebar ? 'opacity-30 blur-md scale-[0.98] pointer-events-none' : ''}
        `}
                style={{
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)'
                }}
            >
                <div className="text-[13px] font-extrabold tracking-tighter select-none whitespace-nowrap pl-2 flex items-center h-full text-[#001a42] dark:text-blue-400">
                    worldinmaking.
                </div>

                <ul className="flex gap-0.5 m-0 p-0 list-none items-center h-full">
                    {/* Search */}
                    <li>
                        <button
                            onClick={() => toggleSidebar('search')}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 text-black dark:text-white ${activeSidebar === 'search' ? 'bg-black/10 dark:bg-white/20' : ''}`}
                            title="search"
                            aria-label="open search"
                        >
                            <div className="flex items-center justify-center w-full h-full">
                                <SearchIcon size={16} />
                            </div>
                        </button>
                    </li>

                    {/* Theme Toggler */}
                    <li>
                        <button
                            onClick={toggleTheme}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 text-black dark:text-white"
                            title="toggle theme"
                            aria-label={`switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                        >
                            <div className="flex items-center justify-center w-full h-full">
                                <SnippetThemeToggler theme={theme} />
                            </div>
                        </button>
                    </li>

                    {/* Login (User) */}
                    <li>
                        <button
                            onClick={() => openWindow('login')}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 text-black dark:text-white"
                            title="member access"
                            aria-label="open member login"
                        >
                            <div className="flex items-center justify-center w-full h-full">
                                <UserIcon />
                            </div>
                        </button>
                    </li>

                    {/* Windows (With Badge) */}
                    <li className="relative">
                        <button
                            onClick={() => toggleSidebar('tabs')}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 text-black dark:text-white ${activeSidebar === 'tabs' ? 'bg-black/10 dark:bg-white/20' : ''}`}
                            title="windows"
                            aria-label="show open windows"
                        >
                            <div className="flex items-center justify-center w-full h-full">
                                <WindowIcon />
                            </div>
                        </button>
                        {windows.length > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black text-[8px] font-bold text-white shadow-sm ring-1 ring-white dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-900 pointer-events-none">
                                {windows.length}
                            </span>
                        )}
                    </li>

                    {/* Hamburger (En sağda) */}
                    <li className="ml-1">
                        <button
                            onClick={() => toggleSidebar('menu')}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 text-black dark:text-white ${activeSidebar === 'menu' ? 'bg-black/5 dark:bg-white/10' : ''}`}
                            aria-label="toggle menu"
                        >
                            <div className="flex items-center justify-center w-full h-full">
                                <HamburgerIcon />
                            </div>
                        </button>
                    </li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;
