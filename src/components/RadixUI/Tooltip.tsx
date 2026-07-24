import * as React from 'react'
import { Tooltip as RadixTooltip } from 'radix-ui'
import { cn } from '../../utils'

export const TooltipProvider = RadixTooltip.Provider

export interface TooltipProps {
    trigger: React.ReactNode
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    delay?: number
    side?: 'top' | 'right' | 'bottom' | 'left'
    sideOffset?: number
    className?: string
    /** Applied to Radix tooltip content (not the trigger) */
    contentClassName?: string
}

const Tooltip = ({
    trigger,
    children,
    open,
    onOpenChange,
    delay = 500,
    side = 'top',
    sideOffset = 0,
    className = '',
    contentClassName = '',
}: TooltipProps) => {
    const isSingleElement = React.isValidElement(trigger)

    return (
        <RadixTooltip.Root open={open} onOpenChange={onOpenChange} delayDuration={delay}>
            <RadixTooltip.Trigger asChild={isSingleElement}>
                {isSingleElement ? (
                    trigger
                ) : (
                    <span className={cn('inline-flex items-center', className)}>{trigger}</span>
                )}
            </RadixTooltip.Trigger>
            <RadixTooltip.Portal>
                <RadixTooltip.Content
                    data-scheme="secondary"
                    className={cn(
                        'select-none rounded bg-primary border border-primary text-primary text-sm px-3 py-2.5 text-[15px] leading-none shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] min-w-0 min-h-0 max-w-full max-h-full transition-all will-change-[transform,opacity] data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade z-[51]',
                        contentClassName
                    )}
                    sideOffset={sideOffset}
                    side={side}
                >
                    {children}
                    <RadixTooltip.Arrow className="fill-primary border-primary" />
                </RadixTooltip.Content>
            </RadixTooltip.Portal>
        </RadixTooltip.Root>
    )
}

export default Tooltip
