'use client'

import React from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                    <h2 className="text-3xl font-bold mb-4">Something went wrong!</h2>
                    <button
                        onClick={() => reset()}
                        className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-500 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
