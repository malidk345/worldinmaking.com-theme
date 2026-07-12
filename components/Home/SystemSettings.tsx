"use client"

import React from 'react'
import { Monitor } from 'lucide-react'
import { useApp } from '../../context/App'
import { useTranslation } from 'hooks/useTranslation'

export default function SystemSettings() {
    const { siteSettings, updateSiteSettings } = useApp()
    const { t } = useTranslation()

    return (
        <div className="h-full bg-primary flex flex-col overflow-hidden lowercase">
            <div className="p-4 border-b border-primary bg-accent/20">
                <h1 className="text-lg font-bold flex items-center gap-2">
                    <Monitor className="size-5" />
                    {t('sys.title')}
                </h1>
            </div>

            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                <section>
                    <h2 className="text-sm font-bold opacity-60 mb-4 tracking-tight">{t('sys.appearance')}</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => updateSiteSettings(prev => ({ ...prev, colorMode: 'light' }))}
                            className={`flex flex-col items-center gap-2 p-3 rounded-3xl border border-black/10 dark:border-white/10 transition-all flex-1 ${siteSettings.colorMode === 'light' ? 'bg-white shadow-md font-bold text-black ring-2 ring-black/20' : 'hover:bg-accent/10 dark:hover:bg-white/5'}`}
                        >
                            <div className="size-10 rounded-full bg-black/5 flex items-center justify-center text-black">
                                <span className="text-xl">☀</span>
                            </div>
                            <span className="text-[11px] font-bold">{t('sys.light')}</span>
                        </button>
                        <button
                            onClick={() => updateSiteSettings(prev => ({ ...prev, colorMode: 'dark' }))}
                            className={`flex flex-col items-center gap-2 p-3 rounded-3xl border border-black/10 dark:border-white/10 transition-all flex-1 ${siteSettings.colorMode === 'dark' ? 'bg-zinc-900 text-white shadow-md ring-2 ring-white/20' : 'hover:bg-accent/10 dark:hover:bg-white/5'}`}
                        >
                            <div className="size-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                                <span className="text-xl">☾</span>
                            </div>
                            <span className="text-[11px] font-bold">{t('sys.dark')}</span>
                        </button>
                    </div>
                </section>

                {/* Wallpaper selection removed as per user request (only Keyboard Garden remains) */}

                <section className="pt-6 border-t border-black/10 dark:border-white/10">
                    <div className="flex items-center justify-between p-4 bg-accent/10 dark:bg-white/5 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm">
                        <div>
                            <div className="font-bold text-sm">{t('sys.dynamic')}</div>
                            <div className="text-[11px] opacity-60">{t('sys.sync')}</div>
                        </div>
                        <div className="size-5 rounded-full bg-black dark:bg-white shadow-sm opacity-80" />
                    </div>
                </section>
            </div>

            <div className="p-4 bg-accent/5 border-t border-primary/10 text-[10px] text-center opacity-40">
                world in making os v0.1.0-alpha
            </div>
        </div>
    )
}

