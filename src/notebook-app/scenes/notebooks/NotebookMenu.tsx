import { useState } from 'react'
import { LemonButton, LemonMenu } from '~nb-lib/lemon-ui/index'
import { IconEllipsis, IconCopy, IconClock, IconShare, IconTrash, IconCheck } from '@posthog/icons'
import {
    exportNotebookAsMarkdown,
    exportNotebookAsJSON,
    exportNotebookAsPaperMarkdown,
    downloadTextFile,
    getNotebook,
} from './notebookStorage'
import { notebookFilename } from './notebookOutline'

interface NotebookMenuProps {
    notebookId: string
    onDuplicate?: () => void
    onDelete?: () => void
    onShowHistory?: () => void
    onShare?: () => void
    onOpenPublishModal?: () => void
}

export function NotebookMenu({
    notebookId,
    onDuplicate,
    onDelete,
    onShowHistory,
    onShare,
    onOpenPublishModal,
}: NotebookMenuProps) {
    const [copied, setCopied] = useState<'md' | 'paper' | null>(null)

    const title = () => getNotebook(notebookId)?.title || 'notebook'

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

    const handlePrintPDF = () => {
        window.print()
    }

    return (
        <LemonMenu
            items={[
                {
                    label: 'Duplicate',
                    icon: <IconCopy />,
                    onClick: onDuplicate,
                },
                {
                    label: 'Download Markdown (.md)',
                    onClick: handleDownloadMd,
                },
                {
                    label: 'Download for paper (.md)',
                    onClick: handleDownloadPaper,
                },
                {
                    label: 'Download JSON',
                    onClick: handleDownloadJSON,
                },
                {
                    label: 'Export as PDF / Print',
                    onClick: handlePrintPDF,
                },
                {
                    label: copied === 'md' ? 'Copied markdown' : 'Copy markdown',
                    icon: copied === 'md' ? <IconCheck /> : <IconCopy />,
                    onClick: handleCopyMarkdown,
                },
                {
                    label: copied === 'paper' ? 'Copied for paper' : 'Copy for paper',
                    icon: copied === 'paper' ? <IconCheck /> : <IconCopy />,
                    onClick: handleCopyForPaper,
                },
                {
                    label: 'History',
                    icon: <IconClock />,
                    onClick: onShowHistory,
                },
                {
                    label: 'Share',
                    icon: <IconShare />,
                    onClick: onShare,
                },
                {
                    label: 'Publish & cover',
                    icon: <IconShare />,
                    onClick: onOpenPublishModal,
                },
                {
                    separator: true,
                },
                {
                    label: 'Delete',
                    icon: <IconTrash />,
                    status: 'danger',
                    onClick: onDelete,
                },
            ]}
        >
            <LemonButton size="small" icon={<IconEllipsis />} />
        </LemonMenu>
    )
}
