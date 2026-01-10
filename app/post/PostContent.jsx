"use client";
import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardHeader from '../components/DashboardHeader';
import { useWindow } from '../contexts/WindowContext';

function BlogPostContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const { windows, openWindow } = useWindow();

    React.useEffect(() => {
        if (id) {
            const windowId = `blog-window-${id}`;
            const isWindowAlreadyOpen = windows.some(w => w.id === windowId || (w.type === 'blog' && w.id.includes(id)));

            if (!isWindowAlreadyOpen) {
                openWindow('blog', {
                    id: windowId,
                    title: 'post',
                    initialWidth: 900,
                    initialHeight: 700
                });
            }
        }
    }, [id, openWindow]); // Removed 'windows' to prevent re-opening on every close

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            {/* Windows handled by WindowManager */}
        </div>
    );
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
