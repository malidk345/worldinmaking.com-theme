"use client";

import React from 'react';

export default function SearchPage({ isWindowMode = false }) {
    const mainContent = (
        <div className="flex-1 flex items-center justify-center bg-bg-3000 h-full">
            <div className="text-center p-8">
                <div className="w-16 h-16 bg-white border border-black/15 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-primary mb-2 lowercase">search worldinmaking</h2>
                <p className="text-sm text-secondary font-medium lowercase">search functionality coming soon.</p>
            </div>
        </div>
    );

    if (isWindowMode) return mainContent;

    return null;
}
