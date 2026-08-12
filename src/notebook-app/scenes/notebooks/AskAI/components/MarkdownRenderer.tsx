import dynamic from 'next/dynamic'
import Markdown from 'components/Markdown'

const Mermaid = dynamic(() => import('components/Mermaid'), { ssr: false })

interface MarkdownRendererProps {
    text: string
    isStreaming?: boolean
}

/**
 * Renders AI reply text as rich Markdown with support for:
 * - Mermaid diagrams (lazy-loaded)
 * - Syntax-highlighted code blocks
 * - Styled tables
 * - Blockquotes
 * - Inline code
 * - Streaming cursor blink
 */
export function MarkdownRenderer({ text, isStreaming }: MarkdownRendererProps): JSX.Element {
    return (
        <div className="text-primary text-xs leading-relaxed mb-0 [&>p]:mb-1.5 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>code]:bg-black/10 [&>code]:dark:bg-white/10 [&>code]:px-1 [&>code]:rounded">
            <Markdown
                components={{
                    code: ({ className, children, inline, ...props }: any) => {
                        const codeStr = String(children || '').replace(/\n$/, '')
                        const match = /language-(\w+)/.exec(className || '')
                        const isMermaid =
                            (match && match[1] === 'mermaid') ||
                            codeStr.startsWith('graph ') ||
                            codeStr.startsWith('flowchart') ||
                            codeStr.startsWith('sequenceDiagram') ||
                            codeStr.startsWith('gantt') ||
                            codeStr.startsWith('pie') ||
                            codeStr.startsWith('classDiagram')

                        if (isMermaid) {
                            return (
                                <div className="my-2 p-2 rounded-xl border border-[var(--color-border-primary)] bg-surface-primary shadow-xs overflow-hidden">
                                    <Mermaid>{codeStr}</Mermaid>
                                </div>
                            )
                        }

                        if (inline) {
                            return (
                                <code
                                    className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono text-primary"
                                    {...props}
                                >
                                    {children}
                                </code>
                            )
                        }

                        return (
                            <div className="my-2 rounded-xl border border-[var(--color-border-primary)] bg-surface-primary p-2.5 overflow-x-auto font-mono text-[11px] leading-normal text-primary shadow-2xs">
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            </div>
                        )
                    },
                    table: ({ children }: any) => (
                        <div className="my-2.5 w-full overflow-x-auto rounded-xl border border-[var(--color-border-primary)] shadow-2xs">
                            <table className="w-full text-xs border-collapse min-w-full divide-y divide-[var(--color-border-primary)]">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }: any) => (
                        <thead className="bg-surface-primary border-b border-[var(--color-border-primary)] text-primary font-semibold">
                            {children}
                        </thead>
                    ),
                    tbody: ({ children }: any) => (
                        <tbody className="divide-y divide-[var(--color-border-primary)]/50 bg-primary/20">
                            {children}
                        </tbody>
                    ),
                    tr: ({ children }: any) => (
                        <tr className="hover:bg-surface-primary/60 transition-colors">{children}</tr>
                    ),
                    th: ({ children }: any) => (
                        <th className="px-3 py-2 text-left font-semibold text-xs text-primary border-r border-[var(--color-border-primary)]/40 last:border-r-0">
                            {children}
                        </th>
                    ),
                    td: ({ children }: any) => (
                        <td className="px-3 py-2 text-left text-xs text-secondary border-r border-[var(--color-border-primary)]/30 last:border-r-0">
                            {children}
                        </td>
                    ),
                    blockquote: ({ children }: any) => (
                        <blockquote className="border-l-2 border-primary pl-3 my-2 text-secondary italic text-xs">
                            {children}
                        </blockquote>
                    ),
                }}
            >
                {text || ''}
            </Markdown>
            {isStreaming && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary align-middle opacity-70 shrink-0" />
            )}
        </div>
    )
}
