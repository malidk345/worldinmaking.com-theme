import React from 'react'
import { AppIcon } from 'components/OSIcons/AppIcon'

const ICONS = [
    { name: 'notebook' as const, label: 'Notebooks', scene: 'notebook' as const },
    { name: 'forums' as const, label: 'Community', scene: 'seminar' as const },
    { name: 'wimAi' as const, label: 'WIM AI', scene: 'notebook' as const },
    { name: 'posts' as const, label: 'Posts', scene: 'seminar' as const },
]

export default function DeskScene({ onOpen }: { onOpen: (scene: 'notebook' | 'seminar') => void }) {
    return (
        <div className="relative h-full min-h-[280px] p-5 overflow-hidden">
            <div
                aria-hidden
                className="absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(0deg,currentColor 0,currentColor 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,currentColor 0,currentColor 1px,transparent 1px,transparent 28px)',
                }}
            />
            <p className="relative text-[12px] text-secondary m-0 mb-4 max-w-md">
                The site is a desk. Apps are windows. Click a folder — this demo will open it here, without leaving
                Home.
            </p>
            <ul className="relative list-none m-0 p-0 flex flex-wrap gap-5">
                {ICONS.map((icon) => (
                    <li key={icon.label}>
                        <button
                            type="button"
                            onClick={() => onOpen(icon.scene)}
                            className="w-20 flex flex-col items-center gap-1 group"
                        >
                            <span className="drop-shadow-md group-hover:scale-[1.04] transition-transform">
                                <AppIcon name={icon.name} />
                            </span>
                            <span className="text-[11px] font-medium text-center text-primary text-shadow-desktop">
                                {icon.label}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}
