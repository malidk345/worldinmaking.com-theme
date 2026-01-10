"use client";
import React from 'react';
import { getIconByPath } from '../utils/iconUtils';
import { useSidebar } from '../context/SidebarContext';
import { useTabs } from '../context/TabContext';
import { useWindow } from '../contexts/WindowContext';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import * as HeaderIcons from './Icons';

// Header Icons Alias
const BrowserTabIcon = HeaderIcons.BrowserTab;
const PlusIcon = HeaderIcons.Plus;
const MenuIcon = HeaderIcons.Menu;
const SidebarToggleIcon = HeaderIcons.Layout;
const FilterSettingsIcon = HeaderIcons.Filter;
const GridDisplayIcon = HeaderIcons.Grid;
const ListDisplayIcon = HeaderIcons.List;
const CloseIcon = HeaderIcons.Close;

const DashboardTabIcon = ({ className, style }) => {
    const Icon = getIconByPath('/');
    return <Icon className={`LemonIcon ${className || ''}`} style={style} />;
};

export default function DashboardHeader({
    showCategories,
    setShowCategories,
    showFilter,
    setShowFilter,
    viewMode,
    setViewMode
}) {
    const { toggleMobileSidebar, openSidebar, isSidebarOpen } = useSidebar();
    const { tabs, closeTab, setActiveTab, history, reopenTab } = useTabs();
    const { bringToFront, closeWindow } = useWindow();
    const router = useRouter();
    const pathname = usePathname();
    const [isTabManagerOpen, setIsTabManagerOpen] = React.useState(false);

    const isHomePage = pathname === '/';

    // Handle sidebar toggle - works for both mobile and desktop
    const handleSidebarToggle = () => {
        // On mobile, use the mobile toggle
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            toggleMobileSidebar();
        } else {
            // On desktop, open the overlay sidebar
            openSidebar();
        }
    };

    const handleTabClick = (tab) => {
        setActiveTab(tab.id);
        const windowId = tab.id === 'home' ? 'home-window' : tab.id;
        bringToFront(windowId);
        router.push(tab.path);
    };

    const handleCloseTab = (e, tabId) => {
        e.preventDefault();
        e.stopPropagation();

        const windowId = tabId === 'home' ? 'home-window' : tabId;
        closeWindow(windowId);
        const navigateTo = closeTab(tabId);

        // Always navigate to the returned path
        if (navigateTo) {
            router.push(navigateTo);
        }
    };

    return (
        <div className="flex flex-col bg-primary sticky top-0 z-50">
            {/* Tab Bar - Browser-like tabs */}
            <div
                className="h-(--scene-layout-header-height) flex items-end w-full bg-surface-tertiary z-(--z-top-navigation) pr-1.5 relative"
            >
                <div className="border-b border-(--border-primary) h-px w-full absolute -bottom-px right-0 left-0 lg:left-0"></div>
                <div className="flex flex-row gap-1 max-w-full items-end pl-2 lg:pl-0">
                    {/* Menu/Sidebar Toggle Button - Always visible */}
                    <button
                        className="p-1 mr-1 text-black hover:text-primary self-end flex items-center justify-center h-[28px] hover:bg-black/5 rounded transition-colors"
                        onClick={handleSidebarToggle}
                        title="Open sidebar"
                    >
                        <MenuIcon />
                    </button>
                    <div className="relative mr-2 self-end h-[28px] flex items-center">
                        <button
                            className="p-1 text-black hover:text-primary relative"
                            onClick={() => setIsTabManagerOpen(!isTabManagerOpen)}
                        >
                            <BrowserTabIcon className="size-4" />
                            {tabs.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 border border-surface-primary">
                                    {tabs.length}
                                </span>
                            )}
                        </button>

                        {/* Tab Manager Dropdown */}
                        {isTabManagerOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsTabManagerOpen(false)} />
                                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-primary rounded-xl shadow-2xl z-50 overflow-hidden">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-stone-50 border-b border-primary">
                                        <div className="flex items-center gap-2">
                                            <BrowserTabIcon className="size-4 text-stone-500" />
                                            <span className="text-sm font-semibold text-stone-700">Tab Manager</span>
                                        </div>
                                        <button
                                            onClick={() => setIsTabManagerOpen(false)}
                                            className="text-stone-400 hover:text-stone-600 p-0.5 rounded hover:bg-stone-200 transition-colors"
                                        >
                                            <CloseIcon className="size-4" />
                                        </button>
                                    </div>

                                    {/* Active Tabs Section */}
                                    <div className="px-2 py-1.5 bg-stone-50/50 border-b border-stone-100">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                            Active ({tabs.length})
                                        </span>
                                    </div>
                                    <div className="max-h-52 overflow-y-auto py-1">
                                        {tabs.map(tab => {
                                            const Icon = getIconByPath(tab.path);

                                            return (
                                                <button
                                                    key={tab.id}
                                                    className={`group w-full flex items-center gap-2 px-2 py-1.5 mx-1 rounded-lg cursor-pointer transition-colors ${tab.isActive
                                                        ? 'bg-blue-50 border border-blue-100'
                                                        : 'hover:bg-stone-50'
                                                        }`}
                                                    onClick={() => {
                                                        handleTabClick(tab);
                                                        setIsTabManagerOpen(false);
                                                    }}
                                                >
                                                    <span className="text-black shrink-0 w-4 h-4 flex items-center justify-center">
                                                        <Icon className="LemonIcon size-4" />
                                                    </span>
                                                    <span className={`text-sm truncate flex-1 text-left ${tab.isActive ? 'text-blue-700 font-medium' : 'text-stone-600'}`}>
                                                        {tab.title}
                                                    </span>
                                                    {tabs.length > 1 && (
                                                        <span
                                                            role="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCloseTab(e, tab.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-all ml-auto"
                                                        >
                                                            <CloseIcon className="size-3.5" />
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* History Section */}
                                    {history && history.length > 0 && (
                                        <>
                                            <div className="px-2 py-1.5 bg-stone-50/50 border-t border-b border-primary/20">
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                                    Recently Closed ({history.length})
                                                </span>
                                            </div>
                                            <div className="max-h-40 overflow-y-auto py-1">
                                                {history.map((tab, i) => {
                                                    const Icon = getIconByPath(tab.path);

                                                    return (
                                                        <button
                                                            key={`${tab.id}-hist-${i}`}
                                                            className="group w-full flex items-center gap-2 px-2 py-1.5 mx-1 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors"
                                                            onClick={() => {
                                                                reopenTab && reopenTab(tab);
                                                                router.push(tab.path);
                                                                setIsTabManagerOpen(false);
                                                            }}
                                                        >
                                                            <span className="text-stone-400 shrink-0 w-4 h-4 flex items-center justify-center">
                                                                <Icon className="LemonIcon size-4" />
                                                            </span>
                                                            <span className="text-sm text-stone-500 truncate flex-1 text-left group-hover:text-stone-700">
                                                                {tab.title}
                                                            </span>
                                                            <span className="text-[10px] text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                Reopen
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Tab Navigation - Render all tabs */}
                    <div className="scene-tab-row flex min-w-0 items-end">
                        {tabs.map((tab) => {
                            const palette = [
                                'text-red-500', 'text-green-600', 'text-amber-500',
                                'text-purple-500', 'text-pink-500', 'text-indigo-500',
                                'text-cyan-600', 'text-rose-500'
                            ];

                            const getTabColor = (t) => {
                                if (t.path === '/') return 'text-blue-600';
                                let hash = 0;
                                for (let i = 0; i < t.id.length; i++) {
                                    hash = t.id.charCodeAt(i) + ((hash << 5) - hash);
                                }
                                return palette[Math.abs(hash) % palette.length];
                            };

                            const iconColorClass = getTabColor(tab);

                            return (
                                <div
                                    key={tab.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-disabled="false"
                                    className={`relative shrink-0 outline-none -mb-px transition-all duration-200 ${tab.isActive ? 'z-50' : 'z-10 opacity-70 hover:opacity-100'}`}
                                    style={{
                                        width: tab.isActive ? '200px' : '120px',
                                        maxWidth: '200px'
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handleTabClick(tab);
                                        }
                                    }}
                                >
                                    <div className="relative">
                                        <div className={`button-primitive-group button-primitive group/button-primitive button-primitive--variant-default px-0 button-primitive--full-width border-0 rounded-none group/colorful-product-icons colorful-product-icons-true button-primitive--height-base ${tab.isActive ? '' : 'bg-transparent'}`}>
                                            <button
                                                className={`button-primitive group/button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm icon-only p-0 justify-center items-center shrink-0 gap-1.5 absolute order-last group z-20 size-5 rounded top-1/2 -translate-y-1/2 right-1 ${tab.isActive ? 'hover:bg-surface-primary hover:text-primary' : 'opacity-0 group-hover/button-primitive:opacity-100 hover:bg-black/5'}`}
                                                onClick={(e) => handleCloseTab(e, tab.id)}
                                            >
                                                <CloseIcon className="text-black size-2.5 group-hover:text-primary z-10" />
                                            </button>
                                            <button
                                                className={`button-primitive group/button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm w-full order-first relative pl-2 pr-6 flex flex-row items-center gap-1.5 h-full rounded-t-lg border border-b-0 transition-colors ${tab.isActive
                                                    ? 'tab-active cursor-default text-primary bg-primary border-(--border-primary)'
                                                    : 'cursor-pointer text-secondary hover:bg-black/5 border-transparent hover:border-(--border-primary)/30'}`}
                                                onClick={() => handleTabClick(tab)}
                                            >
                                                <span className={`flex items-center shrink-0 ${iconColorClass}`}>
                                                    {(() => {
                                                        const Icon = getIconByPath(tab.path);
                                                        return <Icon className="LemonIcon size-3.5" />;
                                                    })()}
                                                </span>
                                                <span className="truncate block max-w-[140px] text-left text-[13px] font-medium">{tab.title}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* New Tab Button */}
                    <Link
                        className="button-primitive group/button-primitive button-primitive--variant-default button-primitive--size-sm button-primitive--height-sm text-sm icon-only justify-center shrink-0 p-1 flex flex-row items-center gap-1 cursor-pointer rounded-lg border z-20 ml-0.5 h-[28px] w-[28px] mb-0 text-black"
                        href="/search"
                    >
                        <PlusIcon />
                    </Link>
                </div>
            </div>

            {/* Filter Bar - Only visible on Home page */}
            {isHomePage && setShowCategories && (
                <div className="scene-sticky-bar @2xl/main-content:sticky z-20 bg-primary @2xl/main-content:top-[calc(var(--scene-layout-header-height)+var(--scene-title-section-height,64px))] space-y-2 py-2 px-3 rounded-t-xl mt-3">
                    <div className="flex gap-2 justify-between">
                        <div className="flex-1 flex gap-2 items-end flex-wrap border border-transparent">
                            <div className="w-full">
                                <div className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small LemonButton--has-icon LemonButton--has-side-icon w-full">
                                    <span className="LemonButton__chrome justify-between px-3">
                                        <span className="flex items-center gap-2">
                                            {/* Categories Button */}
                                            <button
                                                onClick={() => { setShowCategories(!showCategories); setShowFilter(false); }}
                                                className={`flex items-center gap-1.5 p-1 rounded transition-colors ${showCategories ? 'bg-accent text-primary' : 'hover:bg-accent/50'}`}
                                                title="Categories"
                                            >
                                                <SidebarToggleIcon />
                                                <span className="text-xs font-medium hidden sm:inline">categories</span>
                                            </button>
                                            {/* Filter Button */}
                                            <button
                                                onClick={() => { setShowFilter(!showFilter); setShowCategories(false); }}
                                                className={`flex items-center gap-1.5 p-1 rounded transition-colors ${showFilter ? 'bg-accent text-primary' : 'hover:bg-accent/50'}`}
                                                title="Filter"
                                            >
                                                <FilterSettingsIcon />
                                                <span className="text-xs font-medium hidden sm:inline">filter</span>
                                            </button>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            {/* Grid View Button */}
                                            <button
                                                onClick={() => setViewMode('grid')}
                                                className={`flex items-center gap-1.5 p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-accent text-primary' : 'hover:bg-accent/50'}`}
                                                title="Grid View"
                                            >
                                                <GridDisplayIcon />
                                            </button>
                                            {/* List View Button */}
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={`flex items-center gap-1.5 p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-accent text-primary' : 'hover:bg-accent/50'}`}
                                                title="List View"
                                            >
                                                <ListDisplayIcon />
                                            </button>
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
