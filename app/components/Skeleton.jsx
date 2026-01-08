"use client";

import React from 'react';

// Basic Skeleton shimmer animation
const shimmerClass = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent";

// Text line skeleton
export const SkeletonText = ({ width = "w-full", height = "h-4" }) => (
    <div className={`${width} ${height} bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`} />
);

// Circle skeleton (for avatars)
export const SkeletonCircle = ({ size = "w-10 h-10" }) => (
    <div className={`${size} bg-gray-200 dark:bg-gray-700 rounded-full ${shimmerClass}`} />
);

// Rectangle skeleton (for images, cards)
export const SkeletonRect = ({ width = "w-full", height = "h-32", className = "" }) => (
    <div className={`${width} ${height} bg-gray-200 dark:bg-gray-700 rounded-lg ${shimmerClass} ${className}`} />
);

// Card skeleton (for InsightCard)
export const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3">
        {/* Ribbon */}
        <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg -mt-4 -mx-4 mb-4" style={{ width: 'calc(100% + 2rem)' }} />

        {/* Header with avatar */}
        <div className="flex items-center gap-3">
            <SkeletonCircle size="w-8 h-8" />
            <div className="flex-1 space-y-1">
                <SkeletonText width="w-24" height="h-3" />
                <SkeletonText width="w-16" height="h-2" />
            </div>
        </div>

        {/* Title */}
        <SkeletonText width="w-3/4" height="h-5" />

        {/* Description */}
        <div className="space-y-2">
            <SkeletonText width="w-full" height="h-3" />
            <SkeletonText width="w-5/6" height="h-3" />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-2">
            <SkeletonText width="w-16" height="h-5" />
            <SkeletonText width="w-12" height="h-5" />
        </div>
    </div>
);

// Post skeleton (for blog post page)
export const SkeletonPost = () => (
    <div className="max-w-3xl mx-auto space-y-6">
        {/* Title */}
        <SkeletonText width="w-3/4" height="h-8" />

        {/* Meta */}
        <div className="flex items-center gap-4">
            <SkeletonCircle size="w-10 h-10" />
            <div className="space-y-1">
                <SkeletonText width="w-24" height="h-4" />
                <SkeletonText width="w-32" height="h-3" />
            </div>
        </div>

        {/* Image */}
        <SkeletonRect height="h-64" />

        {/* Content */}
        <div className="space-y-4">
            <SkeletonText width="w-full" height="h-4" />
            <SkeletonText width="w-full" height="h-4" />
            <SkeletonText width="w-5/6" height="h-4" />
            <SkeletonText width="w-full" height="h-4" />
            <SkeletonText width="w-4/5" height="h-4" />
        </div>
    </div>
);

// Search result skeleton
export const SkeletonSearchResult = () => (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-800">
        <SkeletonRect width="w-10" height="h-10" />
        <div className="flex-1 space-y-2">
            <SkeletonText width="w-3/4" height="h-4" />
            <SkeletonText width="w-1/2" height="h-3" />
        </div>
    </div>
);

// Comment skeleton
export const SkeletonComment = () => (
    <div className="flex gap-3 p-4">
        <SkeletonCircle size="w-8 h-8" />
        <div className="flex-1 space-y-2">
            <SkeletonText width="w-24" height="h-3" />
            <SkeletonText width="w-full" height="h-4" />
            <SkeletonText width="w-3/4" height="h-4" />
        </div>
    </div>
);

// Dashboard grid skeleton
export const SkeletonDashboardGrid = ({ count = 6 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </div>
);

// Table skeleton
export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex gap-4 p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
            {Array.from({ length: cols }).map((_, i) => (
                <SkeletonText key={i} width="w-24" height="h-4" />
            ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 p-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                {Array.from({ length: cols }).map((_, colIndex) => (
                    <SkeletonText key={colIndex} width={colIndex === 0 ? "w-32" : "w-20"} height="h-4" />
                ))}
            </div>
        ))}
    </div>
);

// Sidebar skeleton
export const SkeletonSidebar = () => (
    <div className="w-56 p-3 space-y-2">
        {/* Logo */}
        <div className="flex items-center gap-2 p-2 mb-4">
            <SkeletonCircle size="w-6 h-6" />
            <SkeletonText width="w-24" height="h-4" />
        </div>

        {/* Menu items */}
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2">
                <SkeletonRect width="w-5" height="h-5" />
                <SkeletonText width="w-20" height="h-4" />
            </div>
        ))}
    </div>
);

// Profile card skeleton
export const SkeletonProfile = () => (
    <div className="flex flex-col items-center p-6 space-y-4">
        <SkeletonCircle size="w-20 h-20" />
        <SkeletonText width="w-32" height="h-5" />
        <SkeletonText width="w-48" height="h-4" />
        <div className="flex gap-4 mt-4">
            <SkeletonRect width="w-24" height="h-10" />
            <SkeletonRect width="w-24" height="h-10" />
        </div>
    </div>
);

// Export shimmer animation for custom use
export const shimmerAnimation = shimmerClass;
