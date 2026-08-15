import React, { useEffect, useState } from 'react'
import { LemonButton, LemonTag } from '~nb-lib/lemon-ui/index'
import { IconArrowLeft, IconShare } from '@posthog/icons'
import { MarkdownNotebook } from '../../lib/components/MarkdownNotebook/MarkdownNotebook'
import type { StoredNotebook } from './notebookStorage'
import { getNotebook, getNotebookEditorUrl, getNotebookPublicUrl } from './notebookStorage'
import { pullPublishedNotebook } from './notebookRemote'

interface NotebookPublicViewProps {
    notebook: StoredNotebook
    onBack: () => void
    onOpenEditor?: () => void
}

function authorLabel(notebook: StoredNotebook): string {
    const person = notebook.created_by || notebook.last_modified_by
    if (!person) return ''
    return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username || ''
}

/** Read-only published notebook page (hash route `#/n/:short_id`). */
export function NotebookPublicView({ notebook, onBack, onOpenEditor }: NotebookPublicViewProps): JSX.Element {
    const displayTitle = notebook.publish?.publicTitle || notebook.title
    const subtitle = notebook.publish?.subtitle
    const coverUrl = notebook.publish?.coverUrl
    const category = notebook.publish?.category
    const byline = authorLabel(notebook)
    const canEdit = Boolean(getNotebook(notebook.id) || getNotebook(notebook.short_id))

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
                    {canEdit && onOpenEditor && (
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
                ) : canEdit ? (
                    <LemonTag type="warning">Draft preview</LemonTag>
                ) : null}
                {category && <LemonTag type="muted">{category}</LemonTag>}
                {byline ? <span className="text-muted">By {byline}</span> : null}
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
                {canEdit && onOpenEditor && (
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

interface NotebookPublicRouteProps {
    notebookId: string
    onBack: () => void
    onOpenEditor: (id: string) => void
}

/** Local first, then published remote fallback for share links opened on another device. */
export function NotebookPublicRoute({ notebookId, onBack, onOpenEditor }: NotebookPublicRouteProps): JSX.Element {
    const [notebook, setNotebook] = useState<StoredNotebook | null>(() => getNotebook(notebookId) ?? null)
    const [loading, setLoading] = useState(!getNotebook(notebookId))
    const [missing, setMissing] = useState(false)

    useEffect(() => {
        let cancelled = false
        const local = getNotebook(notebookId)
        if (local) {
            setNotebook(local)
            setLoading(false)
            setMissing(false)
            return
        }

        setLoading(true)
        setMissing(false)
        setNotebook(null)

        pullPublishedNotebook(notebookId)
            .then((remote) => {
                if (cancelled) return
                if (remote) {
                    setNotebook(remote)
                    setMissing(false)
                } else {
                    setMissing(true)
                }
                setLoading(false)
            })
            .catch(() => {
                if (cancelled) return
                setMissing(true)
                setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [notebookId])

    if (loading) {
        return (
            <div className="p-12 text-center text-muted space-y-2">
                <p className="text-lg m-0">Loading published notebook…</p>
                <p className="text-sm m-0">Checking this device, then the public archive.</p>
            </div>
        )
    }

    if (!notebook || missing) {
        return (
            <div className="p-12 text-center text-muted space-y-4">
                <p className="text-lg">Published notebook not found ({notebookId})</p>
                <LemonButton type="primary" onClick={onBack}>
                    Back to notebooks
                </LemonButton>
            </div>
        )
    }

    const ownsLocally = Boolean(getNotebook(notebook.id) || getNotebook(notebook.short_id))
    return (
        <NotebookPublicView
            notebook={notebook}
            onBack={onBack}
            onOpenEditor={ownsLocally ? () => onOpenEditor(notebook.id) : undefined}
        />
    )
}
