import React from 'react'

interface SpatialIconProps {
    icon: React.ElementType
    color: string
    bgTint: string
    className?: string
}

export default function SpatialIcon({
    icon: IconComponent,
    color,
    bgTint,
    className = ''
}: SpatialIconProps) {
    return (
        <div className={`glass-card relative flex items-center justify-center size-14 md:size-[60px] rounded-[18px] md:rounded-[20px] bg-white/70 dark:bg-black/70 shadow-lg border border-black/5 dark:border-white/10 group ${className}`}>

            {/* Subtle color tint to give the glass character */}
            <div className={`absolute inset-0 rounded-[18px] md:rounded-[20px] bg-gradient-to-br ${bgTint} opacity-30 dark:opacity-20 pointer-events-none`} />

            {/* Inner highlight for spatial 3D effect */}
            <div className="absolute inset-0 rounded-[18px] md:rounded-[20px] pointer-events-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]" />

            {/* The actual icon */}
            <div className={`z-10 ${color} drop-shadow-sm transition-transform duration-300 group-hover:scale-110 group-active:scale-95`}>
                <IconComponent className="size-7 md:size-8" />
            </div>
        </div>
    )
}
