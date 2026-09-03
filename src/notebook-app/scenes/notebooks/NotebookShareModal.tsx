import { useEffect, useMemo, useState } from 'react'
import { LemonButton, LemonInput } from '~nb-lib/lemon-ui/index'
import {
    getNotebook,
    getNotebookPublicUrl,
    exportNotebookAsMarkdown,
    exportNotebookAsPaperMarkdown,
    downloadTextFile,
    type NotebookPublishMeta,
} from './notebookStorage'
import { notebookFilename } from './outlineModel'
import { useToast } from '../../../context/Toast'

export type NotebookShareTab = 'private' | 'publish'

export type NotebookPublishPayload = {
    title?: string
    subtitle?: string
    coverImage?: string
    category?: string
    isPublished?: boolean
}

interface NotebookShareModalProps {
    isOpen: boolean
    onClose: () => void
    notebookId: string
    notebookTitle: string
    initialTab?: NotebookShareTab
    onPublish: (meta: NotebookPublishPayload) => void
}

const CATEGORY_OPTIONS = [
    { value: 'research', label: 'Research' },
    { value: 'essay', label: 'Essay' },
    { value: 'debate', label: 'Debate' },
    { value: 'notes', label: 'Notes' },
]

export function NotebookShareModal({
    isOpen,
    onClose,
    notebookId,
    notebookTitle,
    initialTab = 'private',
    onPublish,
}: NotebookShareModalProps) {
    const { addToast } = useToast()
    const [tab, setTab] = useState<NotebookShareTab>(initialTab)
    const [copied, setCopied] = useState<string | null>(null)
    const notebook = useMemo(() => (isOpen ? getNotebook(notebookId) : undefined), [isOpen, notebookId])

    const [publicTitle, setPublicTitle] = useState(notebookTitle)
    const [subtitle, setSubtitle] = useState('')
    const [category, setCategory] = useState('notes')
    const [coverUrl, setCoverUrl] = useState('')

    useEffect(() => {
        if (!isOpen) return
        setTab(initialTab)
        const meta: NotebookPublishMeta | undefined = notebook?.publish
        setPublicTitle(meta?.publicTitle || notebook?.title || notebookTitle)
        setSubtitle(meta?.subtitle || '')
        setCategory(meta?.category || 'notes')
        setCoverUrl(meta?.coverUrl || '')
    }, [isOpen, initialTab, notebookId, notebook, notebookTitle])

    if (!isOpen) return null

    const isPublished = Boolean(notebook?.isPublished)
    const publicUrl = notebook ? getNotebookPublicUrl(notebook) : ''

    const flash = (key: string, description: string) => {
        setCopied(key)
        addToast({ description })
        window.setTimeout(() => setCopied(null), 1500)
    }

    const copyText = async (key: string, value: string, description: string) => {
        try {
            await navigator.clipboard.writeText(value)
            flash(key, description)
        } catch {
            addToast({ description: 'Could not copy. Try again.', error: true })
        }
    }

    const handleCopyMarkdown = async () => {
        await copyText('md', exportNotebookAsMarkdown(notebookId), 'Notebook text copied. Paste it in a message or email.')
    }

    const handleCopyPaper = async () => {
        await copyText('paper', exportNotebookAsPaperMarkdown(notebookId), 'Paper-ready text copied.')
    }

    const handleEmail = async () => {
        const markdown = exportNotebookAsMarkdown(notebookId)
        try {
            await navigator.clipboard.writeText(markdown)
        } catch {
            /* still open mail */
        }
        const subject = encodeURIComponent(notebookTitle || 'Notebook')
        const preview =
            markdown.length > 1400 ? `${markdown.slice(0, 1400)}\n\n[Full text is on your clipboard.]` : markdown
        window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(preview)}`
        addToast({ description: 'Full text is on your clipboard. Mail opened with a preview.' })
    }

    const handleDownloadMd = () => {
        downloadTextFile(
            notebookFilename(notebookTitle, 'md'),
            exportNotebookAsMarkdown(notebookId),
            'text/markdown;charset=utf-8'
        )
    }

    const savePublish = (nextPublished: boolean) => {
        onPublish({
            title: publicTitle.trim() || notebookTitle,
            subtitle: subtitle.trim(),
            coverImage: coverUrl.trim(),
            category,
            isPublished: nextPublished,
        })
        addToast({
            description: nextPublished
                ? 'Published. It will show on your profile and anyone with the link can read it.'
                : 'Saved as a draft. Not listed on your profile.',
        })
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40 border-0 cursor-default"
                aria-label="Close share"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="notebook-share-title"
                data-scheme="secondary"
                className="relative z-[1] w-full max-w-lg rounded-lg border border-primary bg-primary text-primary shadow-xl p-4 space-y-4"
            >
                <div className="flex items-start justify-between gap-3">
                    <h2 id="notebook-share-title" className="text-base font-semibold m-0">
                        Share notebook
                    </h2>
                    <LemonButton size="small" type="tertiary" onClick={onClose}>
                        Close
                    </LemonButton>
                </div>

                <div className="flex gap-2" role="tablist">
                    <LemonButton
                        size="small"
                        type={tab === 'private' ? 'primary' : 'secondary'}
                        onClick={() => setTab('private')}
                    >
                        Send privately
                    </LemonButton>
                    <LemonButton
                        size="small"
                        type={tab === 'publish' ? 'primary' : 'secondary'}
                        onClick={() => setTab('publish')}
                    >
                        Publish on WIM
                    </LemonButton>
                </div>

                {tab === 'private' ? (
                    <div className="space-y-3">
                        <p className="text-xs text-secondary m-0 leading-relaxed">
                            Sends the notebook as text. This does not list it on your profile or on the site.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <LemonButton
                                type="primary"
                                size="small"
                                onClick={() => void handleCopyMarkdown()}
                            >
                                {copied === 'md' ? 'Copied' : 'Copy text'}
                            </LemonButton>
                            <LemonButton type="secondary" size="small" onClick={() => void handleCopyPaper()}>
                                {copied === 'paper' ? 'Copied for paper' : 'Copy for paper'}
                            </LemonButton>
                            <LemonButton type="secondary" size="small" onClick={() => void handleEmail()}>
                                Email
                            </LemonButton>
                            <LemonButton type="secondary" size="small" onClick={handleDownloadMd}>
                                Download .md
                            </LemonButton>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs text-secondary m-0 leading-relaxed">
                            {isPublished
                                ? 'Live on your profile. Anyone with the public link can read it.'
                                : 'Draft. Publish when you want it on your profile and as a public link.'}
                        </p>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold">Public title</span>
                            <LemonInput value={publicTitle} onChange={setPublicTitle} size="small" />
                        </label>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold">Subtitle</span>
                            <LemonInput
                                value={subtitle}
                                onChange={setSubtitle}
                                placeholder="One or two sentences for your profile"
                                size="small"
                            />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block space-y-1 min-w-0">
                                <span className="text-xs font-semibold">Category</span>
                                <select
                                    className="w-full text-sm border border-primary rounded px-2 py-1.5 bg-[var(--color-bg-fill-input,#fff)]"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    {CATEGORY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block space-y-1 min-w-0">
                                <span className="text-xs font-semibold">Cover URL (optional)</span>
                                <LemonInput value={coverUrl} onChange={setCoverUrl} placeholder="https://…" size="small" />
                            </label>
                        </div>
                        {isPublished && publicUrl ? (
                            <div className="space-y-1">
                                <span className="text-xs font-semibold">Public link</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={publicUrl}
                                        readOnly
                                        className="flex-1 px-2 py-1.5 border border-primary rounded text-xs bg-transparent"
                                    />
                                    <LemonButton
                                        size="small"
                                        type="secondary"
                                        onClick={() => void copyText('link', publicUrl, 'Public link copied.')}
                                    >
                                        {copied === 'link' ? 'Copied' : 'Copy'}
                                    </LemonButton>
                                </div>
                            </div>
                        ) : null}
                        <div className="flex flex-wrap justify-end gap-2 pt-1">
                            <LemonButton type="secondary" size="small" onClick={() => savePublish(false)}>
                                Save draft
                            </LemonButton>
                            {isPublished ? (
                                <LemonButton type="secondary" size="small" status="danger" onClick={() => savePublish(false)}>
                                    Unpublish
                                </LemonButton>
                            ) : null}
                            <LemonButton type="primary" size="small" onClick={() => savePublish(true)}>
                                {isPublished ? 'Update listing' : 'Publish'}
                            </LemonButton>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
