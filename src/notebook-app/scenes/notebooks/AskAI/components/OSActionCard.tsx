import React from 'react'
import type { OSActionCard as OSActionCardType } from '../types'

interface OSActionCardProps {
    action: OSActionCardType
    onExecute: () => void
    isStreaming?: boolean
}

/**
 * Clean, minimal action card for notebook additions.
 * Uses unified font, clean hierarchy, and only essential controls.
 */
export function OSActionCard({ action, onExecute, isStreaming }: OSActionCardProps): JSX.Element {
    const content = action.payload?.content?.trim()
    let buttonLabel = 'Apply'
    if (action.type === 'annotate_notebook') buttonLabel = 'Annotate'
    else if (action.type === 'add_notebook_footnote') buttonLabel = 'Add footnote'
    else if (action.type === 'insert_notebook_block') buttonLabel = 'Add to notebook'
    else if (action.type === 'rewrite_notebook_document') buttonLabel = 'Rewrite notebook'
    else if (action.type === 'replace_notebook_selection') buttonLabel = 'Replace selection'


    return (
        <div className="mt-2 rounded border border-primary/50 bg-accent/60 px-3 py-2.5 text-[12.5px] text-primary font-sans">
            <div className="flex items-center justify-between gap-2">
                <p className="m-0 font-medium text-[13px] text-primary truncate">
                    {action.title || buttonLabel}
                </p>

                <div className="shrink-0">
                    {action.executed ? (
                        <span className="text-[11.5px] text-muted font-medium">
                            Added ✓
                        </span>
                    ) : isStreaming ? (
                        <span className="text-[11.5px] text-muted animate-pulse">
                            Preparing…
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onExecute()
                            }}
                            className="rounded px-2.5 py-1 text-[12px] font-medium text-white bg-[#1E3A8A] hover:bg-[#1e40af] transition-colors cursor-pointer"
                        >
                            {buttonLabel}
                        </button>
                    )}
                </div>
            </div>

            {action.description && (
                <p className="mt-1 mb-0 text-[12px] text-secondary leading-relaxed">
                    {action.description}
                </p>
            )}

            {content && (
                <div className="mt-2 rounded border border-primary/20 bg-primary/60 p-2 text-[12px] leading-relaxed text-secondary whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {content}
                </div>
            )}
        </div>
    )
}
