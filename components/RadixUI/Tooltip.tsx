"use client"

import * as React from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'

export interface TooltipProps {
    trigger: React.ReactNode
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    delay?: number
    side?: 'top' | 'right' | 'bottom' | 'left'
    sideOffset?: number
    className?: string
}

const Tooltip = ({
    trigger,
    children,
    open,
    onOpenChange,
    delay,
    side = 'top',
    sideOffset = 0,
    className = '',
}: TooltipProps) => {
    return (
        <RadixTooltip.Root open={open} onOpenChange={onOpenChange} delayDuration={delay}>
            <RadixTooltip.Trigger asChild>
                <span className={className}>{trigger}</span>
            </RadixTooltip.Trigger>
            <RadixTooltip.Portal>
                <RadixTooltip.Content
                    data-scheme="secondary"
                    className="select-none rounded bg-accent border border-primary text-primary text-center text-sm px-3 py-2 text-[13px] font-bold leading-tight shadow-xl z-[99999] transition-all will-change-[transform,opacity]"
                    sideOffset={sideOffset}
                    side={side}
                >
                    {children}
                    <RadixTooltip.Arrow asChild>
                        <div className="w-5 h-2.5 overflow-hidden">
                            <div className="w-3 h-3 border-r border-b border-primary bg-accent rotate-45 rounded-xs relative left-[3px] top-[-7px]" />
                        </div>
                    </RadixTooltip.Arrow>
                </RadixTooltip.Content>
            </RadixTooltip.Portal>
        </RadixTooltip.Root>
    )
}

export default Tooltip
