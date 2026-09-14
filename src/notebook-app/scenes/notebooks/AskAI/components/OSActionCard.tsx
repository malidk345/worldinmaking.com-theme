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
    switch (type) {
        case 'create_notebook':
            return { label: 'YENİ NOTEBOOK', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' }
        case 'insert_notebook_block':
            return { label: 'NOTEBOOKA EKLE', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' }
        case 'rewrite_notebook_document':
            return { label: 'BELGEYİ YENİLE', className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' }
        case 'replace_notebook_selection':
            return { label: 'SEÇİMİ DEĞİŞTİR', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' }
        case 'manage_windows':
            return { label: 'MASAÜSTÜ DÜZENİ', className: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' }
        case 'add_notebook_footnote':
            return { label: 'DİPNOT EKLE', className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' }
        case 'publish_to_forum':
        case 'create_forum_topic':
            return { label: 'FORUM TASLAĞI', className: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' }
        default:
            return { label: 'ÇALIŞMA ALANI EYLEMİ', className: 'bg-stone-500/15 text-stone-600 dark:text-stone-400 border-stone-500/30' }
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
            isStreaming ? 'border-primary/30 ring-1 ring-sky-500/20' : 'border-primary/20 hover:border-primary/40'
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
                        title="Notebook ile yan yana aç"
                    >
                        <IconColumns className="size-3.5" />
                        <span className="hidden sm:inline">Split</span>
                    </button>
                    {action.executed ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                            <IconCheck className="size-3.5" />
                            Uygulandı ✓
                        </span>
                    ) : isStreaming ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 select-none cursor-wait">
                            <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
                            Hazırlanıyor…
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
                            Dokümana Uygula
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
                    <div className="rounded-lg border border-primary/15 bg-stone-950 p-2 font-mono text-[11px] leading-relaxed text-stone-200 overflow-x-auto">
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-stone-800 text-[10px] text-stone-400">
                            <span className="flex items-center gap-1">
                                <IconDocument className="size-3 text-stone-400" />
                                Önizleme ({content!.split('\n').length} satır)
                            </span>
                            {content!.length > 180 && (
                                <button
                                    type="button"
                                    onClick={() => setExpanded(!expanded)}
                                    className="text-sky-400 hover:underline cursor-pointer"
                                >
                                    {expanded ? 'Daralt' : 'Genişlet'}
                                </button>
                            )}
                        </div>
                        <pre className="whitespace-pre-wrap break-words m-0">
                            {expanded || content!.length <= 180 ? content : `${content!.slice(0, 180)}…`}
                        </pre>
                        {isStreaming && (
                            <div className="mt-1.5 pt-1 border-t border-stone-800/60 flex items-center gap-1.5 text-[10px] text-amber-400/90 font-mono">
                                <span className="inline-block size-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>İçerik yazılıyor…</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
