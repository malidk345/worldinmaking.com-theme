"use client";
import React from 'react';

export default function GenericPage({ title, description, icon, isWindowMode = false }) {
    const content = (
        <div className="flex-1 overflow-y-auto bg-primary h-full" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-surface-tertiary rounded-xl border border-primary">
                        {icon}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-primary lowercase">{title}</h1>
                        <p className="text-secondary mt-1">{description}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 border border-primary rounded-xl bg-surface-primary shadow-sm hover:shadow-md transition-shadow">
                        <h2 className="text-lg font-bold mb-4 lowercase">overview</h2>
                        <div className="space-y-4">
                            <div className="h-4 bg-surface-tertiary rounded w-3/4"></div>
                            <div className="h-4 bg-surface-tertiary rounded w-1/2"></div>
                            <div className="h-4 bg-surface-tertiary rounded w-5/6"></div>
                        </div>
                    </div>

                    <div className="p-6 border border-primary rounded-xl bg-surface-primary shadow-sm hover:shadow-md transition-shadow">
                        <h2 className="text-lg font-bold mb-4 lowercase">recent activity</h2>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-surface-tertiary border border-primary shrink-0"></div>
                                    <div className="flex-1">
                                        <div className="h-3 bg-surface-tertiary rounded w-1/3 mb-1"></div>
                                        <div className="h-2 bg-surface-tertiary rounded w-1/4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-12 border-2 border-dashed border-primary rounded-2xl flex flex-col items-center justify-center text-center bg-surface-tertiary/30">
                    <div className="text-tertiary mb-4">
                        <svg className="size-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-secondary lowercase">no data available yet</h3>
                    <p className="text-sm text-tertiary mt-2">new content for {title} will appear here soon.</p>
                </div>
            </div>
        </div>
    );

    if (isWindowMode) return content;

    return null;
}
