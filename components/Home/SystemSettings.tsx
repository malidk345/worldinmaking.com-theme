"use client"

import React from 'react'
import { Monitor } from 'lucide-react'
import { useApp } from '../../context/App'

export default function SystemSettings() {
    const { siteSettings, updateSiteSettings } = useApp()


    return (
        <div className="h-full bg-primary flex flex-col overflow-hidden lowercase">
            <div className="p-4 border-b border-primary bg-accent/20">
                <h1 className="text-lg font-bold flex items-center gap-2">
                    <Monitor className="size-5" />
                    system settings
                </h1>
            </div>

            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                <section>
                    <h2 className="text-sm font-bold opacity-60 mb-4 tracking-tight">appearance mode</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => updateSiteSettings(prev => ({ ...prev, colorMode: 'light' }))}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all flex-1 ${siteSettings.colorMode === 'light' ? 'border-primary bg-white shadow-sm font-bold text-primary' : 'border-primary/20 hover:bg-accent/10'}`}
                        >
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <span className="text-xl">☀</span>
                            </div>
                            <span className="text-[11px] font-bold">light mode</span>
                        </button>
                        <button
                            onClick={() => updateSiteSettings(prev => ({ ...prev, colorMode: 'dark' }))}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all flex-1 ${siteSettings.colorMode === 'dark' ? 'border-primary bg-zinc-800 text-white shadow-sm' : 'border-primary/20 hover:bg-zinc-800/10'}`}
                        >
                            <div className="size-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300">
                                <span className="text-xl">☾</span>
                            </div>
                            <span className="text-[11px] font-bold">dark mode</span>
                        </button>
                    </div>
                </section>

                {/* Wallpaper selection removed as per user request (only Keyboard Garden remains) */}

                <section className="pt-6 border-t border-primary/10">
                    <div className="flex items-center justify-between p-4 bg-accent/10 rounded border border-primary/20">
                        <div>
                            <div className="font-bold text-sm">dynamic accent color</div>
                            <div className="text-[11px] opacity-60">sync with system theme protocols</div>
                        </div>
                        <div className="size-4 rounded-full bg-primary shadow-sm shadow-primary/50" />
                    </div>
                </section>
            </div>

            <div className="p-4 bg-accent/5 border-t border-primary/10 text-[10px] text-center opacity-40">
                world in making os v0.1.0-alpha
            </div>
        </div>
    )
}

