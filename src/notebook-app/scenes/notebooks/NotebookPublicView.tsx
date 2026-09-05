import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { StoredNotebook } from './notebookStorage'
import { getNotebook, getNotebookPublicUrl } from './notebookStorage'
import { pullPublishedNotebook } from './notebookRemote'
import { documentMarkdown, notebookCommentSlug, pickPublicNotebook } from './notebookPublicMarkdown'
import { Avatar, Questions } from 'components/Squeak'
import Link from 'components/Link'
import OSButton from 'components/OSButton'
import { IconCopy, IconPencil, IconArrowLeft } from '@posthog/icons'
import { ZoomImage } from 'components/ZoomImage'
import { profileHref } from '../../../lib/profile-path'
import { useToast } from '../../../context/Toast'
import { canWriteNotebook } from '../../../lib/notebook-sharing'

const MarkdownNotebook = React.lazy(() =>
    import('../../lib/components/MarkdownNotebook/MarkdownNotebook').then((mod) => ({
        default: mod.MarkdownNotebook,
    }))
)

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
    const rawTitle = notebook.publish?.publicTitle || notebook.title
    const leadingHeadingMatch = notebook.content?.match(/^\s*(?:<!--wim-block:[^>]*-->\s*)*#\s+(.+?)(?:\r?\n|$)/)
    const displayTitle = String(rawTitle || leadingHeadingMatch?.[1] || '').replace(/^#+\s+/, '').trim()
    const subtitle = notebook.publish?.subtitle
    const coverUrl = notebook.publish?.coverUrl
    const category = notebook.publish?.category
    const person = authorPerson(notebook)
    const name = authorName(notebook)
    const handle = person?.username || ''
    const href = handle ? profileHref(handle) : ''
    const postedAt = notebook.createdAt || notebook.updatedAt
    const bodyMarkdown = documentMarkdown(notebook.content || '', displayTitle)
    const readingStats = useMemo(() => {
        if (!bodyMarkdown) return null
        const words = (bodyMarkdown.trim().match(/\S+/g) || []).length
        if (words === 0) return null
        const minutes = Math.max(1, Math.ceil(words / 200))
        return { words, minutes }
    }, [bodyMarkdown])

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(getNotebookPublicUrl(notebook))
            addToast({ description: 'Link copied' })
        } catch {
            addToast({ description: 'Could not copy link', error: true })
        }
    }

    return (
        <div data-scheme="primary" className="NotebookPublicView bg-primary text-primary min-h-full pb-16">
            <div className="flex flex-col w-full p-4">
                <div className="flex items-center gap-2 w-full min-w-0 flex-wrap pb-2">
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
                    {readingStats ? (
                        <>
                            <span className="text-muted opacity-40">•</span>
                            <span className="text-sm text-muted">
                                {readingStats.minutes} min read ({readingStats.words.toLocaleString()} words)
                            </span>
                        </>
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
                    <article className="NotebookPublicView__article prose prose-sm dark:prose-invert max-w-none font-normal">
                    <p className="NotebookPublicView__title">{displayTitle}</p>
                    {subtitle ? <p className="text-secondary !mt-0 !mb-3">{subtitle}</p> : null}
                    {coverUrl ? (
                        <div className="mb-3">
                            <ZoomImage>
                                <img className="max-w-full max-h-96 rounded-md" src={coverUrl} alt="" />
                            </ZoomImage>
                        </div>
                    ) : null}
                    {bodyMarkdown ? (
                        <React.Suspense
                            fallback={<p className="m-0 text-sm text-muted animate-pulse">Loading page…</p>}
                        >
                            <MarkdownNotebook
                                value={bodyMarkdown}
                                mode="view"
                                spellCheck={false}
                                autoFocus={false}
                                placeholder=""
                            />
                        </React.Suspense>
                    ) : (
                        <p className="m-0 text-sm text-muted">This notebook has no text yet.</p>
                    )}
                    </article>

                <div data-scheme="primary" className="bg-primary border-t border-primary pt-4 pb-8">
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

/** Published remote copy, with a local published draft only as a fast first paint. */
export function NotebookPublicRoute({ notebookId, onBack, onOpenEditor }: NotebookPublicRouteProps): JSX.Element {
    const [notebook, setNotebook] = useState<StoredNotebook | null>(() => {
        const local = getNotebook(notebookId)
        return local?.isPublished === true ? local : null
    })
    const [loading, setLoading] = useState(() => getNotebook(notebookId)?.isPublished !== true)
    const [missing, setMissing] = useState(false)

    useEffect(() => {
        let cancelled = false
        const local = getNotebook(notebookId)
        const publishedLocal = local?.isPublished === true ? local : null
        if (publishedLocal) {
            setNotebook(publishedLocal)
            setLoading(false)
            setMissing(false)
        } else {
            setNotebook(null)
            setLoading(true)
            setMissing(false)
        }

        pullPublishedNotebook(notebookId)
            .then((remote) => {
                if (cancelled) return
                const next = pickPublicNotebook(publishedLocal, remote)
                setNotebook(next)
                setMissing(!next)
                setLoading(false)
            })
            .catch(() => {
                if (cancelled) return
                const next = pickPublicNotebook(publishedLocal, null)
                setNotebook(next)
                setMissing(!next)
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

    const localCopy = getNotebook(notebook.id) || getNotebook(notebook.short_id)
    const canEdit = Boolean(localCopy && canWriteNotebook(localCopy.access_role))
    return (
        <NotebookPublicView
            notebook={notebook}
            onBack={onBack}
            onOpenEditor={canEdit ? () => onOpenEditor(notebook.id) : undefined}
        />
    )
}
