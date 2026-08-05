import React from 'react'
import { LemonButton, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconArrowLeft, IconShare } from '@posthog/icons'
import { MarkdownNotebook } from '../../lib/components/MarkdownNotebook/MarkdownNotebook'
import type { StoredNotebook } from './notebookStorage'
import { getNotebookEditorUrl, getNotebookPublicUrl } from './notebookStorage'

interface NotebookPublicViewProps {
    notebook: StoredNotebook
    onBack: () => void
    onOpenEditor?: () => void
}

/** Read-only published notebook page (hash route `#/n/:short_id`). */
export function NotebookPublicView({ notebook, onBack, onOpenEditor }: NotebookPublicViewProps): JSX.Element {
    const displayTitle = notebook.publish?.publicTitle || notebook.title
    const subtitle = notebook.publish?.subtitle
    const coverUrl = notebook.publish?.coverUrl
    const category = notebook.publish?.category

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(getNotebookPublicUrl(notebook))
        } catch {
            /* ignore */
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-2">
                <LemonButton size="small" type="stealth" icon={<IconArrowLeft />} onClick={onBack}>
                    All notebooks
                </LemonButton>
                <div className="flex items-center gap-2">
                    <LemonButton size="small" type="secondary" icon={<IconShare />} onClick={handleCopyLink}>
                        Copy public link
                    </LemonButton>
                    {onOpenEditor && (
                        <LemonButton size="small" type="primary" onClick={onOpenEditor}>
                            Edit
                        </LemonButton>
                    )}
                </div>
            </div>

            {coverUrl ? (
                <div className="relative h-40 sm:h-52 w-full rounded-lg overflow-hidden border border-border">
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                        <h1 className="text-white text-2xl sm:text-3xl font-bold m-0 drop-shadow">{displayTitle}</h1>
                    </div>
                </div>
            ) : (
                <h1 className="text-2xl sm:text-3xl font-bold m-0 text-primary">{displayTitle}</h1>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm text-secondary">
                {notebook.isPublished ? (
                    <LemonTag type="success">Published</LemonTag>
                ) : (
                    <LemonTag type="warning">Unpublished preview</LemonTag>
                )}
                {category && <LemonTag type="muted">{category}</LemonTag>}
                <span className="text-muted">
                    Updated {new Date(notebook.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
            </div>

            {subtitle && <p className="text-secondary text-base leading-relaxed m-0">{subtitle}</p>}

            <div className="pt-2 border-t border-border">
                <MarkdownNotebook value={notebook.content} mode="view" />
            </div>

            <p className="text-xs text-muted pt-4 border-t border-border">
                Public link: <code className="text-[11px]">{getNotebookPublicUrl(notebook)}</code>
                {onOpenEditor && (
                    <>
                        {' · '}
                        <button type="button" className="underline" onClick={onOpenEditor}>
                            Open editor ({getNotebookEditorUrl(notebook).split('#')[1]})
                        </button>
                    </>
                )}
            </p>
        </div>
    )
}
