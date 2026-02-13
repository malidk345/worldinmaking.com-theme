"use client"

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
            rehypePlugins={[rehypeSanitize]}
            urlTransform={transformImageUri}
            className={`markdown prose dark:prose-invert prose-sm max-w-full text-primary [&_a]:font-semibold break-words [overflow-wrap:anywhere] ${className}`}
            components={{
                pre: ({ children }) => (
                    <pre className="whitespace-pre-wrap bg-accent/20 rounded-md p-4 text-[13px] font-mono overflow-x-auto border border-primary my-4">
                        {children}
                    </pre>
                ),
                code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { className?: string; children?: React.ReactNode }) {
                    return (
                        <code className={`${className} bg-accent/30 px-1.5 py-0.5 rounded font-mono text-[13px] text-primary`} {...props}>
                            {children}
                        </code>
                    )
                },
                a: ({ href, children }) => (
                    <a
                        href={href || ''}
                        className="text-primary font-bold hover:underline"
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                    >
                        {children}
                    </a>
                ),
                img: (props) => (
                    <img {...props} className="rounded-md max-w-full h-auto my-4 border border-primary" />
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    )
}
