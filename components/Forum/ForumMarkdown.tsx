"use client"

import React, { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import hljs from 'highlight.js'

// ---------------------------------------------------------------------------
// Sanitization schema — allow custom elements & data attrs
// ---------------------------------------------------------------------------
const schema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames || []), 'context-box'],
    attributes: {
        ...defaultSchema.attributes,
        'context-box': ['className'],
        span: [...(defaultSchema.attributes?.span || []), 'className'],
        div: [...(defaultSchema.attributes?.div || []), 'className'],
        code: [...(defaultSchema.attributes?.code || []), 'className'],
    }
}

// ---------------------------------------------------------------------------
// Callout block parser — detects GitHub-flavored alert syntax
// > [!NOTE], > [!WARNING], > [!TIP], > [!IMPORTANT], > [!CAUTION]
// ---------------------------------------------------------------------------
type CalloutType = 'NOTE' | 'WARNING' | 'TIP' | 'IMPORTANT' | 'CAUTION'

const CALLOUT_REGEX = /^\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]$/i

const CALLOUT_CONFIG: Record<CalloutType, { icon: string; label: string; className: string; iconColor: string }> = {
    NOTE: {
        icon: 'ℹ',
        label: 'Note',
        className: 'border-black/10 bg-black/3 dark:border-white/10 dark:bg-white/6',
        iconColor: 'text-primary/70',
    },
    TIP: {
        icon: '✦',
        label: 'Tip',
        className: 'border-emerald-500/30 bg-emerald-500/6 dark:bg-emerald-500/8',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    IMPORTANT: {
        icon: '◆',
        label: 'Important',
        className: 'border-purple-500/30 bg-purple-500/6 dark:bg-purple-500/8',
        iconColor: 'text-purple-600 dark:text-purple-400',
    },
    WARNING: {
        icon: '⚠',
        label: 'Warning',
        className: 'border-amber-500/30 bg-amber-500/6 dark:bg-amber-500/8',
        iconColor: 'text-amber-600 dark:text-amber-400',
    },
    CAUTION: {
        icon: '⛔',
        label: 'Caution',
        className: 'border-red-500/30 bg-red-500/6 dark:bg-red-500/8',
        iconColor: 'text-red-600 dark:text-red-400',
    },
}

// ---------------------------------------------------------------------------
// @mention replacement
// ---------------------------------------------------------------------------
const replaceMentions = (text: string): string => {
    let processed = text.toString().replace(/@([a-zA-Z0-9_-]+\/[0-9]+|max)/g, (match, username) => {
        if (username === 'max') return `[${match}](/community/profiles/max)`
        return `[${match}](/community/profiles/${username.split('/')[1]})`
    })
    processed = processed.replace(/(?<!\]\()@([a-zA-Z0-9_-]+)(?!\/)/g, (match, username) => {
        if (username.toLowerCase() === 'max') return match
        return `[${match}](/profile/${username})`
    })
    return processed
}

// ---------------------------------------------------------------------------
// Syntax highlight helper using highlight.js
// ---------------------------------------------------------------------------
function highlightCode(code: string, lang?: string): { html: string; detectedLang: string } {
    try {
        if (lang && hljs.getLanguage(lang)) {
            const result = hljs.highlight(code, { language: lang, ignoreIllegals: true })
            return { html: result.value, detectedLang: lang }
        }
        const result = hljs.highlightAuto(code)
        return { html: result.value, detectedLang: result.language || 'text' }
    } catch {
        return { html: code.replace(/</g, '&lt;').replace(/>/g, '&gt;'), detectedLang: lang || 'text' }
    }
}

// ---------------------------------------------------------------------------
// Code block with syntax highlight + copy button
// ---------------------------------------------------------------------------
function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
    const [copied, setCopied] = useState(false)
    const rawCode = String(children ?? '').replace(/\n$/, '')
    const lang = (className?.match(/language-(\S+)/) ?? [])[1]
    const { html, detectedLang } = highlightCode(rawCode, lang)

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(rawCode).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
        })
    }, [rawCode])

    return (
        <div className="my-3 rounded-[12px] overflow-hidden border border-black/10 dark:border-white/8 bg-[#0d0d0d] shadow-sm">
            {/* header bar */}
            <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-white/8 bg-white/3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40 select-none">
                    {detectedLang}
                </span>
                <button
                    onClick={handleCopy}
                    className="font-mono text-[10px] text-white/40 hover:text-white/80 transition-colors cursor-pointer flex items-center gap-1"
                    aria-label="copy code"
                >
                    {copied ? (
                        <><span className="text-emerald-400">✓</span><span className="text-emerald-400">copied</span></>
                    ) : (
                        <><span>⎘</span><span>copy</span></>
                    )}
                </button>
            </div>
            {/* code body */}
            <pre className="overflow-x-auto m-0 p-3.5">
                <code
                    className="hljs font-mono text-[12px] leading-[1.65] text-[#e5e7eb] block whitespace-pre"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </pre>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Callout block renderer
// ---------------------------------------------------------------------------
function CalloutBlock({ type, children }: { type: CalloutType; children: React.ReactNode }) {
    const cfg = CALLOUT_CONFIG[type]
    return (
        <div className={`my-3 rounded-[10px] border px-3.5 py-2.5 ${cfg.className}`}>
            <div className={`flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider mb-1.5 ${cfg.iconColor}`}>
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
            </div>
            <div className="text-[13px] leading-[1.5] text-primary/90 [&>p]:m-0 [&>p]:pb-1 [&>p:last-child]:pb-0">
                {children}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main ForumMarkdown component
// ---------------------------------------------------------------------------
export default function ForumMarkdown({
    children,
    className = '',
    allowedElements,
    transformImageUri,
    compact = false,
}: {
    children: string
    className?: string
    allowedElements?: string[]
    transformImageUri?: (href: string) => string
    compact?: boolean
}) {
    const content = replaceMentions(children || '')

    return (
        <ReactMarkdown
            allowedElements={allowedElements ? [...allowedElements, 'context-box'] : undefined}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
            urlTransform={transformImageUri}
            className={`forum-markdown ${compact ? 'forum-markdown--compact' : ''} ${className}`}
            components={{
                // ---- Headings ------------------------------------------------
                h1: ({ children }) => (
                    <h1 className="text-[15px] font-black tracking-tight text-primary mt-3 mb-1.5 leading-snug">
                        {children}
                    </h1>
                ),
                h2: ({ children }) => (
                    <h2 className="text-[14px] font-bold tracking-tight text-primary mt-3 mb-1 leading-snug border-b border-black/8 dark:border-white/8 pb-1">
                        {children}
                    </h2>
                ),
                h3: ({ children }) => (
                    <h3 className="text-[13px] font-bold text-primary mt-2.5 mb-0.5 leading-snug">
                        {children}
                    </h3>
                ),
                h4: ({ children }) => (
                    <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-primary/60 mt-2 mb-0.5">
                        {children}
                    </h4>
                ),

                // ---- Paragraph -----------------------------------------------
                p: ({ children }) => (
                    <p className="text-[13.5px] leading-[1.55] tracking-tight text-primary m-0 pb-2 last:pb-0">
                        {children}
                    </p>
                ),

                // ---- Blockquote — callout detection ---------------------------
                blockquote: ({ children }) => {
                    // Check if first child is a callout marker paragraph
                    const childArr = React.Children.toArray(children)
                    const firstEl = childArr[0]

                    if (React.isValidElement(firstEl)) {
                        const firstElAny = firstEl as React.ReactElement<{ children?: React.ReactNode }>
                        const innerChildren = React.Children.toArray(firstElAny.props.children)
                        const textNode = innerChildren.find(c => typeof c === 'string') as string | undefined

                        if (textNode && CALLOUT_REGEX.test(textNode.trim())) {
                            const calloutType = textNode.trim().match(CALLOUT_REGEX)?.[1]?.toUpperCase() as CalloutType
                            if (calloutType && CALLOUT_CONFIG[calloutType]) {
                                const restChildren = childArr.slice(1)
                                return <CalloutBlock type={calloutType}>{restChildren}</CalloutBlock>
                            }
                        }
                    }

                    // Regular blockquote
                    return (
                        <blockquote className="my-2.5 pl-3 border-l-[2.5px] border-primary/20 bg-black/3 dark:bg-white/4 rounded-r-[8px] py-2 pr-3 italic text-primary/75 text-[13px] leading-[1.5]">
                            {children}
                        </blockquote>
                    )
                },

                // ---- Code blocks ---------------------------------------------
                pre: ({ children }) => {
                    // Extract code element inside pre
                    const codeEl = React.Children.toArray(children).find(
                        c => React.isValidElement(c) && (c as React.ReactElement).type === 'code'
                    ) as React.ReactElement<{ className?: string; children?: React.ReactNode }> | undefined

                    if (codeEl) {
                        return (
                            <CodeBlock className={codeEl.props.className}>
                                {codeEl.props.children}
                            </CodeBlock>
                        )
                    }

                    return (
                        <pre className="my-3 p-3 rounded-[10px] bg-black/6 dark:bg-white/5 border border-black/8 dark:border-white/8 font-mono text-[12px] overflow-x-auto whitespace-pre-wrap leading-[1.6]">
                            {children}
                        </pre>
                    )
                },

                // ---- Inline code ---------------------------------------------
                code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { className?: string; children?: React.ReactNode }) {
                    const isBlock = className?.startsWith('language-')
                    if (isBlock) {
                        return (
                            <CodeBlock className={className}>
                                {children}
                            </CodeBlock>
                        )
                    }
                    return (
                        <code
                            className="font-mono text-[11.5px] bg-black/7 dark:bg-white/10 border border-black/8 dark:border-white/10 px-1.5 py-0.5 rounded-[5px] text-primary break-all"
                            {...props}
                        >
                            {children}
                        </code>
                    )
                },

                // ---- Links ---------------------------------------------------
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

                // ---- Strong / Em ---------------------------------------------
                strong: ({ children }) => (
                    <strong className="font-bold text-primary">{children}</strong>
                ),
                em: ({ children }) => (
                    <em className="italic opacity-85">{children}</em>
                ),

                // ---- Lists ---------------------------------------------------
                ul: ({ children }) => (
                    <ul className="my-1.5 pl-5 list-disc space-y-0.5 text-[13.5px] leading-[1.5]">
                        {children}
                    </ul>
                ),
                ol: ({ children }) => (
                    <ol className="my-1.5 pl-5 list-decimal space-y-0.5 text-[13.5px] leading-[1.5]">
                        {children}
                    </ol>
                ),
                li: ({ children }) => (
                    <li className="text-primary leading-[1.55] pl-0.5 marker:text-primary/40">
                        {children}
                    </li>
                ),

                // ---- Tables --------------------------------------------------
                table: ({ children }) => (
                    <div className="my-3 overflow-x-auto rounded-[10px] border border-black/8 dark:border-white/8 shadow-xs">
                        <table className="w-full text-[12.5px] border-collapse">
                            {children}
                        </table>
                    </div>
                ),
                thead: ({ children }) => (
                    <thead className="bg-black/4 dark:bg-white/5 border-b border-black/8 dark:border-white/8">
                        {children}
                    </thead>
                ),
                th: ({ children }) => (
                    <th className="px-3 py-2 text-left font-bold text-[11px] uppercase tracking-wider text-primary/60 whitespace-nowrap">
                        {children}
                    </th>
                ),
                td: ({ children }) => (
                    <td className="px-3 py-2 border-b border-black/4 dark:border-white/4 text-primary/85 align-top leading-[1.45] last-of-type:border-b-0">
                        {children}
                    </td>
                ),
                tr: ({ children }) => (
                    <tr className="even:bg-black/[0.015] dark:even:bg-white/[0.015] hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                        {children}
                    </tr>
                ),

                // ---- Horizontal rule -----------------------------------------
                hr: () => (
                    <hr className="my-4 border-none h-px bg-black/10 dark:bg-white/10 max-w-[30%] mx-auto" />
                ),

                // ---- Images --------------------------------------------------
                img: (props) => {
                    const altText = props.alt || ''
                    const src = (typeof transformImageUri === 'function' && props.src)
                        ? transformImageUri(props.src)
                        : props.src

                    return (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={src || ''}
                            alt={altText}
                            className="rounded-[10px] max-w-full h-auto my-3 border border-black/6 dark:border-white/6 shadow-sm"
                            loading="lazy"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                    )
                },

                // ---- Custom elements -----------------------------------------
                // @ts-expect-error - context-box is a custom element
                'context-box': ({ children }: { children?: React.ReactNode }) => (
                    <div className="my-2 p-3 bg-black/4 dark:bg-white/5 rounded-[10px] text-[11.5px] border border-black/6 dark:border-white/8">
                        <div className="font-mono font-bold text-[10px] uppercase tracking-wider mb-1.5 opacity-50">
                            Source Context
                        </div>
                        <div className="text-primary/80 leading-relaxed">{children}</div>
                    </div>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    )
}
