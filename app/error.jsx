"use client";

import { useEffect, useCallback } from 'react';
import DashboardHeader from './components/DashboardHeader';
import logger from './utils/logger';

export default function Error({ error, reset }) {
    useEffect(() => {
        // Log error for debugging/monitoring
        logger.error('[Error Boundary] Page error:', error);
    }, [error]);

    const handleReset = useCallback(() => {
        reset();
    }, [reset]);

    const handleGoHome = useCallback(() => {
        window.location.href = '/';
    }, []);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DashboardHeader />
            <main
                className="flex-1 flex items-center justify-center bg-bg-3000 p-6"
                role="alert"
                aria-labelledby="error-title"
            >
                <div className="max-w-md w-full text-center">
                    {/* Error Icon */}
                    <div
                        className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center border border-red-100"
                        aria-hidden="true"
                    >
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    {/* Error Message */}
                    <h2 id="error-title" className="text-xl font-bold text-primary mb-2">
                        oops, something went wrong
                    </h2>
                    <p className="text-secondary text-sm mb-6">
                        we encountered an error while loading this page. please try again.
                    </p>

                    {/* Error Details (dev only) */}
                    {process.env.NODE_ENV === 'development' && error?.message && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-left">
                            <p className="text-[11px] font-mono text-red-600 break-all">{error.message}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={handleReset}
                            className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                            try again
                        </button>
                        <button
                            onClick={handleGoHome}
                            className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            go home
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
