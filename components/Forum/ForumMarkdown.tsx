"use client"

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

const replaceMentions = (text: string) => {
    return text.toString().replace(/@([a-zA-Z0-9_-]+\/[0-9]+|max)/g, (match, username) => {
        if (username === 'max') {
            return `[${match}](/community/profiles/max)`
        }
        return `[${match}](/community/profiles/${username.split('/')[1]})`
    })
}

export default function ForumMarkdown({
    children,
    className = '',
    allowedElements,
    transformImageUri,
}: {
    children: string
    className?: string
    allowedElements?: string[]
    transformImageUri?: (href: string) => string
}) {
    const content = replaceMentions(children || '')

    return (
        <ReactMarkdown
            allowedElements={allowedElements}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            urlTransform={transformImageUri}
            className={`markdown prose dark:prose-invert prose-sm max-w-full text-primary [&_p]:text-primary [&_a]:font-semibold break-words [overflow-wrap:anywhere] ${className}`}
            components={{
                p: ({ children }) => <p className="text-primary !m-0 pb-3 last:pb-0">{children}</p>,
                pre: ({ children }) => (
                    <pre className="whitespace-pre-wrap">
                        {children}
                    </pre>
                ),
                code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { className?: string; children?: React.ReactNode }) {
                    return (
                        <code className={`${className} break-all inline-block`} {...props}>
                            {children}
                        </code>
                    )
                },
                a: ({ href, children }) => (
                    <a
                        href={href || ''}
                        className="font-semibold"
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                    >
                        {children}
                    </a>
                ),
                img: (props) => (
                    <img {...props} className="rounded-md max-w-full h-auto my-4" />
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    )
}
