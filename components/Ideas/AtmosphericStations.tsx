"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { IconBolt, IconBook, IconCoffee, IconNight, IconScreen, IconTerminal } from '@posthog/icons';
import { useApp } from 'context/App'
import ScrollArea from 'components/RadixUI/ScrollArea'
import OSButton from 'components/OSButton'

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

    // Attempt to guess current station based on colorMode (simplistic check for mock)
    const currentMode = siteSettings.colorMode

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] text-black dark:text-white">
            <div className="p-4 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <IconBook className="size-5" />
                    Atmospheric Reading Stations
                </h2>
                <p className="text-xs opacity-60 mt-1">
                    Select a station to change your environment&apos;s mood and optimize your cognitive load.
                </p>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="grid gap-4 max-w-2xl mx-auto pb-6">
                    {STATIONS.map((station) => {
                        return (
                            <motion.div
                                key={station.id}
                                onHoverStart={() => setActiveHover(station.id)}
                                onHoverEnd={() => setActiveHover(null)}
                                className={`border rounded-md p-4 transition-all duration-300 ${
                                    activeHover === station.id
                                    ? 'border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] -translate-y-1'
                                    : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                                } bg-white dark:bg-[#141414]`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-md shrink-0 ${
                                        currentMode === 'dark' ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
                                    }`}>
                                        {station.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold mb-1 text-sm">{station.name}</h3>
                                        <p className="text-xs opacity-70 mb-4">{station.description}</p>

                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex gap-2">
                                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded-sm">
                                                    Mode: {station.settings.colorMode}
                                                </span>
                                            </div>
                                            <OSButton
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleApplyStation(station.settings)}
                                                className="text-xs py-1 px-3 h-auto"
                                            >
                                                Apply Station
                                            </OSButton>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}
