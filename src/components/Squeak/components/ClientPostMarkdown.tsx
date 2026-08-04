import React from 'react'
import Highlight, { defaultProps, Language } from 'prism-react-renderer'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { ZoomImage } from 'components/ZoomImage'
import { TransformImage } from 'react-markdown/lib/ast-to-react'
import remarkGfm from 'remark-gfm'

export const cleanMdxContent = (content: string): string => {
    if (!content || typeof content !== 'string') return ''
    // 1. Strip YAML frontmatter header (--- title: ... ---)
    let cleaned = content.replace(/^---[\s\S]*?---\s*/, '')
    // 2. Strip MDX imports and exports
    cleaned = cleaned.replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\s*/gm, '')
    cleaned = cleaned.replace(/^export\s+[\s\S]*?;\s*/gm, '')
    // 3. Convert or strip raw MDX self-closing components that break ReactMarkdown
    cleaned = cleaned.replace(/<Array\s+[\s\S]*?\/>/gi, '')
    return cleaned.trim()
}

export const ClientPostMarkdown = ({
    children,
    transformImageUri,
    allowedElements,
}: {
    children: string
    transformImageUri?: TransformImage | undefined
    allowedElements?: string[]
}) => {
    const cleanedContent = cleanMdxContent(children || '')

    return (
        <ReactMarkdown
            allowedElements={allowedElements}
            remarkPlugins={[remarkGfm]}
            transformImageUri={transformImageUri}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            className="forum-markdown text-[13.5px] leading-[1.55] tracking-tight text-primary break-words [overflow-wrap:anywhere]"
            components={{
                h1: ({ children }) => (
                    <h1 className="text-[16px] font-black tracking-tight text-primary mt-4 mb-2 leading-snug">
                        {children}
                    </h1>
                ),
                h2: ({ children }) => (
                    <h2 className="text-[14.5px] font-bold tracking-tight text-primary mt-3 mb-1.5 leading-snug border-b border-black/8 dark:border-white/8 pb-1">
                        {children}
                    </h2>
                ),
                h3: ({ children }) => (
                    <h3 className="text-[13.5px] font-bold text-primary mt-2.5 mb-1 leading-snug">{children}</h3>
                ),
                p: ({ children }) => (
                    <p className="text-[13.5px] font-normal leading-[1.55] tracking-tight text-primary m-0 pb-2.5 last:pb-0">
                        {children}
                    </p>
                ),
                blockquote: ({ children }) => (
                    <blockquote className="my-2.5 pl-3 border-l-[2.5px] border-primary/20 bg-black/3 dark:bg-white/4 rounded-r-[8px] py-2 pr-3 italic text-primary/75 text-[13px] leading-[1.5]">
                        {children}
                    </blockquote>
                ),
                pre: ({ children }) => {
                    return (
                        <Highlight
                            {...defaultProps}
                            code={(children && (children[0] as any)?.props?.children?.[0]) || ''}
                            language={'js' as Language}
                        >
                            {({ className, style, tokens, getLineProps, getTokenProps }) => (
                                <pre
                                    className={`${className} overflow-x-auto m-0 p-3.5 my-3 rounded-[10px] bg-black/6 dark:bg-white/5 border border-black/8 dark:border-white/8 font-mono text-[12px] leading-[1.6]`}
                                    style={style}
                                >
                                    {tokens.map((line, i) => (
                                        <div key={i} {...getLineProps({ line, key: i })}>
                                            {line.map((token, key) => (
                                                <span key={key} {...getTokenProps({ token, key })} />
                                            ))}
                                        </div>
                                    ))}
                                </pre>
                            )}
                        </Highlight>
                    )
                },
                code: ({ node, ...props }) => {
                    return (
                        <code
                            className="font-mono text-[11.5px] bg-black/7 dark:bg-white/10 border border-black/8 dark:border-white/10 px-1.5 py-0.5 rounded-[5px] text-primary break-all inline-block"
                            {...props}
                        />
                    )
                },
                a: ({ href, children }) => (
                    <a
                        href={href || ''}
                        className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary transition-colors"
                        target={href?.startsWith('http') ? '_blank' : undefined}
                        rel={href?.startsWith('http') ? 'nofollow noopener noreferrer' : undefined}
                    >
                        {children}
                    </a>
                ),
                strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                em: ({ children }) => <em className="italic opacity-85">{children}</em>,
                ul: ({ children }) => (
                    <ul className="my-1.5 pl-5 list-disc space-y-0.5 text-[13.5px] leading-[1.5]">{children}</ul>
                ),
                ol: ({ children }) => (
                    <ol className="my-1.5 pl-5 list-decimal space-y-0.5 text-[13.5px] leading-[1.5]">{children}</ol>
                ),
                li: ({ children }) => (
                    <li className="text-primary leading-[1.55] pl-0.5 marker:text-primary/40 font-normal">
                        {children}
                    </li>
                ),
                img: ZoomImage,
            }}
        >
            {cleanedContent}
        </ReactMarkdown>
    )
}

export default ClientPostMarkdown
