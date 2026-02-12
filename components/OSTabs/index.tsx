"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Tabs from '../RadixUI/Tabs'
import ScrollArea from '../RadixUI/ScrollArea'
import { usePathname } from 'next/navigation'

interface TabItem {
    value: string
    label: React.ReactNode
    content: React.ReactNode
    triggerDataScheme?: string
}

interface TabTriggerData {
    value: string
    label: React.ReactNode
    triggerDataScheme?: string
}

interface OSTabsProps {
    tabs: TabItem[]
    defaultValue?: string
    value?: string
    orientation?: 'horizontal' | 'vertical'
    border?: boolean
    padding?: boolean
    contentPadding?: boolean
    fullScreen?: boolean
    className?: string
    triggerDataScheme?: string
    extraTabRowContent?: React.ReactNode
    onValueChange?: (value: string, tabs: TabTriggerData[][]) => void
    tabContainerClassName?: string
    centerTabs?: boolean
    tabTriggerClassName?: string
    tabContentClassName?: string
    tabContentDataScheme?: string
    scrollable?: boolean
    scrollAreaClasses?: string
}

export default function OSTabs({
    tabs,
    defaultValue,
    value,
    orientation = 'horizontal',
    border = true,
    padding = false,
    contentPadding = true,
    className,
    triggerDataScheme = 'secondary',
    extraTabRowContent,
    onValueChange,
    tabContainerClassName,
    centerTabs = false,
    tabTriggerClassName,
    tabContentClassName,
    tabContentDataScheme = 'primary',
    scrollable = true,
    scrollAreaClasses = '',
}: OSTabsProps): JSX.Element {
    const pathname = usePathname()
    const [controlledValue, setControlledValue] = useState(defaultValue || tabs[0]?.value)

    const [orderedTabs, setOrderedTabs] = useState<TabItem[][]>(
        [tabs]
    )
    const ref = useRef<HTMLDivElement>(null)

    const calculateTabRows = useCallback(
        (activeTabValue?: string) => {
            if (orientation === 'vertical') {
                setOrderedTabs([tabs])
                return
            }

            if (!ref.current) return

            const containerWidth = ref.current.getBoundingClientRect().width - 48
            const currentActiveValue = activeTabValue || value || controlledValue

            const existingTab = ref.current.querySelector('[role="tab"]') as HTMLElement
            if (!existingTab) return

            const tempContainer = document.createElement('div')
            tempContainer.style.position = 'absolute'
            tempContainer.style.visibility = 'hidden'
            tempContainer.style.top = '-9999px'
            tempContainer.style.left = '-9999px'
            document.body.appendChild(tempContainer)

            const tabWidths: number[] = []
            tabs.forEach((tab) => {
                const clonedTab = existingTab.cloneNode(true) as HTMLElement
                if (typeof tab.label === 'string') {
                    clonedTab.textContent = tab.label
                } else {
                    clonedTab.textContent = 'Tab'
                }
                tempContainer.appendChild(clonedTab)
                tabWidths.push(clonedTab.getBoundingClientRect().width + 4)
                tempContainer.removeChild(clonedTab)
            })

            document.body.removeChild(tempContainer)

            const rows: TabItem[][] = []
            let currentRow: TabItem[] = []
            let currentRowWidth = 0

            tabs.forEach((tab, index) => {
                const tabWidth = tabWidths[index]

                if (currentRowWidth + tabWidth > containerWidth && currentRow.length > 0) {
                    rows.push([...currentRow])
                    currentRow = [tab]
                    currentRowWidth = tabWidth
                } else {
                    currentRow.push(tab)
                    currentRowWidth += tabWidth
                }
            })

            if (currentRow.length > 0) {
                rows.push(currentRow)
            }

            if (rows.length > 1) {
                const activeTabRowIndex = rows.findIndex((row) => row.some((tab) => tab.value === currentActiveValue))

                if (activeTabRowIndex !== -1 && activeTabRowIndex !== rows.length - 1) {
                    const activeRow = rows.splice(activeTabRowIndex, 1)[0]
                    rows.push(activeRow)
                }
            }

            setOrderedTabs(rows)
            return rows
        },
        [tabs, value, controlledValue, orientation]
    )

    useEffect(() => {
        if (orientation === 'vertical' || !ref.current) return

        const timer = setTimeout(() => {
            calculateTabRows()
        }, 300)

        const resizeObserver = new ResizeObserver(() => calculateTabRows())
        resizeObserver.observe(ref.current)
        return () => {
            clearTimeout(timer)
            resizeObserver.disconnect()
        }
    }, [calculateTabRows, orientation])

    const TabContentContainer = useMemo(() => (scrollable ? ScrollArea : 'div'), [scrollable])

    return (
        <Tabs.Root
            ref={ref}
            onValueChange={(val) => {
                setControlledValue(val)
                if (orientation === 'horizontal' && !extraTabRowContent) {
                    const rows = calculateTabRows(val)
                    const orderedData = rows?.map((row) =>
                        row.map(
                            (tab): TabTriggerData => ({
                                value: tab.value,
                                label: tab.label,
                                triggerDataScheme: tab.triggerDataScheme,
                            })
                        )
                    )
                    onValueChange?.(val, orderedData || [])
                } else {
                    const verticalTabsData: TabTriggerData[][] = [
                        tabs.map(
                            (tab): TabTriggerData => ({
                                value: tab.value,
                                label: tab.label,
                                triggerDataScheme: tab.triggerDataScheme,
                            })
                        ),
                    ]
                    onValueChange?.(val, verticalTabsData)
                }
            }}
            defaultValue={defaultValue || tabs[0]?.value}
            value={value || controlledValue}
            orientation={orientation}
            className={`relative flex ${orientation === 'horizontal' ? 'flex-col' : 'flex-row'} ${padding ? 'pt-1 px-2 pb-2' : ''} min-h-0 bg-primary ${className}`}
        >
            <div className={`flex-shrink-0 ${tabContainerClassName}`}>
                <Tabs.List
                    className={`flex ${orientation === 'horizontal' ? 'flex-col min-w-0' : 'flex-col h-full'}`}
                >
                    {orderedTabs.map((row, rowIndex) => (
                        <div
                            key={rowIndex}
                            className={`flex ${orientation === 'horizontal'
                                ? `items-center ${!centerTabs ? 'ml-4' : ''}`
                                : 'flex-col gap-px h-full'
                                } ${centerTabs ? 'justify-center ml-0' : ''}`}
                        >
                            {row.map((tab) => (
                                <Tabs.Trigger
                                    key={tab.value}
                                    value={tab.value}
                                    data-scheme={tab.triggerDataScheme || triggerDataScheme}
                                    className={`${tabTriggerClassName} data-[state=active]:bg-primary px-3 py-1.5 border border-transparent relative -bottom-px z-10 text-[13px] font-bold select-none text-primary data-[state=active]:border-primary border-b-0 rounded-t-sm transition-all hover:bg-accent/50 max-w-[200px] truncate`}
                                >
                                    {tab.label}
                                </Tabs.Trigger>
                            ))}
                            {rowIndex === orderedTabs.length - 1 && extraTabRowContent}
                        </div>
                    ))}
                </Tabs.List>
            </div>
            {tabs.map((tab) => (
                <Tabs.Content key={tab.value} value={tab.value} className="flex-1 h-full min-h-0">
                    <div
                        className={`@container h-full flex flex-col ${border ? 'border border-primary rounded-sm' : ''}`}
                    >
                        <TabContentContainer
                            className="flex-1 min-h-0"
                            viewportClasses={scrollAreaClasses}
                            dataScheme={tabContentDataScheme}
                        >
                            <div
                                className={`@container ${contentPadding ? 'p-4 md:p-6' : ''} ${tabContentClassName}`}
                            >
                                {tab.content}
                            </div>
                        </TabContentContainer>
                    </div>
                </Tabs.Content>
            ))}
        </Tabs.Root>
    )
}
