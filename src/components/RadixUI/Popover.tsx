import React, { useRef, useEffect } from 'react'
import { Popover as RadixPopover } from 'radix-ui'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { IconX } from '@posthog/icons'

interface PopoverProps {
    trigger: React.ReactNode
    title?: string
    children: React.ReactNode
    dataScheme: string
    header?: boolean
    className?: string
    contentClassName?: string
    sideOffset?: number
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** Wrap children in ScrollArea. Set false when the caller scrolls itself (avoids nested scroll traps). @default true */
    scrollable?: boolean
}

export const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(
    (
        {
            trigger,
            header,
            title,
            children,
            dataScheme,
            className = '',
            contentClassName = '',
            sideOffset = 5,
            side = 'bottom',
            align = 'center',
            open,
            onOpenChange,
            scrollable = true,
        },
        ref
    ) => {
        const scrollRef = useRef<HTMLDivElement>(null)
        const appContainer: HTMLElement | null = null

        useEffect(() => {
            if (scrollRef.current) {
                const element = scrollRef.current
                element.style.display = 'none'
                element.offsetHeight // Trigger reflow
                element.style.display = ''
            }
        }, [children])

        return (
            <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
                <RadixPopover.Trigger asChild className={className}>
                    {trigger}
                </RadixPopover.Trigger>
                <RadixPopover.Portal>
                    <RadixPopover.Content
                        collisionBoundary={appContainer}
                        ref={ref}
                        data-scheme={dataScheme}
                        className={`rounded p-1 bg-primary text-primary shadow-[0_10px_38px_-10px_hsla(206,22%,7%,.35),0_10px_20px_-15px_hsla(206,22%,7%,.2)] will-change-[transform,opacity] focus:shadow-[0_10px_38px_-10px_hsla(206,22%,7%,.35),0_10px_20px_-15px_hsla(206,22%,7%,.2),0_0_0_2px_rgba(255,255,255,0.2)] data-[state=open]:data-[side=bottom]:animate-slideUpAndFade data-[state=open]:data-[side=left]:animate-slideRightAndFade data-[state=open]:data-[side=right]:animate-slideLeftAndFade data-[state=open]:data-[side=top]:animate-slideDownAndFade max-w-[100vw] ${contentClassName}`}
                        sideOffset={sideOffset}
                        align={align}
                        collisionPadding={12}
                        side={side}
                    >
                        <div className="flex flex-col gap-2.5 min-h-0 max-h-[inherit]">
                            {header && (
                                <div className="flex justify-between items-center shrink-0">
                                    {title && <strong>{title}</strong>}
                                    <div className="flex items-center">
                                        <RadixPopover.Close aria-label="Close" asChild>
                                            <button>
                                                <IconX className="size-4" />
                                            </button>
                                        </RadixPopover.Close>
                                    </div>
                                </div>
                            )}
                            {scrollable ? (
                                <div ref={scrollRef} className="min-h-0 flex-1 overflow-hidden">
                                    <ScrollArea className="h-full min-h-0 max-h-full">{children}</ScrollArea>
                                </div>
                            ) : (
                                <div ref={scrollRef} className="min-h-0">
                                    {children}
                                </div>
                            )}
                        </div>
                        <RadixPopover.Arrow className="fill-white" />
                    </RadixPopover.Content>
                </RadixPopover.Portal>
            </RadixPopover.Root>
        )
    }
)

Popover.displayName = 'Popover'
