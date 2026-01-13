"use client";
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardHeader from '../components/DashboardHeader';
import { useWindow } from '../contexts/WindowContext';

function BlogPostContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const { openWindow } = useWindow();

    React.useEffect(() => {
        if (id) {
            // openWindow brings existing window to front, or creates new one at front
            openWindow('blog', {
                id: `blog-window-${id}`,
                title: 'post'
            });
        }
    }, [id]);

    return null;
}

export default function PostContent() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-bg-3000">
                <div className="animate-pulse flex flex-col items-center mt-20">
                    <div className="h-8 w-64 bg-black/10 rounded mb-4"></div>
                    <div className="h-4 w-48 bg-black/10 rounded"></div>
                </div>
            </div>
        }>
            <BlogPostContent />
        </Suspense>
    );
}
