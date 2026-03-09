"use client"

import React from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../context/App'

interface ToolkitProps {
    children: React.ReactNode
    windowKey?: string
    position?: 'header' | 'footer'
    portal?: boolean
    className?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Toolkit({ children, windowKey, position = 'footer', portal = true, className = '' }: ToolkitProps): any {
    const { focusedWindow } = useApp()
    const targetKey = windowKey || focusedWindow?.key

    const [mounted, setMounted] = React.useState(false)
    const [targetElement, setTargetElement] = React.useState<Element | null>(null)

    React.useEffect(() => {
        setMounted(true)
        if (portal && targetKey) {
            const el = document.getElementById(`window-inner-${position}-${targetKey}`)
            setTargetElement(el)
        }
    }, [targetKey, position, portal])

    const content = (
        <div
            data-scheme="tertiary"
            className={`mx-1 ${position === 'header' ? 'mt-1' : 'my-1'} rounded-md border border-primary bg-primary px-1.5 ${position === 'header' ? 'py-1' : 'py-0.5'} flex items-center justify-between min-h-[36px] select-none overflow-x-auto custom-scrollbar scrollbar-hide ${className}`}
        >
            <div className="flex flex-wrap items-center w-full gap-0.5">
                {children}
            </div>
        </div>
    )

    if (!portal) return content
    if (!mounted || !targetElement) return null

    return createPortal(content, targetElement)
}

interface ToolkitSectionProps {
    children: React.ReactNode
    className?: string
    showSeparator?: boolean
}

export function ToolkitSection({ children, className = '', showSeparator = false }: ToolkitSectionProps) {
    return (
        <div className={`flex items-center gap-1.5 ${showSeparator ? 'border-l border-black/[0.05] pl-1.5' : ''} ${className}`}>
            {children}
        </div>
    )
}

export default Toolkit
