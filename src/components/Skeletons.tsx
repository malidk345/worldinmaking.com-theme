'use client';

import React from 'react';

// Base skeleton shimmer animation
const shimmerClass = "animate-pulse bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 bg-[length:200%_100%]";

// Generic skeleton box
export const Skeleton: React.FC<{
    className?: string;
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full' | 'xl';
    style?: React.CSSProperties;
}> = ({ className = '', rounded = 'md', style }) => {
    const roundedClass = {
        none: '',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
    }[rounded];

    return <div className={`${shimmerClass} ${roundedClass} ${className}`} style={style} />;
};

// Text line skeleton
export const SkeletonText: React.FC<{
    lines?: number;
    className?: string;
}> = ({ lines = 3, className = '' }) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
            />
        ))}
    </div>
);

// Avatar skeleton
export const SkeletonAvatar: React.FC<{
    size?: number;
    className?: string;
}> = ({ size = 40, className = '' }) => (
    <Skeleton
        className={className}
        rounded="full"
        style={{ width: size, height: size }}
    />
);

// Card skeleton (for blog posts)
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`p-5 rounded-xl border border-black/5 dark:border-white/5 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
            <SkeletonAvatar size={32} />
            <div className="flex-1">
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-2 w-16" />
            </div>
        </div>
        <Skeleton className="h-5 w-3/4 mb-3" />
        <SkeletonText lines={2} />
        <div className="flex gap-2 mt-4">
            <Skeleton className="h-6 w-16" rounded="full" />
            <Skeleton className="h-6 w-20" rounded="full" />
        </div>
    </div>
);

// Post content skeleton
export const SkeletonPostContent: React.FC = () => (
    <div className="animate-fade-up">
        {/* Header */}
        <div className="mb-8">
            <Skeleton className="h-4 w-20 mb-4" rounded="full" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-2/3 mb-6" />
            <div className="flex items-center gap-3">
                <SkeletonAvatar size={40} />
                <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
            <SkeletonText lines={4} />
            <Skeleton className="h-48 w-full" rounded="lg" />
            <SkeletonText lines={5} />
            <Skeleton className="h-6 w-1/2" />
            <SkeletonText lines={3} />
        </div>
    </div>
);

// Comment skeleton
export const SkeletonComment: React.FC = () => (
    <div className="flex gap-3 py-4">
        <SkeletonAvatar size={32} />
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-12" />
            </div>
            <SkeletonText lines={2} />
        </div>
    </div>
);

// Home grid skeleton
export const SkeletonHomeGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </div>
);

// Sidebar skeleton
export const SkeletonSidebar: React.FC = () => (
    <div className="space-y-4">
        <Skeleton className="h-4 w-24 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-8 w-8" rounded="lg" />
                <Skeleton className="h-4 w-full" />
            </div>
        ))}
    </div>
);

export default Skeleton;
