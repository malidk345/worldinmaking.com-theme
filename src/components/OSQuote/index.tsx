import React from 'react'

interface OSQuoteProps {
    customer?: string
    author?: string
    product?: string
    quote?: number
    children?: React.ReactNode
}

export const OSQuote: React.FC<OSQuoteProps> = ({ children }) => {
    if (!children) {
        return null
    }

    return (
        <div className="max-w-xl bg-light dark:bg-dark border border-primary rounded p-4 mb-4">
            <div className="pt-2 [&_*]:!leading-normal">
                <blockquote className="text-primary border-l-0 pl-0 not-italic m-0">{children}</blockquote>
            </div>
        </div>
    )
}
