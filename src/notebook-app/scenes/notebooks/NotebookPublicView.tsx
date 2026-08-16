import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { LemonButton } from '~nb-lib/lemon-ui/index'
import type { StoredNotebook } from './notebookStorage'
import { getNotebook, getNotebookPublicUrl } from './notebookStorage'
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

function wordCount(content: string): number {
    const words = String(content || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[#>*_`~\-]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
    return words.length
}

function formatMetaDate(dateStr?: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, { dateStyle: 'long' })
}

/** Plain document text: drop editor blocks and a repeated title heading. */
function documentMarkdown(content: string, title: string): string {
    let text = String(content || '').replace(/^\uFEFF/, '')
    text = text.replace(/<ph-[^>]*\/>/gi, '')
    text = text.replace(/<ph-[^>]*>[\s\S]*?<\/ph-[^>]+>/gi, '')
    const match = text.match(/^#\s+(.+)\n?/)
    if (match && match[1].trim().toLowerCase() === title.trim().toLowerCase()) {
        text = text.slice(match[0].length)
    }
    return text.replace(/^\n+/, '').trim()
}

/**
 * Public notebook as a PDF reader: meta outside, a LemonTable-framed
 * white page inside that scrolls. No editor blocks. Site fonts.
 */
export function NotebookPublicView({ notebook, onBack, onOpenEditor }: NotebookPublicViewProps): JSX.Element {
    const displayTitle = notebook.publish?.publicTitle || notebook.title
    const subtitle = notebook.publish?.subtitle
    const category = notebook.publish?.category
    const byline = authorLabel(notebook)
    const canEdit = Boolean(getNotebook(notebook.id) || getNotebook(notebook.short_id))
    const body = documentMarkdown(notebook.content, displayTitle)
    const words = wordCount(notebook.content)
    const updated = formatMetaDate(notebook.updatedAt)

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(getNotebookPublicUrl(notebook))
        } catch {
            /* ignore */
        }
    }

    const metaBits = [
        `${words.toLocaleString()} ${words === 1 ? 'word' : 'words'}`,
        byline ? `By ${byline}` : null,
        updated ? `Updated ${updated}` : null,
        category || null,
    ].filter(Boolean)

    return (
        <div className="flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between gap-2 print:hidden">
                <LemonButton size="small" type="stealth" onClick={onBack}>
                    All notebooks
                </LemonButton>
                <div className="flex items-center gap-2">
                    <LemonButton size="small" type="secondary" onClick={() => window.print()}>
                        Print
                    </LemonButton>
                    <LemonButton size="small" type="secondary" onClick={() => void handleCopyLink()}>
                        Copy link
                    </LemonButton>
                    {canEdit && onOpenEditor ? (
                        <LemonButton size="small" type="primary" onClick={onOpenEditor}>
                            Edit
                        </LemonButton>
                    ) : null}
                </div>
            </div>

            <header className="space-y-1.5 print:mb-4">
                <h1 className="m-0 text-2xl sm:text-3xl font-semibold leading-tight text-primary">{displayTitle}</h1>
                {subtitle ? <p className="m-0 text-sm text-secondary leading-relaxed">{subtitle}</p> : null}
                {metaBits.length ? <p className="m-0 text-xs text-muted">{metaBits.join(' · ')}</p> : null}
            </header>

            <div className="LemonTable notebook-pdf-frame min-h-0">
                <div className="LemonTable__content overflow-y-auto h-[min(72vh,48rem)]">
                    <article className="notebook-pdf-page bg-white text-[#1d1f27] mx-auto min-h-full max-w-[46rem] px-8 py-10 sm:px-14 sm:py-14">
                        {body ? (
                            <div className="notebook-pdf-prose">
                                <ReactMarkdown>{body}</ReactMarkdown>
                            </div>
                        ) : (
                            <p className="m-0 text-sm text-muted">This notebook has no text yet.</p>
                        )}
                    </article>
                </div>
            </div>

            <style>{`
                .notebook-pdf-prose {
                    font-size: 15px;
                    line-height: 1.7;
                }
                .notebook-pdf-prose > *:first-child { margin-top: 0; }
                .notebook-pdf-prose p { margin: 0 0 1em; }
                .notebook-pdf-prose h1,
                .notebook-pdf-prose h2,
                .notebook-pdf-prose h3,
                .notebook-pdf-prose h4 {
                    margin: 1.4em 0 0.5em;
                    line-height: 1.3;
                    font-weight: 600;
                }
                .notebook-pdf-prose ul,
                .notebook-pdf-prose ol { margin: 0 0 1em; padding-left: 1.4em; }
                .notebook-pdf-prose blockquote {
                    margin: 0 0 1em;
                    padding-left: 1em;
                    border-left: 2px solid var(--color-border-primary, #ddd);
                    color: var(--text-secondary, #555);
                }
                .notebook-pdf-prose pre {
                    margin: 0 0 1em;
                    padding: 0.85em 1em;
                    overflow-x: auto;
                    background: #f5f5f6;
                    border-radius: var(--radius, 6px);
                    font-size: 0.9em;
                }
                .notebook-pdf-prose code { font-size: 0.9em; }
                @media print {
                    .notebook-pdf-frame { border: 0 !important; }
                    .LemonTable__content { height: auto !important; overflow: visible !important; }
                    .notebook-pdf-page { max-width: none; padding: 0; }
                }
            `}</style>
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
