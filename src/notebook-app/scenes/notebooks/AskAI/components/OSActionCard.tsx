import React, { useState } from 'react'
import { LemonButton } from '~nb-lib/lemon-ui/index'
import { IconSparkles, IconCheck, IconDocument, IconColumns } from '@posthog/icons'
import type { OSActionCard as OSActionCardType } from '../types'

interface OSActionCardProps {
    action: OSActionCardType
    onExecute: () => void
    isStreaming?: boolean
}

function actionTypeBadge(type: string): { label: string; className: string } {
    const defaultClassName = 'bg-accent text-primary border-primary/20'
    switch (type) {
        case 'create_notebook':
            return { label: 'New notebook', className: defaultClassName }
        case 'insert_notebook_block':
            return { label: 'Add to notebook', className: defaultClassName }
        case 'rewrite_notebook_document':
            return { label: 'Rewrite document', className: defaultClassName }
        case 'replace_notebook_selection':
            return { label: 'Replace selection', className: defaultClassName }
        case 'manage_windows':
            return { label: 'Manage windows', className: defaultClassName }
        case 'add_notebook_footnote':
            return { label: 'Add footnote', className: defaultClassName }
        case 'publish_to_forum':
        case 'create_forum_topic':
            return { label: 'Forum draft', className: defaultClassName }
        default:
            return { label: 'Workspace action', className: defaultClassName }
    }
}

/**
 * Renders an executable OS action card below an AI reply.
 * Provides high-visibility preview of the exact change, target notebook, and one-click execution.
 */
export function OSActionCard({ action, onExecute, isStreaming }: OSActionCardProps): JSX.Element {
    const [expanded, setExpanded] = useState(false)
    const badge = actionTypeBadge(action.type)
    const content = action.payload?.content?.trim()
    const hasContentPreview = Boolean(content && content.length > 0)

    const handleSplitWorkspace = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('wimArrangeWorkspace', {
                    detail: { preset: 'split_dual' },
                })
            )
        }
    }

    return (
        <div className={`mt-2.5 rounded-xl bg-surface-primary border shadow-xs overflow-hidden transition-all duration-200 font-sans text-xs ${
            isStreaming ? 'border-primary/30 ring-1 ring-primary/20' : 'border-primary/20 hover:border-primary/40'
        }`}>
            <div className="p-3 bg-accent/30 border-b border-primary/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${badge.className} ${
                        isStreaming ? 'animate-pulse' : ''
                    }`}>
                        {badge.label}
                    </span>
                    <span className="font-semibold text-xs text-primary truncate">
                        {action.title}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={handleSplitWorkspace}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] text-muted hover:text-primary transition-colors cursor-pointer"
                        title="Open side by side with notebook"
                    >
                        <IconColumns className="size-3.5" />
                        <span className="hidden sm:inline">Split</span>
                    </button>
                    {action.executed ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-primary bg-accent/50 border border-primary/20">
                            <IconCheck className="size-3.5" />
                            Applied ✓
                        </span>
                    ) : isStreaming ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-primary bg-accent/50 border border-primary/20 select-none cursor-wait">
                            <span className="size-1.5 rounded-full bg-primary animate-ping" />
                            Preparing…
                        </div>
                    ) : (
                        <LemonButton
                            size="xsmall"
                            type="primary"
                            icon={<IconSparkles />}
                            onClick={(e) => {
                                e.stopPropagation()
                                onExecute()
                            }}
                        >
                            {action.type === 'rewrite_notebook_document'
                                ? 'Rewrite document'
                                : action.type === 'replace_notebook_selection'
                                ? 'Replace selection'
                                : action.type === 'insert_notebook_block'
                                ? 'Add to document'
                                : 'Apply to document'}
                        </LemonButton>
                    )}
                </div>
            </div>

            {action.description && (
                <div className="px-3 pt-2 text-[11.5px] text-secondary leading-snug">
                    {action.description}
                </div>
            )}

            {hasContentPreview && (
                <div className="p-3 pt-2">
                    <div className="rounded-lg border border-primary/15 bg-accent p-2 font-mono text-[11px] leading-relaxed text-primary overflow-x-auto">
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-primary/20 text-[10px] text-muted">
                            <span className="flex items-center gap-1">
                                <IconDocument className="size-3 text-muted" />
                                Preview ({content!.split('\n').length} lines)
                            </span>
                            {content!.length > 180 && (
                                <button
                                    type="button"
                                    onClick={() => setExpanded(!expanded)}
                                    className="text-primary hover:underline cursor-pointer"
                                >
                                    {expanded ? 'Collapse' : 'Expand'}
                                </button>
                            )}
                        </div>
                        <pre className="whitespace-pre-wrap break-words m-0">
                            {expanded || content!.length <= 180 ? content : `${content!.slice(0, 180)}…`}
                        </pre>
                        {isStreaming && (
                            <div className="mt-1.5 pt-1 border-t border-primary/20 flex items-center gap-1.5 text-[10px] text-muted font-mono">
                                <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" />
                                <span>Writing content…</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
