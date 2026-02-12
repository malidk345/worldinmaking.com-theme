"use client"

import React from 'react'
import OSTabs from '../OSTabs'

interface WindowTabsProps {
    tabs: {
        key: string
        title: React.ReactNode
        content: React.ReactNode
    }[]
    defaultValue?: string
    className?: string
}

/**
 * WindowTabs is a high-level component to add tabbed navigation inside any AppWindow.
 * It uses the underlying OSTabs system which supports automatic row wrapping and active row shuffling.
 */
export default function WindowTabs({ tabs, defaultValue, className }: WindowTabsProps) {
    const formattedTabs = tabs.map(tab => ({
        value: tab.key,
        label: tab.title,
        content: tab.content
    }))

    return (
        <OSTabs
            tabs={formattedTabs}
            defaultValue={defaultValue || tabs[0]?.key}
            className={`h-full w-full ${className}`}
            contentPadding={false}
            tabContainerClassName="bg-accent/20 border-b border-primary"
        />
    )
}
