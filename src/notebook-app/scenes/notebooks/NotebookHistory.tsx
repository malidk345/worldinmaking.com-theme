import React, { useCallback, useEffect, useState } from 'react'
import { IconClockRewind } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { Popover } from 'components/RadixUI/Popover'
import {
    getNotebookHistoryNewestFirst,
    restoreNotebookVersion,
    type NotebookVersion,
} from './notebookStorage'
import { useNotebookConfirm } from './NotebookConfirmDialog'

interface NotebookHistoryButtonProps {
    notebookId: string
    currentContent: string
    currentTitle?: string
    onSnapshotNow: () => void
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

export function NotebookHistoryButton({
    notebookId,
    currentContent,
    currentTitle = 'Untitled',
    onSnapshotNow,
    onRestored,
}: NotebookHistoryButtonProps): JSX.Element {
    const [open, setOpen] = useState(false)
    const [history, setHistory] = useState<NotebookVersion[]>([])
    const [restoringVersion, setRestoringVersion] = useState<number | null>(null)
    const { confirm, dialog: confirmDialog } = useNotebookConfirm()

    const reload = useCallback(() => {
        setHistory(getNotebookHistoryNewestFirst(notebookId))
    }, [notebookId])

    useEffect(() => {
        if (open) reload()
    }, [open, notebookId, currentContent, currentTitle, reload])

    const handleRestore = async (version: NotebookVersion) => {
        if (!version.content) return
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
                setOpen(false)
            }
        } finally {
            setRestoringVersion(null)
        }
    }

    return (
        <>
            {confirmDialog}
            <Popover
                title="History"
                header
                dataScheme="primary"
                side="top"
                align="end"
                open={open}
                onOpenChange={setOpen}
                trigger={
                    <span>
                        <OSButton size="md" icon={<IconClockRewind />} aria-label="History" />
                    </span>
                }
                contentClassName="w-[234px]"
            >
                <div className="flex flex-col gap-2 px-1 pb-1">
                    <OSButton
                        size="sm"
                        width="full"
                        hover="background"
                        onClick={() => {
                            onSnapshotNow()
                            window.setTimeout(reload, 50)
                        }}
                    >
                        Save snapshot now
                    </OSButton>
                    {history.length === 0 ? (
                        <p className="text-[13px] text-secondary m-0 py-2">No snapshots yet.</p>
                    ) : (
                        <ul className="list-none m-0 p-0 flex flex-col max-h-64 overflow-y-auto">
                            {history.map((version) => {
                                const hasBody = Boolean(version.content)
                                return (
                                    <li
                                        key={`${version.version}-${version.timestamp}`}
                                        className="flex items-center gap-2 py-1.5 border-t border-primary first:border-t-0"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="m-0 text-[13px] text-primary truncate">
                                                {version.label || version.title || `v${version.version}`}
                                            </p>
                                            <p className="m-0 text-[11px] text-muted">
                                                {timeAgo(version.timestamp)}
                                                {hasBody ? '' : ' · body discarded'}
                                            </p>
                                        </div>
                                        <OSButton
                                            size="xs"
                                            hover="background"
                                            disabled={!hasBody || restoringVersion === version.version}
                                            onClick={() => handleRestore(version)}
                                        >
                                            Restore
                                        </OSButton>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </Popover>
        </>
    )
}
