import React from 'react'
import { IconMinus, IconSquare, IconX } from '@posthog/icons'

export default function DemoWindow({
    title,
    children,
    aside,
}: {
    title: string
    children: React.ReactNode
    aside?: React.ReactNode
}) {
    return (
        <div className="rounded-lg border border-primary overflow-hidden bg-primary/30 shadow-sm">
            <div className="flex items-center gap-2 px-2 py-1 border-b border-primary bg-accent/30">
                <p className="text-[13px] font-semibold m-0 truncate flex-1">{title}</p>
                <div className="flex items-center gap-0.5 opacity-40 pointer-events-none">
                    <span className="size-5 flex items-center justify-center">
                        <IconMinus className="size-3.5" />
                    </span>
                    <span className="size-5 flex items-center justify-center">
                        <IconSquare className="size-3" />
                    </span>
                    <span className="size-5 flex items-center justify-center">
                        <IconX className="size-3.5" />
                    </span>
                </div>
            </div>
            <div
                className={
                    aside
                        ? 'flex flex-col @md:flex-row min-h-[280px] @md:min-h-[320px]'
                        : 'min-h-[280px] @md:min-h-[320px]'
                }
            >
                <div className="flex-1 min-w-0">{children}</div>
                {aside ? (
                    <div className="w-full @md:w-[16.5rem] shrink-0 border-t @md:border-t-0 @md:border-l border-primary">
                        {aside}
                    </div>
                ) : null}
            </div>
        </div>
    )
}
