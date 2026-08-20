import React from 'react'
import Highlight, { defaultProps, Language } from 'prism-react-renderer'
import ReactMarkdown, { Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { ZoomImage } from 'components/ZoomImage'
import { TransformImage } from 'react-markdown/lib/ast-to-react'
import remarkGfm from 'remark-gfm'
import { cn } from '../../../utils'
import Link from 'components/Link'
import { decorateForumMentions, forumMentionClassName, mentionProfileHref } from 'lib/forum-mentions'

const forumMarkdownSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        span: [...((defaultSchema.attributes as any)?.span || []), 'className', 'class', 'dataMention', 'data-mention'],
        a: [...((defaultSchema.attributes as any)?.a || []), 'className', 'class'],
    },
}

const cleanMdxContent = (content: string): string => {
    if (!content || typeof content !== 'string') return ''
    let cleaned = content.replace(/^---[\s\S]*?---\s*/, '')
    cleaned = cleaned.replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\s*/gm, '')
    cleaned = cleaned.replace(/^export\s+[\s\S]*?;\s*/gm, '')
    cleaned = cleaned.replace(/<Array\s+[\s\S]*?\/>/gi, '')
    return cleaned.trim()
}

function ForumMentionChip({ username, children }: { username?: string; children?: React.ReactNode }) {
    let text = ''
    if (typeof children === 'string') {
        text = children
    } else if (Array.isArray(children)) {
        text = children.map((c) => (typeof c === 'string' ? c : '')).join('')
    }
    const handle = String(username || text || '')
        .replace(/^@+/, '')
        .replace(/<[^>]+>/g, '')
        .trim()
    const href = mentionProfileHref(handle)
    return (
        <Link href={href} className={forumMentionClassName()} state={{ newWindow: true }}>
            @{handle}
        </Link>
    )
}

export const Markdown = ({
    children,
    transformImageUri,
    allowedElements,
    regularText,
    className,
    components,
}: {
    children: string
    transformImageUri?: TransformImage | undefined
    allowedElements?: string[]
    regularText?: 'false'
    className?: string
    components?: Partial<Components>
}) => {
    return (
        // transformImageUri is safe, rehypeSanitize sanitizes all HTML output
        // nosemgrep: typescript.react.security.react-markdown-insecure-html.react-markdown-insecure-html
        <ReactMarkdown
            allowedElements={allowedElements}
            remarkPlugins={[remarkGfm]}
            transformImageUri={transformImageUri}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, forumMarkdownSchema]]}
            className={cn(
                'markdown prose dark:prose-invert prose-sm max-w-full min-w-0 text-primary text-[15px] leading-[1.5] [&_p]:leading-[1.5] [&_p]:mb-2.5 [&_li]:leading-[1.5] [&_a]:font-semibold break-words [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_img]:max-w-full',
                !regularText,
                className
            )}
            components={{
                pre: ({ children }) => {
                    return (
                        <>
                            <Highlight
                                {...defaultProps}
                                code={(children[0] as any)?.props?.children[0]}
                                language={'js' as Language}
                            >
                                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                                    <pre className={`${className} whitespace-pre-wrap`} style={style}>
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
                        </>
                    )
                },
                code: ({ node, ...props }) => {
                    return <code {...props} className="break-all inline-block" />
                },
                a: ({ node, className, ...props }) => {
                    if (String(className || '').includes('forum-mention')) {
                        return (
                            <ForumMentionChip username={String((props as { 'data-mention'?: string })['data-mention'] || '')}>
                                {props.children}
                            </ForumMentionChip>
                        )
                    }
                    return (
                        <Link
                            rel="nofollow noopener noreferrer"
                            className={className}
                            {...props}
                            state={{ newWindow: true }}
                        />
                    )
                },
                span: ({ node, className, ...props }) => {
                    const mention = (props as { 'data-mention'?: string })['data-mention']
                    if (mention || String(className || '').includes('forum-mention')) {
                        return <ForumMentionChip username={mention}>{props.children}</ForumMentionChip>
                    }
                    return <span className={className} {...props} />
                },
                img: ZoomImage,
                ...components,
            }}
        >
            {decorateForumMentions(cleanMdxContent(children))}
        </ReactMarkdown>
    )
}

export default Markdown
