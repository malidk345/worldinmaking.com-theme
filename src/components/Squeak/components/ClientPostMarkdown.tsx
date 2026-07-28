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
            className="prose dark:prose-invert max-w-full text-primary leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            components={{
                pre: ({ children }) => {
                    return (
                        <Highlight
                            {...defaultProps}
                            code={(children && (children[0] as any)?.props?.children?.[0]) || ''}
                            language={'js' as Language}
                        >
                            {({ className, style, tokens, getLineProps, getTokenProps }) => (
                                <pre className={`${className} whitespace-pre-wrap p-4 rounded-md bg-accent/40 overflow-x-auto`} style={style}>
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
                    return <code {...props} className="break-all inline-block bg-accent/30 px-1.5 py-0.5 rounded text-sm font-mono" />
                },
                a: ({ node, ...props }) => {
                    return <a rel="nofollow" target="_blank" className="font-semibold text-primary underline underline-offset-2 hover:opacity-80" {...props} />
                },
                img: ZoomImage,
            }}
        >
            {cleanedContent}
        </ReactMarkdown>
    )
}

export default ClientPostMarkdown
