"use client"

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

const replaceMentions = (text: string) => {
    // 1. Match legacy @username/id or @max
    let processed = text.toString().replace(/@([a-zA-Z0-9_-]+\/[0-9]+|max)/g, (match, username) => {
        if (username === 'max') {
            return `[${match}](/community/profiles/max)`
        }
        return `[${match}](/community/profiles/${username.split('/')[1]})`
    })

    // 2. Match generic @username (ignoring those already processed into links)
    processed = processed.replace(/(?<!\]\()@([a-zA-Z0-9_-]+)(?!\/)/g, (match, username) => {
        if (username.toLowerCase() === 'max') return match
        return `[${match}](/profile/${username})`
    })

    return processed;
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
            className={`markdown prose dark:prose-invert max-w-full text-black dark:text-white [&_p]:text-black dark:[&_p]:text-white [&_a]:font-semibold break-words [overflow-wrap:anywhere] text-[13px] leading-[1.4] tracking-tight [&_ul]:my-1 [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:pl-5 [&_li]:my-0.5 [&_pre]:my-2 [&_blockquote]:my-2 [&_blockquote]:pl-3 [&_blockquote]:border-l-2 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs ${className}`}
            components={{
                p: ({ children }) => <p className="text-black dark:text-white !m-0 pb-1.5 last:pb-0 text-[13px] leading-[1.4] tracking-tight">{children}</p>,
                pre: ({ children }) => (
                    <pre className="whitespace-pre-wrap text-[11px] leading-normal my-2 p-2 bg-black/5 dark:bg-white/5 rounded border border-black/5 dark:border-white/5">
                        {children}
                    </pre>
                ),
                code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { className?: string; children?: React.ReactNode }) {
                    return (
                        <code className={`${className} break-all inline-block text-[11.5px] bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded font-mono`} {...props}>
                            {children}
                        </code>
                    )
                },
                a: ({ href, children }) => (
                    <a
                        href={href || ''}
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                    >
                        {children}
                    </a>
                ),
                img: (props) => {
                    const altText = props.alt || '';
                    if (altText.startsWith('illustration:')) {
                        const query = altText.replace('illustration:', '').trim();
                        const imageUrl = props.src || `https://loremflickr.com/800/400/${encodeURIComponent(query.replace(/\s+/g, ','))}`;
                        return (
                            <span className="block my-3 overflow-hidden rounded-md border border-black/5 dark:border-white/5 relative group max-w-full">
                                <img
                                    src={imageUrl}
                                    alt={altText}
                                    className="w-full max-w-full object-cover aspect-video hover:scale-105 transition-transform duration-700 ease-out"
                                    loading="lazy"
                                />
                            </span>
                        );
                    }
                    // eslint-disable-next-line @next/next/no-img-element
                    return <img {...props} alt={altText} className="rounded-md max-w-full h-auto my-3" />;
                },
            }}
        >
            {content}
        </ReactMarkdown>
    )
}
