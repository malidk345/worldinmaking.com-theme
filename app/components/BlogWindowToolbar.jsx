'use client';

import React from 'react';
import { SidebarPanel, TableOfContents } from './Icons';

/**
 * BlogWindowToolbar
 * Toolbar for the Blog/Post window
 * Icons are displayed on the left side as required
 */
export default function BlogWindowToolbar({
    showSidebar,
    setShowSidebar,
    showTOC,
    setShowTOC
}) {
    return (
        <div className="flex items-center gap-1">
            {/* Suggested Posts Toggle */}
            <button
                onClick={() => setShowSidebar?.(!showSidebar)}
                className={`flex items-center gap-1.5 p-1.5 rounded transition-colors ${showSidebar ? 'bg-black/10' : 'hover:bg-black/5'}`}
                title="Suggested Posts"
            >
                <SidebarPanel className="size-3.5 text-black" />
                <span className="text-xs font-medium text-black hidden sm:inline">suggested</span>
            </button>

            {/* Table of Contents Toggle */}
            <button
                onClick={() => setShowTOC?.(!showTOC)}
                className={`flex items-center gap-1.5 p-1.5 rounded transition-colors ${showTOC ? 'bg-black/10' : 'hover:bg-black/5'}`}
                title="Table of Contents"
            >
                <span className="text-xs font-medium text-black hidden sm:inline">contents</span>
                <TableOfContents className="size-3.5 text-black" />
            </button>
        </div>
    );
}
