import React from 'react'
import { IconLightBulb } from '@posthog/icons'
import { CallToAction } from 'components/CallToAction'
import usePostHog from 'hooks/usePostHog'
import { useApp } from 'context/App'

interface AskMaxProps {
    title?: string
    border?: boolean
    className?: string
    quickQuestions?: string[]
    linkOnly?: boolean
    children?: React.ReactNode
}

export default function AskMax({
    title = 'Questions?',
    border = false,
    className = '',
    quickQuestions,
    linkOnly = false,
    children,
}: AskMaxProps) {
    const posthog = usePostHog()

    const totalDocsCount = 1000 // Fallback or could be passed as prop

    const borderClasses = border ? 'py-6 mt-4 border-y border-primary' : 'mb-8'

    if (linkOnly) {
        return (
            <button className={className}>
                {children}
            </button>
        )
    }

    return (
        <div className="mt-4 p-2">
            <div className="@container">
                <div
                    className={`flex flex-col @2xl:flex-row items-center justify-center @3xl:justify-start gap-4 @2xl:!gap-8 relative py-2 w-full @2xl:w-auto ${borderClasses} ${className}`}
                >
                    <div className="flex-1 @2xl:flex-[0_0_auto] flex flex-col @lg:flex-row items-center justify-center gap-4">
                        <div>
                            <IconLightBulb className="size-10 inline-block bg-accent rounded p-2 text-muted" />
                        </div>

                        <div className="flex flex-col text-center @lg:text-left">
                            <h3 className="m-0 !text-2xl @lg:!text-xl leading-tight">
                                {title} <span className="text-red dark:text-yellow">Ask PostHog AI.</span>
                            </h3>
                            <p className="text-[15px] mb-0 opacity-75 text-balance">
                                It's easier than reading through{' '}
                                <strong>{totalDocsCount} pages of documentation.</strong>
                            </p>
                        </div>
                    </div>
                    <div>
                        <CallToAction
                            type="secondary"
                            size="md"
                            className="group"
                            onClick={handleChatOpen}
                        >
                            Ask Max
                        </CallToAction>
                    </div>
                </div>
            </div>
        </div>
    )
}
