"use client"

import React from 'react'
import { RefreshCw } from 'lucide-react'

interface LoadingProps {
    className?: string
    fullScreen?: boolean
    label?: string
}

export default function Loading({ className = '', fullScreen = false, label }: LoadingProps) {
    const containerClasses = fullScreen
        ? `fixed inset-0 z-[9999] bg-primary flex flex-col items-center justify-center ${className}`.trim()
        : `relative flex flex-col items-center justify-center py-12 text-primary ${className}`.trim()

    return (
        <div className={containerClasses}>
            <div className="flex flex-col items-center justify-center gap-3 text-primary/50 lowercase">
                <RefreshCw className="size-5 animate-spin opacity-30" />
                {label ? <p className="m-0 text-xs font-black tracking-wide">{label}</p> : null}
            </div>
        </div>
    )
}
