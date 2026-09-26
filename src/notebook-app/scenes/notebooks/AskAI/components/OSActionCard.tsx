import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import OSButton from 'components/OSButton'
import type { OSActionCard as OSActionCardType } from '../types'
import { actionNeedsNotebookPick } from 'lib/notebook-add-target'
import { NotebookTargetMenu } from 'components/ClaudeWorkspaceChat/components/NotebookTargetMenu'

interface OSActionCardProps {
    action: OSActionCardType
    onExecute: (notebookId?: string) => void
    isStreaming?: boolean
}

function cleanActionText(raw: string): string {
    let t = raw.trim()
    const match = t.match(/^```(?:markdown|md|text|diff)?\s*\n([\s\S]*?)\n```$/i)
    if (match) {
        t = match[1].trim()
    }
    return t
}

/**
 * Minimal WIM AI action card matching Home Apps card (Fieldset) container aesthetics.
 * Displays only the action text with smooth top/bottom fade scrolling and formatted text (no raw markdown),
 * and the action OSButton positioned on the bottom-right border with white top face.
 */
export function OSActionCard({ action, onExecute, isStreaming }: OSActionCardProps): JSX.Element {
    const content = action.payload?.content?.trim()
    const description = action.description?.trim()
    const rawText = content || description || ''
    const text = cleanActionText(rawText)
    const [anchor, setAnchor] = useState<DOMRect | null>(null)
    const asksNotebook = actionNeedsNotebookPick(action.type)

    let buttonLabel = 'Apply'
    if (action.type === 'annotate_notebook') buttonLabel = 'Annotate'
    else if (action.type === 'add_notebook_footnote') buttonLabel = 'Footnote'
    else if (action.type === 'insert_notebook_block') buttonLabel = 'Add'
    else if (action.type === 'rewrite_notebook_document') buttonLabel = 'Rewrite'
    else if (action.type === 'replace_notebook_selection') buttonLabel = 'Replace'
    else if (action.type === 'create_notebook') buttonLabel = 'Create'
    else if (action.type === 'create_forum_topic' || action.type === 'publish_to_forum') buttonLabel = 'Publish'
    else if (action.type === 'open_window') buttonLabel = 'Open'
    else if (action.title) {
        const lower = action.title.toLowerCase()
        if (lower.includes('add') && lower.includes('notebook')) buttonLabel = 'Add'
        else if (lower.includes('rewrite') && lower.includes('notebook')) buttonLabel = 'Rewrite'
        else buttonLabel = action.title
    }

    return (
        <div className="relative mt-2.5 mb-3 pt-2.5 px-3 pb-3.5 border border-primary rounded font-sans">
            {text ? (
                <div className="relative max-h-44 overflow-y-auto scrollbar-hide py-1.5 px-0.5 [mask-image:linear-gradient(to_bottom,transparent_0%,black_14px,black_calc(100%-14px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_14px,black_calc(100%-14px),transparent_100%)]">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({ children }) => (
                                <p className="m-0 mb-1.5 text-xs text-secondary leading-relaxed last:mb-0">
                                    {children}
                                </p>
                            ),
                            h1: ({ children }) => (
                                <h1 className="m-0 mb-1 text-xs font-semibold text-primary">{children}</h1>
                            ),
                            h2: ({ children }) => (
                                <h2 className="m-0 mb-1 text-xs font-semibold text-primary">{children}</h2>
                            ),
                            h3: ({ children }) => (
                                <h3 className="m-0 mb-1 text-xs font-semibold text-primary">{children}</h3>
                            ),
                            ul: ({ children }) => (
                                <ul className="m-0 mb-1.5 pl-4 list-disc text-xs text-secondary space-y-0.5">
                                    {children}
                                </ul>
                            ),
                            ol: ({ children }) => (
                                <ol className="m-0 mb-1.5 pl-4 list-decimal text-xs text-secondary space-y-0.5">
                                    {children}
                                </ol>
                            ),
                            li: ({ children }) => <li className="text-xs leading-relaxed">{children}</li>,
                            code: ({ inline, children }: any) =>
                                inline ? (
                                    <code className="px-1 py-0.5 rounded bg-accent/40 text-[11px] font-mono text-primary">
                                        {children}
                                    </code>
                                ) : (
                                    <pre className="m-0 mb-1.5 p-2 rounded bg-accent/30 text-[11px] font-mono text-primary overflow-x-auto">
                                        <code>{children}</code>
                                    </pre>
                                ),
                            strong: ({ children }) => (
                                <strong className="font-semibold text-primary">{children}</strong>
                            ),
                            blockquote: ({ children }) => (
                                <blockquote className="m-0 mb-1.5 pl-2.5 border-l-2 border-primary/40 text-xs italic text-secondary">
                                    {children}
                                </blockquote>
                            ),
                        }}
                    >
                        {text}
                    </ReactMarkdown>
                </div>
            ) : null}

            <div className="absolute -bottom-3 right-3 flex items-center">
                {action.executed ? (
                    <span className="text-xs bg-primary px-1.5 text-muted font-medium select-none">Added ✓</span>
                ) : isStreaming ? (
                    <span className="text-xs bg-primary px-1.5 text-muted animate-pulse select-none">Preparing…</span>
                ) : (
                    <OSButton
                        type="button"
                        size="sm"
                        variant="white"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (asksNotebook) {
                                setAnchor(e.currentTarget.getBoundingClientRect())
                                return
                            }
                            onExecute()
                        }}
                    >
                        {buttonLabel}
                    </OSButton>
                )}
            </div>
            <NotebookTargetMenu
                anchor={anchor}
                onClose={() => setAnchor(null)}
                onSelect={(notebookId) => onExecute(notebookId)}
            />
        </div>
    )
}
