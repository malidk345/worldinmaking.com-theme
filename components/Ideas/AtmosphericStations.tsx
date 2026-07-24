"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { IconBolt, IconBook, IconCoffee, IconNight, IconScreen, IconTerminal } from '@posthog/icons';
import { useApp } from 'context/App'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { LemonButton } from 'components/LemonUI'

const STATIONS = [
    {
        id: 'station-default',
        name: 'Standard OS',
        description: 'The default World In Making experience. Clean, balanced, functional.',
        icon: <IconScreen className="size-5" />,
        settings: { colorMode: 'light', theme: 'light', wallpaper: 'keyboard-garden' }
    },
    {
        id: 'station-night-theory',
        name: 'Night Theory',
        description: 'Dark mode optimized for deep reading. High contrast typography, muted borders.',
        icon: <IconNight className="size-5" />,
        settings: { colorMode: 'dark', theme: 'dark', wallpaper: 'dark-mesh' }
    },
    {
        id: 'station-tech-doc',
        name: 'Technical Grid',
        description: 'Monospaced focus. Sharp edges, terminal aesthetics for analytical thinking.',
        icon: <IconTerminal className="size-5" />,
        settings: { colorMode: 'dark', theme: 'hacker', wallpaper: 'grid-lines' }
    },
    {
        id: 'station-cafe',
        name: 'Morning Coffee',
        description: 'Warm, low contrast light mode. Easy on the eyes for morning curation.',
        icon: <IconCoffee className="size-5" />,
        settings: { colorMode: 'light', theme: 'warm', wallpaper: 'paper-texture' }
    },
    {
        id: 'station-focus',
        name: 'Deep Focus',
        description: 'Minimalist. Hides non-essential UI elements to maximize reading comprehension.',
        icon: <IconBolt className="size-5" />,
        settings: { colorMode: 'dark', theme: 'minimal', wallpaper: 'solid-black', performanceBoost: true }
    }
]

export default function AtmosphericStations() {
    const { siteSettings, updateSiteSettings } = useApp()
    const [activeHover, setActiveHover] = useState<string | null>(null)

    const handleApplyStation = (settings: Partial<typeof siteSettings>) => {
        updateSiteSettings(prev => ({ ...prev, ...settings }))
    }

    const currentMode = siteSettings.colorMode

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-[#121214] text-primary">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/50">
                            {STATIONS.length} READING STATIONS
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    {STATIONS.map((station) => {
                        return (
                            <motion.div
                                key={station.id}
                                onHoverStart={() => setActiveHover(station.id)}
                                onHoverEnd={() => setActiveHover(null)}
                                className={`bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-[24px] shadow-sm p-5 md:p-6 transition-all duration-200 ${
                                    activeHover === station.id
                                    ? 'border-black/20 dark:border-white/20 shadow-md'
                                    : 'hover:border-black/10 dark:hover:border-white/10'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-[14px] shrink-0 bg-black/5 dark:bg-white/5 text-primary">
                                        {station.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold mb-1 text-base text-primary">{station.name}</h3>
                                        <p className="text-xs md:text-sm text-secondary/80 mb-4 leading-relaxed">{station.description}</p>

                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5 dark:border-white/5">
                                            <div className="flex gap-2">
                                                <span className="text-[10px] font-mono px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full text-secondary">
                                                    mode: {station.settings.colorMode}
                                                </span>
                                            </div>
                                            <LemonButton
                                                type="primary"
                                                size="small"
                                                onClick={() => handleApplyStation(station.settings)}
                                                className="text-xs py-1 px-3"
                                            >
                                                Apply Station
                                            </LemonButton>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
