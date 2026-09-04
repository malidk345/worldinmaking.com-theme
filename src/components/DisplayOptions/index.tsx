import React, { useState, useEffect } from 'react'
import { ToggleGroup, ToggleOption } from 'components/RadixUI/ToggleGroup'
import { IconDay, IconInfo, IconLaptop, IconNight } from '@posthog/icons'
import { SEO } from 'components/seo'
import { useApp } from '../../context/App'
import type { SiteSettings } from '../../context/App'
import Tooltip from 'components/RadixUI/Tooltip'
import useTheme from '../../hooks/useTheme'
import KeyboardShortcut from 'components/KeyboardShortcut'

const colorModeOptions: ToggleOption[] = [
    {
        label: 'System',
        value: 'system',
        icon: <IconLaptop className="size-5" />,
    },
    {
        label: 'Light',
        value: 'light',
        icon: <IconDay className="size-5" />,
        default: true,
    },
    {
        label: 'Dark',
        value: 'dark',
        icon: <IconNight className="size-5" />,
    },
]

interface WallpaperSelectProps {
    value: string
    onValueChange: (value: string) => void
    title: string
}

const WallpaperSelect = ({ value, onValueChange, title }: WallpaperSelectProps) => {
    const [isDark, setIsDark] = useState(false)
    const { themeOptions } = useTheme()

    useEffect(() => {
        const checkTheme = () => {
            const bodyClass = document.body.className
            setIsDark(bodyClass.includes('dark'))
        }

        checkTheme()

        const observer = new MutationObserver(checkTheme)
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })

        return () => observer.disconnect()
    }, [])

    return (
        <div className="h-full min-h-0 flex flex-col">
            <div className="shrink-0 mb-2">
                <label className="pt-1.5 text-sm">{title}</label>
                <p className="text-xs text-secondary text-balance leading-normal mt-1 mb-0">
                    Cycle between wallpapers with{' '}
                    <span className="inline-block">
                        <KeyboardShortcut text="\" size="xs" />
                    </span>
                </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
                <div className="grid grid-cols-2 gap-2 pb-2">
                    {themeOptions.map((option) => {
                        const optionThumb = isDark
                            ? option.background?.thumb?.dark
                            : option.background?.thumb?.light
                        const isSelected = option.value === value
                        return (
                            <button
                                key={option.value}
                                type="button"
                                data-scheme="primary"
                                onClick={() => onValueChange(option.value)}
                                className={`w-full p-2 text-left bg-primary hover:bg-accent border border-input hover:border-primary flex flex-col items-center gap-2 rounded ${
                                    isSelected ? 'bg-accent border-primary' : ''
                                }`}
                            >
                                <img
                                    src={optionThumb}
                                    alt={option.label}
                                    className="w-full aspect-video object-cover rounded"
                                />
                                <span className={`text-sm text-primary ${isSelected ? 'font-bold' : 'font-medium'}`}>
                                    {option.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default function DisplayOptions(): JSX.Element {
    const { siteSettings, updateSiteSettings } = useApp()

    const handleColorModeChange = (value: string) => {
        if (typeof window !== 'undefined' && window.__setPreferredTheme) {
            const newTheme = window.__setPreferredTheme(value)
            updateSiteSettings({
                ...siteSettings,
                theme: newTheme as SiteSettings['theme'],
                colorMode: value as SiteSettings['colorMode'],
            })
        }
    }

    const handleWallpaperChange = (value: string) => {
        updateSiteSettings({
            ...siteSettings,
            wallpaper: value as SiteSettings['wallpaper'],
        })
    }

    return (
        <>
            <SEO title="display options" description="personalize worldinmaking." noindex />
            <div data-scheme="primary" className="w-full h-full min-h-0 flex flex-col bg-transparent text-primary p-4">
                <div className="shrink-0 grid grid-cols-2 gap-2">
                    <ToggleGroup
                        title="Color mode"
                        options={colorModeOptions}
                        onValueChange={handleColorModeChange}
                        value={siteSettings.colorMode}
                    />
                    <ToggleGroup
                        title="Desktop icons"
                        options={[
                            { label: 'Pixel', value: 'pixel', default: true },
                            { label: 'Custom', value: 'default' },
                        ]}
                        onValueChange={(value) => {
                            updateSiteSettings({
                                ...siteSettings,
                                iconSet: value === 'pixel' ? 'pixel' : 'default',
                            })
                        }}
                        value={siteSettings.iconSet === 'pixel' ? 'pixel' : 'default'}
                    />
                </div>
                <div className="shrink-0 grid grid-cols-2 gap-2 my-2">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-sm">Reduce transparency</span>
                        <Tooltip trigger={<IconInfo className="size-4 inline-block relative -top-px" />} delay={0}>
                            <p className="max-w-sm my-0 leading-snug">
                                Solid, opaque backgrounds for windows and sidebars instead of blurred transparency.
                            </p>
                        </Tooltip>
                    </div>
                    <div>
                        <ToggleGroup
                            title=""
                            options={[
                                { label: 'Disabled', value: 'false' },
                                { label: 'Enabled', value: 'true' },
                            ]}
                            onValueChange={(value) => {
                                updateSiteSettings({ ...siteSettings, reduceTransparency: value === 'true' })
                            }}
                            value={siteSettings.reduceTransparency ? 'true' : 'false'}
                        />
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    <WallpaperSelect
                        title="Desktop background"
                        onValueChange={handleWallpaperChange}
                        value={siteSettings.wallpaper}
                    />
                </div>
            </div>
        </>
    )
}
