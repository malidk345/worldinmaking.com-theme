import { useState } from 'react'
import { IconEllipsis } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { Popover } from 'components/RadixUI/Popover'
import Tooltip from 'components/RadixUI/Tooltip'
import {
    exportNotebookAsMarkdown,
    exportNotebookAsJSON,
    exportNotebookAsPaperMarkdown,
    downloadTextFile,
    getNotebook,
} from './notebookStorage'
import { notebookFilename } from './outlineModel'
import { exportNotebookAsPdf } from './exportNotebookPdf'

interface NotebookMenuProps {
    notebookId: string
    onDuplicate?: () => void
    onDelete?: () => void
    onShare?: (tab?: 'private' | 'publish') => void
}

function MenuItem({
    label,
    onClick,
    danger,
}: {
    label: string
    onClick?: () => void
    danger?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent ${
                danger ? 'text-red' : 'text-primary'
            }`}
        >
            {label}
        </button>
    )
}

export function NotebookMenu({
    notebookId,
    onDuplicate,
    onDelete,
    onShare,
}: NotebookMenuProps) {
    const [copied, setCopied] = useState<'md' | 'paper' | null>(null)
    const [open, setOpen] = useState(false)

    const title = () => getNotebook(notebookId)?.title || 'notebook'

    const run = (fn?: () => void) => {
        fn?.()
        setOpen(false)
    }

    const handleDownloadMd = () => {
        try {
            const markdown = exportNotebookAsMarkdown(notebookId)
            downloadTextFile(notebookFilename(title(), 'md'), markdown, 'text/markdown;charset=utf-8')
        } catch {
            /* ignore */
        }
    }

    const handleDownloadJSON = () => {
        try {
            const json = exportNotebookAsJSON(notebookId)
            downloadTextFile(notebookFilename(title(), 'json'), json, 'application/json;charset=utf-8')
        } catch {
            /* ignore */
        }
    }

    const handleDownloadPaper = () => {
        try {
            const paper = exportNotebookAsPaperMarkdown(notebookId)
            downloadTextFile(notebookFilename(title(), 'paper.md'), paper, 'text/markdown;charset=utf-8')
        } catch {
            /* ignore */
        }
    }

    const handleCopyMarkdown = async () => {
        try {
            const markdown = exportNotebookAsMarkdown(notebookId)
            await navigator.clipboard.writeText(markdown)
            setCopied('md')
            setTimeout(() => setCopied(null), 1500)
        } catch {
            /* ignore */
        }
    }

    const handleCopyForPaper = async () => {
        try {
            const paper = exportNotebookAsPaperMarkdown(notebookId)
            await navigator.clipboard.writeText(paper)
            setCopied('paper')
            setTimeout(() => setCopied(null), 1500)
        } catch {
            /* ignore */
        }
    }

    return (
        <Popover
            dataScheme="secondary"
            open={open}
            onOpenChange={setOpen}
            side="bottom"
            align="end"
            contentClassName="w-[220px]"
            trigger={
                <span>
                    <Tooltip
                        trigger={<OSButton icon={<IconEllipsis />} size="md" active={open} />}
                        side="right"
                    >
                        Notebook actions
                    </Tooltip>
                </span>
            }
        >
            <div className="py-1">
                <MenuItem label="Duplicate" onClick={() => run(onDuplicate)} />
                <MenuItem label="Download Markdown (.md)" onClick={() => run(handleDownloadMd)} />
                <MenuItem label="Download for paper (.md)" onClick={() => run(handleDownloadPaper)} />
                <MenuItem label="Download JSON" onClick={() => run(handleDownloadJSON)} />
                <MenuItem label="Download PDF" onClick={() => run(() => void exportNotebookAsPdf(notebookId))} />
                <MenuItem label="Print" onClick={() => run(() => window.print())} />
                <MenuItem
                    label={copied === 'md' ? 'Copied markdown' : 'Copy markdown'}
                    onClick={() => void handleCopyMarkdown()}
                />
                <MenuItem
                    label={copied === 'paper' ? 'Copied for paper' : 'Copy for paper'}
                    onClick={() => void handleCopyForPaper()}
                />
                <MenuItem label="Share" onClick={() => run(() => onShare?.('private'))} />
                <MenuItem label="Publish on WIM" onClick={() => run(() => onShare?.('publish'))} />
                <div className="my-1 border-t border-primary" />
                <MenuItem label="Delete" danger onClick={() => run(onDelete)} />
            </div>
        </Popover>
    )
}
