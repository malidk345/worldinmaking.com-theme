"use client";

import React from 'react';

export const Skeleton = ({ className, style }) => {
    return (
        <div
            className={`animate-shimmer ${className || ''}`}
            style={style}
        />
    );
};

export const InsightCardSkeleton = () => {
    return (
        <div className="relative h-full flex flex-col border border-(--border-primary) rounded-lg bg-white overflow-hidden p-4">
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-24 rounded" />
            </div>
            <Skeleton className="h-6 w-3/4 rounded mb-2" />
            <Skeleton className="h-4 w-full rounded mb-1" />
            <Skeleton className="h-4 w-full rounded mb-1" />
            <Skeleton className="h-4 w-2/3 rounded mb-4" />
            <div className="flex-1" />
            <Skeleton className="h-32 w-full rounded-lg" />
        </div>
    );
};
export const SkeletonDashboardGrid = ({ count = 6 }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <InsightCardSkeleton key={i} />
            ))}
        </div>
    );
};
