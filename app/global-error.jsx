"use client";

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
    useEffect(() => {
        // Log error to error reporting service
        console.error('Global error:', error);
    }, [error]);

    return (
        <html>
            <body className="bg-gray-50 min-h-screen flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    {/* Error Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    {/* Error Message */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">something went wrong</h1>
                    <p className="text-gray-600 mb-6">
                        an unexpected error occurred. please try again or contact support if the problem persists.
                    </p>

                    {/* Error Details (dev only) */}
                    {process.env.NODE_ENV === 'development' && error?.message && (
                        <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
                            <p className="text-xs font-mono text-red-600 break-all">{error.message}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => reset()}
                            className="px-6 py-3 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors"
                        >
                            try again
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
                        >
                            go home
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
