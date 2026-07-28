import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tabs } from 'radix-ui'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { useLocation } from 'hooks/useLocation'
import { useWindow } from '../../context/Window'

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
    tabsClassName = '',
    centerTabs = false,
    tabTriggerClassName,
    tabContentClassName,
    tabContentDataScheme = 'primary',
    scrollable = true,
    scrollAreaClasses = '',
}: OSTabsProps): JSX.Element {
    const { state } = useLocation()
    const initialOrderedTabs = (state as any)?.orderedTabs
    const [controlledValue, setControlledValue] = useState(defaultValue || tabs[0]?.value)

    const [orderedTabs, setOrderedTabs] = useState<TabItem[][]>(
        orientation === 'horizontal' ? (initialOrderedTabs?.length > 0 ? initialOrderedTabs : [tabs]) : [tabs]
    )
    const ref = useRef<HTMLDivElement>(null)
    const { animating } = useWindow()

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
            })

            document.body.removeChild(tempContainer)

            const rows: TabItem[][] = [[]]
            let currentRowWidth = 0

            tabs.forEach((tab, index) => {
                const tabWidth = tabWidths[index]

                if (currentRowWidth + tabWidth > containerWidth && rows[0].length > 0) {
                    rows.push([tab])
                    currentRowWidth = tabWidth
                } else {
                    rows[rows.length - 1].push(tab)
                    currentRowWidth += tabWidth
                }
            })

            const activeRowIndex = rows.findIndex((row) => row.some((t) => t.value === currentActiveValue))

            if (activeRowIndex > 0) {
                const activeRow = rows.splice(activeRowIndex, 1)[0]
                rows.unshift(activeRow)
            }

            setOrderedTabs(rows)
        },
        [tabs, value, controlledValue, orientation]
    )

    useEffect(() => {
        if (!animating) {
            calculateTabRows()
        }
    }, [animating, calculateTabRows])

    useEffect(() => {
        const handleResize = () => {
            calculateTabRows()
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [calculateTabRows])

    const handleTabChange = (newValue: string) => {
        setControlledValue(newValue)

        const activeRowIndex = orderedTabs.findIndex((row) => row.some((t) => t.value === newValue))

        if (activeRowIndex > 0) {
            const newOrderedTabs = [...orderedTabs]
            const activeRow = newOrderedTabs.splice(activeRowIndex, 1)[0]
            newOrderedTabs.unshift(activeRow)
            setOrderedTabs(newOrderedTabs)

            if (onValueChange) {
                const formattedRows = newOrderedTabs.map((row) =>
                    row.map((tab) => ({
                        value: tab.value,
                        label: tab.label,
                        triggerDataScheme: tab.triggerDataScheme,
                    }))
                )
                onValueChange(newValue, formattedRows)
            }
        } else if (onValueChange) {
            const formattedRows = orderedTabs.map((row) =>
                row.map((tab) => ({
                    value: tab.value,
                    label: tab.label,
                    triggerDataScheme: tab.triggerDataScheme,
                }))
            )
            onValueChange(newValue, formattedRows)
        }
    }

    const currentTab = useMemo(() => {
        const activeVal = value !== undefined ? value : controlledValue
        return tabs.find((t) => t.value === activeVal)
    }, [tabs, value, controlledValue])

    const activeValue = value !== undefined ? value : controlledValue

    return (
        <div ref={ref} className={`flex flex-col h-full ${className}`}>
            <Tabs.Root
                value={activeValue}
                onValueChange={handleTabChange}
                orientation={orientation}
                className={`flex ${orientation === 'vertical' ? 'flex-row' : 'flex-col'} flex-grow min-h-0`}
            >
                <div
                    className={`flex flex-col border-b border-border dark:border-border-dark ${
                        padding ? 'px-4' : ''
                    } ${tabContainerClassName || ''}`}
                >
                    {orderedTabs.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex items-center justify-between">
                            <Tabs.List
                                className={`flex ${
                                    orientation === 'vertical' ? 'flex-col' : 'flex-row'
                                } ${centerTabs ? 'justify-center' : ''} ${tabsClassName}`}
                            >
                                {row.map((tab) => (
                                    <Tabs.Trigger
                                        key={tab.value}
                                        value={tab.value}
                                        className={`px-4 py-2 font-medium text-sm border-b-2 border-transparent data-[state=active]:border-red dark:data-[state=active]:border-red data-[state=active]:font-bold ${tabTriggerClassName || ''}`}
                                    >
                                        {tab.label}
                                    </Tabs.Trigger>
                                ))}
                            </Tabs.List>
                            {rowIndex === 0 && extraTabRowContent}
                        </div>
                    ))}
                </div>

                <div className={`flex-grow min-h-0 ${contentPadding ? 'p-4' : ''} ${tabContentClassName || ''}`}>
                    {currentTab && (
                        <Tabs.Content key={currentTab.value} value={currentTab.value} className="h-full">
                            {scrollable ? (
                                <ScrollArea className={`h-full ${scrollAreaClasses}`}>{currentTab.content}</ScrollArea>
                            ) : (
                                currentTab.content
                            )}
                        </Tabs.Content>
                    )}
                </div>
            </Tabs.Root>
        </div>
    )
}
