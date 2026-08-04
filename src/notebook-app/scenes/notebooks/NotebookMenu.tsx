import { LemonButton, LemonMenu } from '~nb-lib/lemon-ui/index'
import { IconEllipsis, IconCopy, IconClock, IconShare, IconTrash } from '@posthog/icons'
import { exportNotebookAsMarkdown } from './notebookStorage'

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
    const handleDownload = () => {
        const markdown = exportNotebookAsMarkdown(notebookId)
        if (!markdown) return
        const blob = new Blob([markdown], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `notebook-${notebookId}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleCopyMarkdown = async () => {
        const markdown = exportNotebookAsMarkdown(notebookId)
        if (markdown) {
            await navigator.clipboard.writeText(markdown)
        }
    }

    const handleDownloadJSON = () => {
        const markdown = exportNotebookAsMarkdown(notebookId)
        if (!markdown) return
        const data = {
            id: notebookId,
            content: markdown,
            exportedAt: new Date().toISOString(),
            app: 'PostHog Notebooks',
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `notebook-${notebookId}.json`
        a.click()
        URL.revokeObjectURL(url)
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
                    onClick: handleDownload,
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
                    label: 'Copy markdown',
                    icon: <IconCopy />,
                    onClick: handleCopyMarkdown,
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
                    label: 'Publish & Cover Meta Settings',
                    icon: <IconShare />,
                    onClick: onOpenPublishModal,
                },
                {
                    items: [
                        {
                            label: 'Delete',
                            icon: <IconTrash />,
                            status: 'danger',
                            onClick: onDelete,
                        },
                    ],
                },
            ]}
        >
            <LemonButton size="small" icon={<IconEllipsis />} />
        </LemonMenu>
    )
}
