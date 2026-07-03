import React from 'react'

interface SpatialIconProps {
    icon: React.ElementType
    className?: string
}

export default function SpatialIcon({
    icon: IconComponent,
    className = ''
}: SpatialIconProps) {
    return (
        <div className={`glass-card relative flex items-center justify-center size-[68px] rounded-[24px] bg-white/80 dark:bg-black/80 shadow-xl border border-black/5 dark:border-white/10 group ${className}`}>
            {/* Inner highlight for spatial 3D effect */}
            <div className="absolute inset-0 rounded-[24px] pointer-events-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]" />

            {/* The actual icon */}
            <div className="z-10 text-primary drop-shadow-sm transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
                <IconComponent className="size-8" />
            </div>
        </div>
    )
}
