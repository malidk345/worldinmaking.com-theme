"use client"

import React from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../context/App'

interface ToolkitProps {
    children: React.ReactNode
    windowKey?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Toolkit({ children, windowKey }: ToolkitProps): any {
    const { focusedWindow } = useApp()
    const targetKey = windowKey || focusedWindow?.key

    const [mounted, setMounted] = React.useState(false)
    const [targetElement, setTargetElement] = React.useState<Element | null>(null)

    React.useEffect(() => {
        setMounted(true)
        if (targetKey) {
            const el = document.getElementById(`window-footer-${targetKey}`)
            setTargetElement(el)
        }
    }, [targetKey])

    if (!mounted || !targetElement) return null

    return createPortal(
        <div className="flex items-center justify-between w-full h-full border-t border-black/[0.08] bg-[#f8f9fb] px-1.5 py-1 min-h-[40px] select-none">
            {children}
        </div>,
        targetElement
    )
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
