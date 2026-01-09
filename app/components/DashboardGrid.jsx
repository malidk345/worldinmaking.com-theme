
"use client";
import React, { useState } from 'react';
import { getExcerpt } from '../lib/markdown';
import InsightCard from './InsightCard';

export default function DashboardGrid({ posts, loading }) {
    const [showAll, setShowAll] = useState(false);
    const INITIAL_COUNT = 10;

    // Use passed posts
    const items = posts || [];

    if (loading) {
        return (
            <div className="w-full relative">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-[340px] bg-black/5 rounded-lg animate-pulse border border-transparent"></div>
                    ))}
                </div>
            </div>
        );
    }

    const visibleItems = showAll ? items : items.slice(0, INITIAL_COUNT);
    const hasMore = items.length > INITIAL_COUNT && !showAll;

    return (
        <div className="w-full relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleItems.map(item => (
                    <div key={item.id} className="InsightCard border h-[340px]">
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
                        onClick={() => setShowAll(true)}
                        className="LemonButton LemonButton--secondary LemonButton--status-default LemonButton--small"
                        type="button"
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
