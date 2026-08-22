import React, { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { StoredNotebook } from './notebookStorage'
import { getNotebook, getNotebookPublicUrl } from './notebookStorage'
import { pullPublishedNotebook } from './notebookRemote'
import { documentMarkdown, notebookCommentSlug } from './notebookPublicMarkdown'
import { Avatar, Questions } from 'components/Squeak'
import Markdown from 'components/Squeak/components/Markdown'
import Link from 'components/Link'
import OSButton from 'components/OSButton'
import { IconCopy, IconPencil, IconArrowLeft } from '@posthog/icons'
import { ZoomImage } from 'components/ZoomImage'
import { profileHref } from '../../../lib/profile-path'
import { useToast } from '../../../context/Toast'

dayjs.extend(relativeTime)

interface NotebookPublicViewProps {
    notebook: StoredNotebook
    onBack: () => void
    onOpenEditor?: () => void
}

function authorPerson(notebook: StoredNotebook) {
    return notebook.created_by || notebook.last_modified_by
}

function authorName(notebook: StoredNotebook): string {
    const person = authorPerson(notebook)
    if (!person) return 'Anonymous'
    return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username || 'Anonymous'
}

/**
 * Published notebook as a community thread: author row, title, markdown, comments.
 */
export function NotebookPublicView({ notebook, onBack, onOpenEditor }: NotebookPublicViewProps): JSX.Element {
    const { addToast } = useToast()
    const displayTitle = notebook.publish?.publicTitle || notebook.title
    const subtitle = notebook.publish?.subtitle
    const coverUrl = notebook.publish?.coverUrl
    const category = notebook.publish?.category
    const person = authorPerson(notebook)
    const name = authorName(notebook)
    const handle = person?.username || ''
    const href = handle ? profileHref(handle) : ''
    const body = documentMarkdown(notebook.content, displayTitle)
    const postedAt = notebook.createdAt || notebook.updatedAt

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(getNotebookPublicUrl(notebook))
            addToast({ description: 'Link copied' })
        } catch {
            addToast({ description: 'Could not copy link', error: true })
        }
    }

    return (
        <div data-scheme="primary" className="bg-primary text-primary min-h-full">
            <div className="flex flex-col w-full max-w-3xl mx-auto">
                <div className="flex items-center gap-2 w-full min-w-0 flex-wrap pt-5 pl-5 pr-8">
                    {href ? (
                        <Link className="flex items-center relative !no-underline hover:!underline" to={href}>
                            <div className="size-10 shrink-0 rounded-full mr-2.5 overflow-hidden">
                                <Avatar className="size-10" image={person?.avatar_url || null} />
                            </div>
                            <strong>{name}</strong>
                        </Link>
                    ) : (
                        <span className="flex items-center">
                            <div className="size-10 shrink-0 rounded-full mr-2.5 overflow-hidden">
                                <Avatar className="size-10" image={person?.avatar_url || null} />
                            </div>
                            <strong>{name}</strong>
                        </span>
                    )}
                    {postedAt ? (
                        <span suppressHydrationWarning className="text-sm text-muted">
                            {dayjs(postedAt).fromNow()}
                        </span>
                    ) : null}
                    {category ? (
                        <span className="text-xs text-secondary border border-primary rounded px-1.5 py-0.5">
                            {category}
                        </span>
                    ) : null}
                    <div className="!ml-auto flex items-center space-x-px shrink-0">
                        <OSButton
                            onClick={onBack}
                            icon={<IconArrowLeft />}
                            size="md"
                            tooltip="All notebooks"
                        />
                        <OSButton onClick={() => void handleCopyLink()} icon={<IconCopy />} size="md" tooltip="Copy link" />
                        {onOpenEditor ? (
                            <OSButton
                                onClick={onOpenEditor}
                                icon={<IconPencil />}
                                size="md"
                                tooltip="Edit notebook"
                            />
                        ) : null}
                    </div>
                </div>

                <div className="pb-4 min-w-0 max-w-full box-border pl-5 pr-8">
                    <h3 className="text-base font-semibold !m-0 pb-1 leading-5 break-words">{displayTitle}</h3>
                    {subtitle ? <p className="text-sm text-secondary m-0 mb-3 leading-relaxed">{subtitle}</p> : null}
                    {coverUrl ? (
                        <div className="mb-3">
                            <ZoomImage>
                                <img className="max-w-full max-h-96 rounded-md" src={coverUrl} alt="" />
                            </ZoomImage>
                        </div>
                    ) : null}
                    {body ? (
                        <Markdown className="question-content">{body}</Markdown>
                    ) : (
                        <p className="m-0 text-sm text-muted">This notebook has no text yet.</p>
                    )}
                </div>

                <div data-scheme="primary" className="bg-primary border-t border-primary pt-4 px-4 pb-8">
                    <Questions
                        slug={notebookCommentSlug(notebook.short_id || notebook.id)}
                        subject={false}
                        disclaimer={false}
                        buttonText="Leave a comment"
                    />
                </div>
            </div>
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
            <div data-scheme="primary" className="p-12 text-center text-muted space-y-2 bg-primary text-primary">
                <p className="text-lg m-0">Loading published notebook…</p>
                <p className="text-sm m-0">Checking this device, then the public archive.</p>
            </div>
        )
    }

    if (!notebook || missing) {
        return (
            <div data-scheme="primary" className="p-12 text-center text-muted space-y-4 bg-primary text-primary">
                <p className="text-lg">Published notebook not found ({notebookId})</p>
                <OSButton onClick={onBack}>Back to notebooks</OSButton>
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
