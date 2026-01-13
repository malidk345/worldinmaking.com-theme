"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// Memoize the home icon to avoid re-calculating or creating components during render
const HomeIcon = getIconByPath('/');

const DashboardTabIcon = ({ className, style }) => {
    return <HomeIcon className={`LemonIcon ${className || ''}`} style={style} />;
};

// Smooth spring for drawer animation
const drawerSpring = { type: 'spring', damping: 30, stiffness: 300 };

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
    const { closeWindow, bringToFront } = useWindow();
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

    // Unified tab click handler - relies on declarative sync via WindowSync and TabContext
    const handleTabClick = (tab) => {
        router.push(tab.path);
    };

    // Unified close handler - syncs tabs (window closes via navigation/sync)
    const handleCloseTab = (e, tabId) => {
        e.preventDefault();
        e.stopPropagation();

        // Close tab and navigate - window will close via WindowSync when route changes
        const navigateTo = closeTab(tabId);
        if (navigateTo) {
            // Closing window explicitly to ensure animation
            closeWindow(tabId);
            router.push(navigateTo);
        }
    };

    return (
        <div className="fixed top-2 left-2 right-2 z-[90] pointer-events-none">
            {/* Tab Bar - Browser-like tabs - Now Floating */}
            <div
                className="h-(--scene-layout-header-height) flex items-end w-full bg-surface-tertiary z-(--z-top-navigation) px-1.5 relative border border-(--border-primary) rounded-xl shadow-md pointer-events-auto"
            >
                {/* Visual anchor line (optional, kept for aesthetic continuity) */}
                <div className="border-b border-(--border-primary) h-px w-full absolute -bottom-px right-0 left-0 lg:left-0 opacity-0"></div>
                <div className="flex flex-row gap-1 max-w-full items-center pl-2 lg:pl-0 h-full">
                    {/* Menu/Sidebar Toggle Button - Always visible */}
                    <button
                        className="p-1 mr-1 text-black hover:text-primary flex items-center justify-center h-[24px] w-[24px] hover:bg-black/5 rounded transition-colors"
                        onClick={handleSidebarToggle}
                        title="Open sidebar"
                    >
                        <MenuIcon className="size-4" />
                    </button>
                    <div className="relative mr-2 h-[24px] flex items-center">
                        <button
                            className="p-1 text-black hover:text-primary relative flex items-center justify-center h-[24px] w-[24px]"
                            onClick={() => setIsTabManagerOpen(!isTabManagerOpen)}
                        >
                            <BrowserTabIcon className="size-4" />
                            {tabs.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center px-0.5 border border-surface-primary">
                                    {tabs.length}
                                </span>
                            )}
                        </button>

                        {/* Tab Manager Sidebar (Drawer) */}
                        <AnimatePresence mode="wait">
                            {isTabManagerOpen && (
                                <>
                                    {/* Backdrop */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="fixed inset-0 z-100 bg-black/30 backdrop-blur-[2px]"
                                        onClick={() => setIsTabManagerOpen(false)}
                                    />
                                    {/* Drawer Panel */}
                                    <motion.div
                                        initial={{ x: '100%', opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: '100%', opacity: 0 }}
                                        transition={drawerSpring}
                                        className="fixed right-0 top-0 bottom-0 z-101 flex flex-col bg-surface-tertiary shadow-[0_4px_24px_rgba(0,0,0,0.15)]"
                                        style={{
                                            width: 'var(--project-navbar-width)',
                                            marginRight: '8px',
                                            marginTop: '8px',
                                            marginBottom: '8px',
                                            height: 'calc(100dvh - 16px)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-primary)',
                                            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'
                                        }}
                                    >
                                        {/* Header - Matching Sidebar.jsx */}
                                        <div className="relative flex items-center justify-center px-1 shrink-0" style={{ height: 'var(--scene-layout-header-height)' }}>
                                            <div className="absolute left-3 flex items-center">
                                                <div className="p-1 rounded flex items-center justify-center">
                                                    <BrowserTabIcon className="size-4 text-black" />
                                                </div>
                                            </div>

                                            {/* Center Label Badge */}
                                            <div
                                                className="flex items-center justify-center bg-[#254b85] rounded-md shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                                                style={{ height: '20px', minHeight: '20px', borderBottom: '1px solid #1a355e', padding: '0 10px' }}
                                            >
                                                <span className="text-[9.5px] tracking-tight leading-none font-medium text-white whitespace-nowrap">
                                                    tab manager
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => setIsTabManagerOpen(false)}
                                                className="absolute right-2 text-tertiary hover:text-primary p-1 rounded hover:bg-black/5 transition-colors"
                                            >
                                                <HeaderIcons.Close className="size-4" />
                                            </button>
                                        </div>

                                        <div className="border-b border-primary h-px mx-1" aria-hidden="true" />

                                        {/* Status Bar */}
                                        <div className="py-2 px-3 mt-1 flex items-center justify-between">
                                            <span className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Active Sessions</span>
                                            <span className="bg-black/5 px-2 py-0.5 rounded text-[9px] font-bold text-stone-500 border border-black/5">{tabs.length}</span>
                                        </div>

                                        {/* Scrollable Content Area */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-px">
                                            {/* Active Tabs Section */}
                                            {tabs.map((tab) => {
                                                const Icon = getIconByPath(tab.path);
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        className={`button-primitive button-primitive--variant-default text-sm gap-2.5 rounded button-primitive--full-width group flex items-center px-2 py-2 transition-colors ${tab.isActive ? 'bg-fill-button-tertiary-active' : 'hover:bg-fill-button-tertiary-hover'}`}
                                                        onClick={() => {
                                                            handleTabClick(tab);
                                                            setIsTabManagerOpen(false);
                                                        }}
                                                    >
                                                        <span className={`flex w-5 h-5 items-center justify-center shrink-0 ${tab.isActive ? 'text-[#254b85]' : 'text-stone-500 group-hover:text-black'}`}>
                                                            <Icon className="LemonIcon size-4" />
                                                        </span>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <div className={`truncate leading-none text-[13px] ${tab.isActive ? 'font-bold text-black' : 'font-medium text-stone-600 group-hover:text-black'}`}>
                                                                {tab.title}
                                                            </div>
                                                            <div className="text-[9px] text-stone-400 truncate font-medium mt-0.5">
                                                                {tab.path === '/' ? 'root instance' : tab.path}
                                                            </div>
                                                        </div>
                                                        {tabs.length > 1 && (
                                                            <span
                                                                role="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCloseTab(e, tab.id);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/5 text-tertiary hover:text-red-500 transition-all ml-auto"
                                                            >
                                                                <HeaderIcons.Close className="size-3.5" />
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}

                                            {history && history.length > 0 && (
                                                <>
                                                    <div className="border-b border-primary h-px my-2 mx-1 opacity-50" aria-hidden="true" />
                                                    <div className="py-1 px-2 mb-1">
                                                        <span className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Recently Closed</span>
                                                    </div>
                                                    {history.map((tab, i) => {
                                                        const Icon = getIconByPath(tab.path);
                                                        return (
                                                            <button
                                                                key={`${tab.id}-hist-${i}`}
                                                                className="button-primitive button-primitive--variant-default text-sm gap-2.5 rounded button-primitive--full-width group flex items-center px-2 py-1.5 hover:bg-fill-button-tertiary-hover transition-colors"
                                                                onClick={() => {
                                                                    reopenTab && reopenTab(tab);
                                                                    router.push(tab.path);
                                                                    setIsTabManagerOpen(false);
                                                                }}
                                                            >
                                                                <span className="flex w-5 h-5 items-center justify-center shrink-0 text-stone-300 group-hover:text-stone-500">
                                                                    <Icon className="LemonIcon size-4" />
                                                                </span>
                                                                <span className="truncate flex-1 text-left text-[12px] text-stone-500 group-hover:text-stone-800 font-medium">
                                                                    {tab.title}
                                                                </span>
                                                                <span className="text-[8px] font-bold text-[#254b85] opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded border border-[#254b85]/20 bg-white">
                                                                    RESTORE
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>

                                        {/* Footer - Branding */}
                                        <div className="px-2 py-4 mt-auto border-t border-primary/30">
                                            <p className="text-[9px] text-tertiary leading-tight text-center opacity-70">
                                                persisted session manager.
                                                <br />
                                                designed by wim.
                                            </p>
                                        </div>
                                    </motion.div>

                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Single Active Tab */}
                    <div className="scene-tab-row flex min-w-0 items-end">
                        {(() => {
                            const activeTab = tabs.find(t => t.isActive);
                            if (!activeTab) return null;

                            const palette = [
                                'text-red-500', 'text-green-600', 'text-amber-500',
                                'text-purple-500', 'text-pink-500', 'text-indigo-500',
                                'text-cyan-600', 'text-rose-500'
                            ];

                            const getTabColor = (tab) => {
                                if (tab.path === '/') return 'text-blue-600';
                                let hash = 0;
                                for (let i = 0; i < tab.id.length; i++) {
                                    hash = tab.id.charCodeAt(i) + ((hash << 5) - hash);
                                }
                                return palette[Math.abs(hash) % palette.length];
                            };

                            const iconColorClass = getTabColor(activeTab);

                            return (
                                <div
                                    key={activeTab.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-disabled="false"
                                    className="relative shrink-0 outline-none mb-[-1px]"
                                    style={{
                                        zIndex: 50,
                                        width: '200px',
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handleTabClick(activeTab);
                                        }
                                    }}
                                >
                                    <span data-state="closed">
                                        <div className="relative">
                                            <div className="button-primitive-group button-primitive group/button-primitive button-primitive--variant-default px-0 button-primitive--full-width border-0 rounded-none group/colorful-product-icons colorful-product-icons-true button-primitive--height-base">
                                                <button
                                                    className="button-primitive group/button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm icon-only p-0 justify-center items-center shrink-0 gap-1.5 absolute order-last group z-60 size-6 rounded top-1/2 -translate-y-1/2 right-0.5 hover:bg-surface-primary hover:text-primary"
                                                    onClick={(e) => handleCloseTab(e, activeTab.id)}
                                                >
                                                    <CloseIcon className="text-black size-3 group-hover:text-primary z-10" />
                                                </button>
                                                <button
                                                    className="button-primitive group/button-primitive button-primitive--variant-default button-primitive--size-base button-primitive--height-base text-sm w-full order-first relative pl-2 pr-6 flex flex-row items-center gap-1.5 h-full rounded-lg border border-b-0 tab-active rounded-bl-none rounded-br-none cursor-default text-primary bg-primary border-(--border-primary) focus:outline-none"
                                                    onClick={() => handleTabClick(activeTab)}
                                                >
                                                    <span className={`flex items-center shrink-0 ${iconColorClass}`}>
                                                        {(() => {
                                                            const Icon = getIconByPath(activeTab.path);
                                                            return <Icon className="LemonIcon" width="100%" fill="currentColor" />;
                                                        })()}
                                                    </span>
                                                    <span className="truncate block max-w-[140px] text-left text-sm">{activeTab.title}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* New Tab Button */}
                    <div className="flex h-full items-center">
                        <Link
                            className="button-primitive group/button-primitive button-primitive--variant-default button-primitive--size-sm button-primitive--height-sm text-sm icon-only justify-center shrink-0 p-1 flex flex-row items-center gap-1 cursor-pointer rounded-lg border z-20 ml-0.5 h-[24px] w-[24px] text-black"
                            href="/search"
                        >
                            <PlusIcon className="size-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Filter Bar - Only visible on Home page - Now Integrated into Floating Header */}
            {isHomePage && setShowCategories && (
                <div className="z-20 bg-surface-tertiary border border-(--border-primary) border-t-0 p-1 rounded-b-xl shadow-sm mt-[-4px] pointer-events-auto mx-4">
                    <div className="flex gap-2 justify-between">
                        <div className="flex-1 flex gap-2 items-end flex-wrap">
                            <div className="w-full">
                                <div className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small LemonButton--has-icon LemonButton--has-side-icon w-full">
                                    <span className="LemonButton__chrome justify-between px-3 h-8">
                                        <span className="flex items-center gap-2">
                                            {/* Categories Button */}
                                            <button
                                                onClick={() => { setShowCategories(!showCategories); setShowFilter(false); }}
                                                className={`flex items-center gap-1.5 p-1 rounded transition-colors ${showCategories ? 'bg-accent text-primary' : 'hover:bg-accent/50'}`}
                                                title="Categories"
                                            >
                                                <SidebarToggleIcon />
                                                <span className="text-[11px] font-bold hidden sm:inline lowercase">categories</span>
                                            </button>
                                            {/* Filter Button */}
                                            <button
                                                onClick={() => { setShowFilter(!showFilter); setShowCategories(false); }}
                                                className={`flex items-center gap-1.5 p-1 rounded transition-colors ${showFilter ? 'bg-accent text-primary' : 'hover:bg-accent/50'}`}
                                                title="Filter"
                                            >
                                                <FilterSettingsIcon />
                                                <span className="text-[11px] font-bold hidden sm:inline lowercase">filter</span>
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
