import React from 'react'

export interface LemonMarkdownProps {
    children?: React.ReactNode
    className?: string
    [key: string]: any
}

export function LemonMarkdown({ children, className, ...props }: LemonMarkdownProps): JSX.Element {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    )
}

export default LemonMarkdown
