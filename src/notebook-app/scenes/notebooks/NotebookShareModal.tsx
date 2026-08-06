import { useMemo, useState } from 'react'
import { LemonModal, LemonButton, LemonDivider, LemonBanner, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconCopy, IconCheck } from '@posthog/icons'
import {
    getNotebook,
    getNotebookPublicUrl,
    getNotebookEditorUrl,
    exportNotebookAsJSON,
    exportNotebookAsMarkdown,
    exportNotebookAsPaperMarkdown,
    downloadTextFile,
} from './notebookStorage'
import { notebookFilename } from './outlineModel'

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
        try {
            downloadTextFile(
                notebookFilename(notebookTitle, 'md'),
                exportNotebookAsMarkdown(notebookId),
                'text/markdown;charset=utf-8'
            )
        } catch {
            /* ignore */
        }
    }

    const handleDownloadPaper = () => {
        try {
            downloadTextFile(
                notebookFilename(notebookTitle, 'paper.md'),
                exportNotebookAsPaperMarkdown(notebookId),
                'text/markdown;charset=utf-8'
            )
        } catch {
            /* ignore */
        }
    }

    const handleExportJSON = () => {
        try {
            downloadTextFile(
                notebookFilename(notebookTitle, 'json'),
                exportNotebookAsJSON(notebookId),
                'application/json;charset=utf-8'
            )
        } catch {
            /* ignore */
        }
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
                    <div className="flex flex-wrap gap-2">
                        <LemonButton type="secondary" onClick={handleDownloadMd}>
                            Markdown
                        </LemonButton>
                        <LemonButton type="secondary" onClick={handleDownloadPaper}>
                            For paper
                        </LemonButton>
                        <LemonButton type="secondary" onClick={handleExportJSON}>
                            JSON
                        </LemonButton>
                        <LemonButton type="secondary" onClick={() => window.print()}>
                            Print / PDF
                        </LemonButton>
                    </div>
                </div>
            </div>
        </LemonModal>
    )
}
