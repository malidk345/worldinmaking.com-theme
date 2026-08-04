import { LemonModal, LemonButton, LemonDivider, LemonBanner } from '~nb-lib/lemon-ui/index'
import { IconCopy } from '@posthog/icons'
import { getNotebook, exportNotebookAsJSON, exportNotebookAsMarkdown } from './notebookStorage'

interface NotebookShareModalProps {
    isOpen: boolean
    onClose: () => void
    notebookId: string
    notebookTitle: string
}

export function NotebookShareModal({
    isOpen,
    onClose,
    notebookId,
    notebookTitle,
}: NotebookShareModalProps) {
    const handleCopyInternalLink = async () => {
        await navigator.clipboard.writeText(window.location.href)
    }

    const handleCopyTemplateLink = async () => {
        const notebook = getNotebook(notebookId)
        if (!notebook) return
        const encodedContent = encodeURIComponent(JSON.stringify(notebook.content))
        const templateLink = `${window.location.origin}${window.location.pathname}#/canvas?template=${encodedContent}`
        await navigator.clipboard.writeText(templateLink)
    }

    const handleDownloadMd = () => {
        const markdown = exportNotebookAsMarkdown(notebookId)
        if (!markdown) return
        const blob = new Blob([markdown], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${notebookTitle.replace(/\s+/g, '_')}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleExportJSON = () => {
        const json = exportNotebookAsJSON(notebookId)
        if (!json) return
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${notebookTitle.replace(/\s+/g, '_')}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <LemonModal
            isOpen={isOpen}
            onClose={onClose}
            title="Share notebook"
            footer={
                <LemonButton type="secondary" onClick={onClose}>
                    Done
                </LemonButton>
            }
        >
            <div className="flex flex-col gap-4">
                <LemonBanner type="info">This notebook is stored locally</LemonBanner>
                
                <div>
                    <h3 className="text-base font-semibold mb-2">Internal link</h3>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={window.location.href}
                            readOnly
                            className="flex-1 px-3 py-2 border rounded bg-gray-50 text-sm"
                        />
                        <LemonButton icon={<IconCopy />} onClick={handleCopyInternalLink}>
                            Copy
                        </LemonButton>
                    </div>
                </div>

                <LemonDivider />

                <div>
                    <h3 className="text-base font-semibold mb-2">Template link</h3>
                    <p className="text-xs text-gray-500 mb-2">
                        Share this link to let others create a canvas from this notebook's content.
                    </p>
                    <LemonButton icon={<IconCopy />} onClick={handleCopyTemplateLink}>
                        Copy template link
                    </LemonButton>
                </div>

                <LemonDivider />

                <div>
                    <h3 className="text-base font-semibold mb-2">Export options</h3>
                    <div className="flex gap-2">
                        <LemonButton type="secondary" onClick={handleDownloadMd}>
                            Download .md
                        </LemonButton>
                        <LemonButton type="secondary" onClick={handleExportJSON}>
                            Export JSON
                        </LemonButton>
                    </div>
                </div>
            </div>
        </LemonModal>
    )
}
