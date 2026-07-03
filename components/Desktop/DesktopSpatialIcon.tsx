import React from 'react'

interface SpatialIconProps {
    icon: React.ElementType
    colorStart: string
    colorEnd: string
    shadowColor: string
    className?: string
}

export default function SpatialIcon({
    icon: IconComponent,
    colorStart,
    colorEnd,
    shadowColor,
    className = ''
}: SpatialIconProps) {
    return (
        <div className={`relative flex items-center justify-center size-[60px] rounded-[24px] shadow-2xl supports-[backdrop-filter]:backdrop-blur-[60px] bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 overflow-hidden transition-transform duration-300 ${className}`}>
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorStart} ${colorEnd} opacity-80`} />

            {/* Inner glow / glass reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-white/20 dark:to-transparent pointer-events-none" />

            {/* Spatial shadow reflection */}
            <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 blur-xl ${shadowColor} opacity-50 pointer-events-none`} />

            {/* The actual icon */}
            <div className="z-10 text-white drop-shadow-md">
                <IconComponent className="size-8" />
            </div>
        </div>
    )
}
