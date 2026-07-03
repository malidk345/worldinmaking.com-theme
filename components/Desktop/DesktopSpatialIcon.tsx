import React from 'react'

interface SpatialIconProps {
    children: React.ReactNode
    bgTint?: string
    className?: string
}

export default function SpatialIcon({
    children,
    bgTint,
    className = ''
}: SpatialIconProps) {
    return (
        <div className={`glass-card relative flex items-center justify-center size-[68px] rounded-[22px] bg-white/70 dark:bg-black/70 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 dark:border-white/10 group ${className}`}>

            {bgTint && (
                <div className={`absolute inset-0 rounded-[22px] bg-gradient-to-br ${bgTint} opacity-30 dark:opacity-20 pointer-events-none`} />
            )}

            {/* Inner highlight for spatial 3D effect */}
            <div className="absolute inset-0 rounded-[22px] pointer-events-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]" />

            {/* The actual icon */}
            <div className="z-10 drop-shadow-lg transition-all duration-500 group-hover:scale-125 group-hover:-translate-y-1 group-active:scale-95">
                {children}
            </div>
        </div>
    )
}
