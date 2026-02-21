import React, { useLayoutEffect, useRef } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { X as IconX } from 'lucide-react'

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
    open?: boolean
    onOpenChange?: (open: boolean) => void
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
            open,
            onOpenChange,
        },
        ref
    ) => {
        const scrollRef = useRef<HTMLDivElement>(null)

        useLayoutEffect(() => {
            if (scrollRef.current) {
                const element = scrollRef.current
                element.style.display = 'none'
                element.offsetHeight // Trigger reflow
                element.style.display = ''
            }
        }, [children])

        return (
            <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
                <PopoverPrimitive.Trigger asChild className={className}>
                    {trigger}
                </PopoverPrimitive.Trigger>
                <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Content
                        ref={ref}
                        data-scheme={dataScheme}
                        className={`rounded p-1 bg-primary text-primary shadow-[0_10px_38px_-10px_hsla(206,22%,7%,.35),0_10px_20px_-15px_hsla(206,22%,7%,.2)] will-change-[transform,opacity] focus:shadow-[0_10px_38px_-10px_hsla(206,22%,7%,.35),0_10px_20px_-15px_hsla(206,22%,7%,.2),0_0_0_2px_rgba(255,255,255,0.2)] data-[state=open]:data-[side=bottom]:animate-slideUpAndFade data-[state=open]:data-[side=left]:animate-slideRightAndFade data-[state=open]:data-[side=right]:animate-slideLeftAndFade data-[state=open]:data-[side=top]:animate-slideDownAndFade max-w-[100vw] ${contentClassName}`}
                        sideOffset={sideOffset}
                        align="center"
                        side={side}
                    >
                        <div className="flex flex-col gap-2.5 h-full">
                            {header && (
                                <div className="flex justify-between items-center">
                                    {title && <strong>{title}</strong>}
                                    <div className="flex items-center">
                                        <PopoverPrimitive.Close aria-label="Close" asChild>
                                            <button>
                                                <IconX className="size-4" />
                                            </button>
                                        </PopoverPrimitive.Close>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef}>
                                <ScrollArea className="h-full">{children}</ScrollArea>
                            </div>
                        </div>
                        <PopoverPrimitive.Arrow className="fill-white" />
                    </PopoverPrimitive.Content>
                </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
        )
    }
)

Popover.displayName = 'Popover'
