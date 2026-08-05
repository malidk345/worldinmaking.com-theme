import { useMemo, useState } from 'react'
import { LemonModal, LemonButton, LemonDivider, LemonBanner, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconCopy, IconCheck } from '@posthog/icons'
import {
    getNotebook,
    getNotebookPublicUrl,
    getNotebookEditorUrl,
    exportNotebookAsJSON,
    exportNotebookAsMarkdown,
} from './notebookStorage'

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
    const [copied, setCopied] = useState<'public' | 'editor' | null>(null)

    const notebook = useMemo(() => (isOpen ? getNotebook(notebookId) : undefined), [isOpen, notebookId])
    const isPublished = Boolean(notebook?.isPublished)
    const publicUrl = notebook ? getNotebookPublicUrl(notebook) : ''
    const editorUrl = notebook ? getNotebookEditorUrl(notebook) : ''

    const copy = async (kind: 'public' | 'editor', value: string) => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(kind)
            setTimeout(() => setCopied(null), 1500)
        } catch {
            /* ignore */
        }
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
                {isPublished ? (
                    <LemonBanner type="success">
                        This notebook is published. Anyone with the public link can read it on this device browser
                        (local storage).
                    </LemonBanner>
                ) : (
                    <LemonBanner type="info">
                        Draft only — publish from the Publish menu to enable a public read link.
                    </LemonBanner>
                )}

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold m-0">Public link</h3>
                        <LemonTag type={isPublished ? 'success' : 'muted'}>
                            {isPublished ? 'Live' : 'Unavailable'}
                        </LemonTag>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={isPublished ? publicUrl : 'Publish the notebook to get a public link'}
                            readOnly
                            className="flex-1 px-3 py-2 border border-border rounded bg-surface-secondary text-sm text-primary"
                        />
                        <LemonButton
                            icon={copied === 'public' ? <IconCheck /> : <IconCopy />}
                            disabled={!isPublished}
                            onClick={() => copy('public', publicUrl)}
                        >
                            {copied === 'public' ? 'Copied' : 'Copy'}
                        </LemonButton>
                    </div>
                </div>

                <LemonDivider />

                <div>
                    <h3 className="text-base font-semibold mb-2">Editor link</h3>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={editorUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-border rounded bg-surface-secondary text-sm text-primary"
                        />
                        <LemonButton
                            icon={copied === 'editor' ? <IconCheck /> : <IconCopy />}
                            onClick={() => copy('editor', editorUrl)}
                        >
                            {copied === 'editor' ? 'Copied' : 'Copy'}
                        </LemonButton>
                    </div>
                </div>

                <LemonDivider />

                <div>
                    <h3 className="text-base font-semibold mb-2">Export</h3>
                    <div className="flex gap-2">
                        <LemonButton type="secondary" onClick={handleDownloadMd}>
                            Download Markdown
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
