import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { LemonButton, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconX, IconClock, IconCopy, IconCheck } from '@posthog/icons'
import {
    getNotebookHistoryNewestFirst,
    restoreNotebookVersion,
    type NotebookVersion,
} from './notebookStorage'
import { useNotebookConfirm } from './NotebookConfirmDialog'

interface NotebookHistoryProps {
    notebookId: string
    isOpen: boolean
    onClose: () => void
    /** Live editor content (may be newer than last snapshot). */
    currentContent: string
    currentTitle?: string
    /** Persist live editor + create a labeled snapshot (parent owns storage). */
    onSnapshotNow: () => void
    /** Called after a restore so the editor reloads. */
    onRestored: (payload: { content: string; title: string }) => void
}

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function formatExact(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        })
    } catch {
        return dateStr
    }
}

function previewText(content: string, max = 100): string {
    const oneLine = content.replace(/\s+/g, ' ').trim()
    if (!oneLine) return '(empty)'
    return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine
}

function wordCount(content: string): number {
    const t = content.trim()
    if (!t) return 0
    return t.split(/\s+/).length
}

function deltaLabel(from: string, to: string): string {
    const dw = wordCount(to) - wordCount(from)
    if (dw === 0) return 'same length'
    if (dw > 0) return `+${dw} words`
    return `${dw} words`
}

export function NotebookHistory({
    notebookId,
    isOpen,
    onClose,
    currentContent,
    currentTitle = 'Untitled',
    onSnapshotNow,
    onRestored,
}: NotebookHistoryProps): JSX.Element | null {
    const [history, setHistory] = useState<NotebookVersion[]>([])
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [restoringVersion, setRestoringVersion] = useState<number | null>(null)
    const [snapshotBusy, setSnapshotBusy] = useState(false)
    const [flash, setFlash] = useState<string | null>(null)
    const { confirm, dialog: confirmDialog } = useNotebookConfirm()

    const reload = useCallback(() => {
        setHistory(getNotebookHistoryNewestFirst(notebookId))
    }, [notebookId])

    useEffect(() => {
        if (isOpen) {
            reload()
            setExpandedId(null)
            setRestoringVersion(null)
        }
    }, [notebookId, isOpen, reload])

    const newestSnap = history[0]
    const liveDiffersFromNewest = useMemo(() => {
        if (!newestSnap) return currentContent.trim().length > 0
        return newestSnap.content !== currentContent || (newestSnap.title && newestSnap.title !== currentTitle)
    }, [newestSnap, currentContent, currentTitle])

    const handleSnapshotNow = () => {
        setSnapshotBusy(true)
        try {
            onSnapshotNow()
            // Parent writes storage; reload after a tick so the new entry is visible
            window.setTimeout(() => {
                reload()
                setFlash('Snapshot saved')
                setTimeout(() => setFlash(null), 1500)
                setSnapshotBusy(false)
            }, 50)
        } catch {
            setSnapshotBusy(false)
        }
    }

    const handleRestore = async (version: NotebookVersion) => {
        const ok = await confirm({
            title: `Restore version v${version.version}?`,
            description: 'Your current text will be kept as a new snapshot.',
            confirmLabel: 'Restore',
        })
        if (!ok) return
        setRestoringVersion(version.version)
        try {
            const restored = restoreNotebookVersion(notebookId, version.version)
            if (restored) {
                onRestored({ content: restored.content, title: restored.title })
                reload()
                setFlash(`Restored v${version.version}`)
                setTimeout(() => setFlash(null), 2000)
            }
        } finally {
            setRestoringVersion(null)
        }
    }

    const handleCopy = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content)
            setFlash('Copied')
            setTimeout(() => setFlash(null), 1200)
        } catch {
            /* ignore */
        }
    }

    if (!isOpen) return null

    return (
        <>
            {confirmDialog}
            {/* Backdrop (mobile-friendly close) */}
            <button
                type="button"
                className="fixed inset-0 z-[49] bg-black/20 border-0 cursor-default"
                aria-label="Close history"
                onClick={onClose}
            />

            <aside
                className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[22rem] sm:max-w-[24rem] flex-col border-l border-border bg-[var(--color-bg-surface-primary,#fff)] shadow-xl"
                role="dialog"
                aria-label="Version history"
            >
                <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 shrink-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-semibold text-primary text-sm">
                            <IconClock className="w-4 h-4 text-secondary shrink-0" />
                            <span>History</span>
                            {history.length > 0 && (
                                <span className="text-muted font-normal text-xs tabular-nums">{history.length}</span>
                            )}
                        </div>
                        {flash && (
                            <p className="text-[11px] text-green m-0 mt-0.5 flex items-center gap-1">
                                <IconCheck className="w-3 h-3" />
                                {flash}
                            </p>
                        )}
                    </div>
                    <LemonButton icon={<IconX />} size="small" type="tertiary" onClick={onClose} />
                </header>

                <div className="px-3 py-2 border-b border-border shrink-0 space-y-2">
                    <LemonButton
                        size="small"
                        type="secondary"
                        fullWidth
                        loading={snapshotBusy}
                        onClick={handleSnapshotNow}
                        disabled={!liveDiffersFromNewest && history.length > 0}
                    >
                        Save snapshot now
                    </LemonButton>
                    <p className="text-[11px] text-muted m-0 leading-snug">
                        Auto-snapshots every ~20s while you edit. Publish and restore also create labeled entries.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3">
                    {/* Live editor state */}
                    <div className="rounded-lg border border-border p-3 bg-[var(--color-bg-surface-secondary,#f5f5f5)]">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <strong className="text-sm text-primary">Live</strong>
                                <LemonTag type="success" size="small">
                                    Now
                                </LemonTag>
                                {liveDiffersFromNewest && (
                                    <LemonTag type="warning" size="small">
                                        Unsaved snap
                                    </LemonTag>
                                )}
                            </div>
                            <span className="text-[11px] text-muted">{wordCount(currentContent)} words</span>
                        </div>
                        <p className="text-xs text-secondary m-0 truncate" title={currentTitle}>
                            {currentTitle}
                        </p>
                        <p className="text-[11px] text-muted m-0 mt-1 leading-snug line-clamp-2">
                            {previewText(currentContent)}
                        </p>
                    </div>

                    {history.length === 0 ? (
                        <div className="text-center text-muted text-sm py-8 px-2">
                            No snapshots yet. Keep writing — history builds as you go — or tap{' '}
                            <strong>Save snapshot now</strong>.
                        </div>
                    ) : (
                        history.map((version, index) => {
                            const key = `${version.version}-${version.timestamp}`
                            const expanded = expandedId === key
                            const prev = history[index + 1]
                            const delta = prev ? deltaLabel(prev.content, version.content) : 'first snapshot'
                            const isNewest = index === 0

                            return (
                                <div
                                    key={key}
                                    className="rounded-lg border border-border p-3 bg-[var(--color-bg-surface-primary,#fff)]"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                            <strong className="text-sm text-primary">v{version.version}</strong>
                                            {isNewest && (
                                                <LemonTag type="primary" size="small">
                                                    Latest snap
                                                </LemonTag>
                                            )}
                                            {version.label && (
                                                <LemonTag type="muted" size="small">
                                                    {version.label}
                                                </LemonTag>
                                            )}
                                        </div>
                                        <span
                                            className="text-[11px] text-muted shrink-0"
                                            title={formatExact(version.timestamp)}
                                        >
                                            {timeAgo(version.timestamp)}
                                        </span>
                                    </div>

                                    {version.title && (
                                        <p className="text-xs font-medium text-primary m-0 mb-0.5 truncate">
                                            {version.title}
                                        </p>
                                    )}

                                    <p className="text-[11px] text-muted m-0 mb-2">
                                        {wordCount(version.content)} words · {delta}
                                    </p>

                                    <button
                                        type="button"
                                        className="w-full text-left text-xs text-secondary leading-snug m-0 p-0 border-0 bg-transparent cursor-pointer hover:text-primary"
                                        onClick={() => setExpandedId(expanded ? null : key)}
                                    >
                                        {expanded ? version.content.slice(0, 800) : previewText(version.content)}
                                        {expanded && version.content.length > 800 ? '…' : ''}
                                        <span className="block text-[10px] text-muted mt-1">
                                            {expanded ? 'Collapse' : 'Preview'}
                                        </span>
                                    </button>

                                    <div className="flex gap-1.5 mt-2">
                                        <LemonButton
                                            size="xsmall"
                                            type="secondary"
                                            icon={<IconCopy className="w-3.5 h-3.5" />}
                                            onClick={() => handleCopy(version.content)}
                                        >
                                            Copy
                                        </LemonButton>
                                        <LemonButton
                                            size="xsmall"
                                            type="primary"
                                            loading={restoringVersion === version.version}
                                            onClick={() => handleRestore(version)}
                                        >
                                            Restore
                                        </LemonButton>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </aside>
        </>
    )
}
