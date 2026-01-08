'use client';

import React from 'react';
import { Layout, Filter, Grid, List } from './Icons';

/**
 * HomeWindowToolbar
 * Toolbar for the Home/Dashboard window
 * Icons are displayed on the left side as required
 */
export default function HomeWindowToolbar({
    showCategories,
    setShowCategories,
    showFilter,
    setShowFilter,
    viewMode,
    setViewMode
}) {
    return (
        <div className="flex items-center gap-1">
            {/* Categories Button */}
            <button
                onClick={() => { setShowCategories?.(!showCategories); setShowFilter?.(false); }}
                className={`flex items-center gap-1.5 p-1.5 rounded transition-colors ${showCategories ? 'bg-black/10 text-primary' : 'hover:bg-black/5 text-secondary hover:text-primary'}`}
                title="Categories"
            >
                <Layout className="size-3.5" />
                <span className="text-xs font-medium hidden sm:inline">categories</span>
            </button>

            {/* Filter Button */}
            <button
                onClick={() => { setShowFilter?.(!showFilter); setShowCategories?.(false); }}
                className={`flex items-center gap-1.5 p-1.5 rounded transition-colors ${showFilter ? 'bg-black/10 text-primary' : 'hover:bg-black/5 text-secondary hover:text-primary'}`}
                title="Filter"
            >
                <Filter className="size-3.5" />
                <span className="text-xs font-medium hidden sm:inline">filter</span>
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-black/10 mx-1" />

            {/* Grid View Button */}
            <button
                onClick={() => setViewMode?.('grid')}
                className={`flex items-center gap-1.5 p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-black/10 text-primary' : 'hover:bg-black/5 text-secondary hover:text-primary'}`}
                title="Grid View"
            >
                <Grid className="size-3.5" />
            </button>

            {/* List View Button */}
            <button
                onClick={() => setViewMode?.('list')}
                className={`flex items-center gap-1.5 p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-black/10 text-primary' : 'hover:bg-black/5 text-secondary hover:text-primary'}`}
                title="List View"
            >
                <List className="size-3.5" />
            </button>
        </div>
    );
}
