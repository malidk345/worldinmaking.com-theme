"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { getExcerpt } from '../lib/markdown';
import InsightCard from './InsightCard';
import { SkeletonDashboardGrid } from './Skeleton';

const INITIAL_COUNT = 10;

// Unified skeleton loader using global Skeleton component
const GridSkeleton = () => (
    <div className="w-full relative">
        <SkeletonDashboardGrid count={6} />
    </div>
);

export default function DashboardGrid({ posts = [], loading = false }) {
    const [showAll, setShowAll] = useState(false);

    // Memoize visible items calculation
    const visibleItems = useMemo(() => {
        return showAll ? posts : posts.slice(0, INITIAL_COUNT);
    }, [posts, showAll]);

    const hasMore = useMemo(() => {
        return posts.length > INITIAL_COUNT && !showAll;
    }, [posts.length, showAll]);

    // Memoize handler
    const handleShowMore = useCallback(() => {
        setShowAll(true);
    }, []);

    if (loading) {
        return <GridSkeleton />;
    }

    if (posts.length === 0) {
        return (
            <div className="w-full flex items-center justify-center py-12">
                <p className="text-secondary text-sm">No posts found</p>
            </div>
        );
    }

    return (
        <div className="w-full relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleItems.map(item => (
                    <div
                        key={item.id}
                        className={`InsightCard ${item.image ? 'h-[340px]' : 'h-auto'}`}
                    >
                        <InsightCard
                            id={item.id}
                            title={item.title}
                            description={getExcerpt(item.content || item.description, 115)}
                            type={item.category}
                            ribbonColor={item.ribbon}
                            date={item.date}
                            author={item.authorName}
                            authorAvatar={item.authorAvatar}
                            image={item.image}
                        />
                    </div>
                ))}
            </div>

            {hasMore && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={handleShowMore}
                        className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small"
                        type="button"
                        aria-label="Load more posts"
                    >
                        <span className="LemonButton__chrome">
                            more
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}
