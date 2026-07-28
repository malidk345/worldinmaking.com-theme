import React from 'react'
import { useApp } from '../../context/App'
import { IconDay, IconNight, IconLaptop } from '@posthog/icons'

export default function DisplayOptions(): JSX.Element {
    const { siteSettings, updateSiteSettings } = useApp()

    const handleThemeChange = (colorMode: 'light' | 'dark' | 'system') => {
        let theme: 'light' | 'dark' = 'light'
        if (colorMode === 'system') {
            theme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        } else {
            theme = colorMode
        }
        if (typeof window !== 'undefined' && window.__setPreferredTheme) {
            window.__setPreferredTheme(colorMode)
        }
        updateSiteSettings({
            ...siteSettings,
            colorMode,
            theme,
        })
    }

    return (
        <div data-scheme="primary" className="p-6 bg-accent text-primary h-full max-w-xl mx-auto space-y-6 overflow-y-auto">
            <div>
                <h2 className="text-xl font-bold mb-1">Display options</h2>
                <p className="text-sm text-secondary">Customize your visual interface experience.</p>
            </div>

            {/* Theme */}
            <div className="bg-primary/5 p-4 rounded-lg border border-border space-y-3">
                <label className="block text-sm font-semibold">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => handleThemeChange('light')}
                        className={`flex flex-col items-center justify-center p-3 rounded-md border text-sm font-medium transition-all ${
                            siteSettings?.colorMode === 'light'
                                ? 'bg-primary text-primary-inverted border-primary shadow-sm'
                                : 'bg-transparent border-border hover:bg-primary/10'
                        }`}
                    >
                        <IconDay className="size-5 mb-1" />
                        Light
                    </button>
                    <button
                        onClick={() => handleThemeChange('dark')}
                        className={`flex flex-col items-center justify-center p-3 rounded-md border text-sm font-medium transition-all ${
                            siteSettings?.colorMode === 'dark'
                                ? 'bg-primary text-primary-inverted border-primary shadow-sm'
                                : 'bg-transparent border-border hover:bg-primary/10'
                        }`}
                    >
                        <IconNight className="size-5 mb-1" />
                        Dark
                    </button>
                    <button
                        onClick={() => handleThemeChange('system')}
                        className={`flex flex-col items-center justify-center p-3 rounded-md border text-sm font-medium transition-all ${
                            siteSettings?.colorMode === 'system'
                                ? 'bg-primary text-primary-inverted border-primary shadow-sm'
                                : 'bg-transparent border-border hover:bg-primary/10'
                        }`}
                    >
                        <IconLaptop className="size-5 mb-1" />
                        System
                    </button>
                </div>
            </div>

            {/* Desktop Wallpaper */}
            <div className="bg-primary/5 p-4 rounded-lg border border-border space-y-3">
                <label className="block text-sm font-semibold">Desktop Wallpaper</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'keyboard-garden', label: 'Keyboard Garden' },
                        { id: 'hogzilla', label: 'Hogzilla' },
                        { id: 'startup-monopoly', label: 'Startup Monopoly' },
                        { id: 'office-party', label: 'Office Party' },
                    ].map((wp) => (
                        <button
                            key={wp.id}
                            onClick={() => updateSiteSettings({ ...siteSettings, wallpaper: wp.id as any })}
                            className={`p-2 rounded-md border text-left text-sm transition-all ${
                                siteSettings?.wallpaper === wp.id
                                    ? 'bg-primary text-primary-inverted font-semibold border-primary'
                                    : 'bg-transparent border-border hover:bg-primary/10'
                            }`}
                        >
                            {wp.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cursor Style */}
            <div className="bg-primary/5 p-4 rounded-lg border border-border space-y-3">
                <label className="block text-sm font-semibold">Cursor Style</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'default', label: 'Default' },
                        { id: 'xl', label: 'Extra Large' },
                        { id: 'james', label: 'James Hawkins' },
                    ].map((c) => (
                        <button
                            key={c.id}
                            onClick={() => updateSiteSettings({ ...siteSettings, cursor: c.id as any })}
                            className={`p-2 rounded-md border text-center text-sm transition-all ${
                                siteSettings?.cursor === c.id
                                    ? 'bg-primary text-primary-inverted font-semibold border-primary'
                                    : 'bg-transparent border-border hover:bg-primary/10'
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Settings Toggles */}
            <div className="bg-primary/5 p-4 rounded-lg border border-border space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="block text-sm font-semibold">Screensaver</span>
                        <span className="text-xs text-secondary">Trigger after 5m inactivity</span>
                    </div>
                    <button
                        onClick={() =>
                            updateSiteSettings({ ...siteSettings, screensaverDisabled: !siteSettings.screensaverDisabled })
                        }
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                            !siteSettings?.screensaverDisabled
                                ? 'bg-green-600 text-white'
                                : 'bg-secondary/20 text-primary'
                        }`}
                    >
                        {!siteSettings?.screensaverDisabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <span className="block text-sm font-semibold">Performance Boost</span>
                        <span className="text-xs text-secondary">Reduce visual effects for faster rendering</span>
                    </div>
                    <button
                        onClick={() =>
                            updateSiteSettings({ ...siteSettings, performanceBoost: !siteSettings.performanceBoost })
                        }
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                            siteSettings?.performanceBoost
                                ? 'bg-green-600 text-white'
                                : 'bg-secondary/20 text-primary'
                        }`}
                    >
                        {siteSettings?.performanceBoost ? 'On' : 'Off'}
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <span className="block text-sm font-semibold">Reduce Transparency</span>
                        <span className="text-xs text-secondary">Disable translucent backgrounds</span>
                    </div>
                    <button
                        onClick={() =>
                            updateSiteSettings({ ...siteSettings, reduceTransparency: !siteSettings.reduceTransparency })
                        }
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                            siteSettings?.reduceTransparency
                                ? 'bg-green-600 text-white'
                                : 'bg-secondary/20 text-primary'
                        }`}
                    >
                        {siteSettings?.reduceTransparency ? 'On' : 'Off'}
                    </button>
                </div>
            </div>
        </div>
    )
}
