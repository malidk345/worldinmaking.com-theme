"use client";
import React, { Suspense } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import BlogWindow from '../components/BlogWindow';
import { useRouter } from 'next/navigation';

function BlogPostContent() {
    const router = useRouter();

    const handleClose = () => {
        router.push('/');
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <BlogWindow onClose={handleClose} />
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
