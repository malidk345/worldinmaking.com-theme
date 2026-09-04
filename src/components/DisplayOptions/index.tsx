import React, { useState, useEffect } from 'react'
import { ToggleGroup, ToggleOption } from 'components/RadixUI/ToggleGroup'
import { Popover } from 'components/RadixUI/Popover'
import ScrollArea from 'components/RadixUI/ScrollArea'
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
    const [isOpen, setIsOpen] = useState(false)
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

    const currentOption = themeOptions.find((option) => option.value === value)
    const currentThumb = currentOption
        ? isDark
            ? currentOption.background?.thumb?.dark
            : currentOption.background?.thumb?.light
        : null

    const handleSelect = (selectedValue: string) => {
        onValueChange(selectedValue)
    }

    const trigger = (
        <button
            type="button"
            className="w-full bg-input-bg border border-input rounded px-2 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary flex gap-2 items-center justify-between hover:bg-accent"
        >
            <div className="flex flex-col items-center gap-2">
                <span className="text-primary">{currentOption?.label || 'Select wallpaper'}</span>
                {currentThumb && (
                    <img
                        src={currentThumb}
                        alt={currentOption?.label || ''}
                        className="object-contain border border-primary rounded"
                    />
                )}
            </div>
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    )

    return (
        <>
            <div>
                <label className="pt-1.5 text-sm">{title}</label>
                <p className="text-xs text-secondary text-balance leading-normal mt-2">
                    Cycle between wallpapers with{' '}
                    <span className="inline-block">
                        <KeyboardShortcut text="\" size="xs" />
                    </span>
                </p>
            </div>
            <Popover
                trigger={trigger}
                dataScheme="secondary"
                contentClassName="@container bg-primary w-screen md:w-[800px] max-w-full max-h-[var(--radix-popover-content-available-height)]"
                sideOffset={8}
                open={isOpen}
                onOpenChange={setIsOpen}
                scrollable={false}
            >
                <ScrollArea
                    className="min-h-0 max-h-[calc(var(--radix-popover-content-available-height)-1rem)]"
                    viewportClasses="overscroll-contain"
                >
                    <div className="@container">
                        <div className="grid md:@xl:grid-cols-2 md:@2xl:grid-cols-3 md:@xl:gap-2 p-2">
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
                                        onClick={() => handleSelect(option.value)}
                                        className={`w-full p-2 text-left bg-primary hover:bg-accent border border-input hover:border-primary flex flex-col items-center gap-3 rounded ${
                                            isSelected ? 'bg-accent' : ''
                                        }`}
                                    >
                                        <img
                                            src={optionThumb}
                                            alt={option.label}
                                            className="w-full h-auto object-cover rounded"
                                        />
                                        <span className={`text-primary ${isSelected ? 'font-bold' : 'font-medium'}`}>
                                            {option.label}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </ScrollArea>
            </Popover>
        </>
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
            <div data-scheme="secondary" className="w-full h-full min-h-full flex-1 flex flex-col bg-primary text-primary p-4 border-t border-primary">
                <div className="grid grid-cols-2 gap-2">
                    <ToggleGroup
                        title="Color mode"
                        options={colorModeOptions}
                        onValueChange={handleColorModeChange}
                        value={siteSettings.colorMode}
                    />
                </div>
                <div className="grid grid-cols-2 gap-2 my-2">
                    <WallpaperSelect
                        title="Desktop background"
                        onValueChange={handleWallpaperChange}
                        value={siteSettings.wallpaper}
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
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
            </div>
        </>
    )
}
