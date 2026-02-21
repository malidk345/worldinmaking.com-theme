import React from 'react'

interface ProgressBarProps {
    progress?: number
    className?: string
}

export default function ProgressBar({ progress = 0, className = '' }: ProgressBarProps): JSX.Element {
    const percentage = Math.min(100, Math.max(0, progress))

    return (
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 ${className}`}>
            <div
                className="bg-red dark:bg-yellow h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
            />
        </div>
    )
}
