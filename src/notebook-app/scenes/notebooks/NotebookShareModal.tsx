import { useEffect, useMemo, useState } from 'react'
import { IconCheck, IconCopy, IconGlobe, IconTrash } from '@posthog/icons'
import OSButton from 'components/OSButton'
import {
    getNotebook,
    getNotebookPublicUrl,
    type NotebookPublishMeta,
} from './notebookStorage'
import { useToast } from '../../../context/Toast'
import { useApp } from '../../../context/App'
import { useUser } from '../../../hooks/useUser'
import { rememberAuthNextPath } from '../../../lib/auth-callback'
import {
    fetchNotebookPeople,
    inviteNotebookPerson,
    removeNotebookPerson,
    type NotebookCollaborator,
    type NotebookPendingInvite,
} from '../../../lib/notebook-collaborators-client'
import { canManageNotebookPeople, type NotebookShareRole } from '../../../lib/notebook-sharing'
import { getAuthUserId } from '../../../lib/wim-identity'

export type NotebookShareTab = 'private' | 'publish'

export type NotebookPublishPayload = {
    title?: string
    subtitle?: string
    coverImage?: string
    category?: string
    isPublished?: boolean
}

const CATEGORY_OPTIONS = [
    { value: 'research', label: 'Research' },
    { value: 'essay', label: 'Essay' },
    { value: 'debate', label: 'Debate' },
    { value: 'notes', label: 'Notes' },
]

const fieldClass =
    'w-full rounded border border-primary bg-primary px-2 py-1.5 text-sm text-primary placeholder:text-muted'

function personLabel(person?: NotebookCollaborator['person'], fallback = 'Member'): string {
    if (!person) return fallback
    return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username || person.email || fallback
}

export function NotebookInvitePanel({
    notebookId,
    isOpen,
}: {
    notebookId: string
    isOpen: boolean
}): JSX.Element | null {
    const { addToast } = useToast()
    const { user } = useUser()
    const { openSignIn } = useApp()
    const notebook = useMemo(() => (isOpen ? getNotebook(notebookId) : undefined), [isOpen, notebookId])
    const signedIn = Boolean(user) || Boolean(getAuthUserId())
    const canInvite = signedIn && canManageNotebookPeople(notebook?.access_role || 'owner')

    const [handle, setHandle] = useState('')
    const [inviteRole, setInviteRole] = useState<NotebookShareRole>('editor')
    const [people, setPeople] = useState<NotebookCollaborator[]>([])
    const [invites, setInvites] = useState<NotebookPendingInvite[]>([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setHandle('')
        setError(null)
        setCopied(false)
    }, [isOpen, notebookId])

    useEffect(() => {
        if (!isOpen || !signedIn) {
            setPeople([])
            setInvites([])
            return
        }
        let cancelled = false
        fetchNotebookPeople(notebookId).then((result) => {
            if (cancelled) return
            if (!result) {
                setError('Could not load people. Sign in and save the notebook, then try again.')
                return
            }
            setPeople(result.collaborators)
            setInvites(result.invites)
        })
        return () => {
            cancelled = true
        }
    }, [isOpen, notebookId, signedIn])

    if (!isOpen) return null

    const reloadPeople = async () => {
        const result = await fetchNotebookPeople(notebookId)
        if (!result) return
        setPeople(result.collaborators)
        setInvites(result.invites)
    }

    const sendInvite = async () => {
        if (!canInvite) return
        setBusy(true)
        setError(null)
        const result = await inviteNotebookPerson(notebookId, { handle, role: inviteRole })
        setBusy(false)
        if (!result.ok) {
            setError(result.error || 'Could not invite that person.')
            return
        }
        setHandle('')
        if (result.url) {
            try {
                await navigator.clipboard.writeText(result.url)
            } catch {
                /* ok */
            }
        }
        await reloadPeople()
        addToast({
            description: result.added
                ? 'They can write on this notebook now. Invite link copied.'
                : 'Invite link copied. Send it to them so they can join.',
        })
    }

    const copyInviteLink = async () => {
        if (!canInvite) {
            if (!signedIn) {
                rememberAuthNextPath()
                openSignIn()
            }
            return
        }
        setBusy(true)
        setError(null)
        const result = await inviteNotebookPerson(notebookId, { link: true, role: inviteRole })
        setBusy(false)
        if (!result.ok || !result.url) {
            setError(result.error || 'Could not create a link.')
            return
        }
        try {
            await navigator.clipboard.writeText(result.url)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
            addToast({ description: 'Invite link copied.' })
        } catch {
            addToast({ description: 'Could not copy. Try again.', error: true })
        }
        await reloadPeople()
    }

    if (!signedIn) {
        return (
            <div className="px-1 pb-1 space-y-2">
                <p className="m-0 text-sm text-secondary">Sign in to invite people to this notebook.</p>
                <OSButton
                    variant="primary"
                    size="sm"
                    width="full"
                    onClick={() => {
                        rememberAuthNextPath()
                        openSignIn()
                    }}
                >
                    Sign in
                </OSButton>
            </div>
        )
    }

    return (
        <div className="px-1 pb-1 space-y-3">
            <p className="m-0 text-[13px] text-secondary leading-snug">
                Invite by username or email. Editors can write; viewers can only read.
            </p>
            <div className="flex flex-col gap-2">
                <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') void sendInvite()
                    }}
                    placeholder="@username or email"
                    className={fieldClass}
                />
                <select
                    className={fieldClass}
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value === 'viewer' ? 'viewer' : 'editor')}
                    aria-label="Access"
                >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                </select>
                <OSButton
                    variant="primary"
                    size="sm"
                    width="full"
                    disabled={!canInvite || busy || !handle.trim()}
                    onClick={() => void sendInvite()}
                >
                    Invite
                </OSButton>
                <OSButton size="sm" width="full" hover="background" disabled={busy} onClick={() => void copyInviteLink()}>
                    {copied ? (
                        <span className="inline-flex items-center gap-1">
                            <IconCheck className="size-4" /> Link copied
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1">
                            <IconCopy className="size-4" /> Copy invite link
                        </span>
                    )}
                </OSButton>
            </div>
            {error ? <p className="m-0 text-[12px] text-red">{error}</p> : null}
            {people.length > 0 || invites.length > 0 ? (
                <ul className="list-none m-0 p-0 flex flex-col gap-1 border-t border-primary pt-2">
                    {people.map((entry) => (
                        <li key={`${entry.role}-${entry.user_id}`} className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-[13px] text-primary">
                                {personLabel(entry.person, entry.user_id.slice(0, 8))}
                                <span className="text-muted ml-1.5">
                                    {entry.role === 'owner' ? 'Owner' : entry.role === 'viewer' ? 'Viewer' : 'Editor'}
                                </span>
                            </span>
                            {entry.role !== 'owner' && canInvite ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        void removeNotebookPerson(notebookId, { userId: entry.user_id }).then(
                                            () => void reloadPeople()
                                        )
                                    }}
                                    className="text-[11px] text-red shrink-0 hover:underline"
                                >
                                    Remove
                                </button>
                            ) : null}
                        </li>
                    ))}
                    {invites
                        .filter((invite) => invite.email || invite.username)
                        .map((invite) => (
                            <li key={invite.id} className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate text-[12px] text-muted">
                                    Pending: {invite.username ? `@${invite.username}` : invite.email} ({invite.role})
                                </span>
                                {canInvite ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void removeNotebookPerson(notebookId, { inviteId: invite.id }).then(
                                                () => void reloadPeople()
                                            )
                                        }}
                                        className="text-[11px] text-red shrink-0 hover:underline"
                                    >
                                        Revoke
                                    </button>
                                ) : null}
                            </li>
                        ))}
                </ul>
            ) : null}
        </div>
    )
}

export function NotebookPublishPanel({
    notebookId,
    notebookTitle,
    isOpen,
    onPublish,
}: {
    notebookId: string
    notebookTitle: string
    isOpen: boolean
    onPublish: (meta: NotebookPublishPayload) => void
}): JSX.Element | null {
    const { addToast } = useToast()
    const notebook = useMemo(() => (isOpen ? getNotebook(notebookId) : undefined), [isOpen, notebookId])
    const isPublished = Boolean(notebook?.isPublished)
    const publicUrl = notebook ? getNotebookPublicUrl(notebook) : ''

    const [subtitle, setSubtitle] = useState('')
    const [category, setCategory] = useState('notes')
    const [coverUrl, setCoverUrl] = useState('')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        const meta: NotebookPublishMeta | undefined = notebook?.publish
        setSubtitle(meta?.subtitle || '')
        setCategory(meta?.category || 'notes')
        setCoverUrl(meta?.coverUrl || '')
        setCopied(false)
    }, [isOpen, notebookId, notebook])

    if (!isOpen) return null

    const savePublish = (nextPublished: boolean) => {
        onPublish({
            title: notebook?.title || notebookTitle,
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
        <div className="px-1 pb-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="m-0 text-[13px] text-secondary leading-snug">
                    {isPublished ? 'Live on your profile and anyone with the link.' : 'Draft. Not listed on your profile.'}
                </p>
                {isPublished ? (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-green">Live</span>
                ) : (
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted">Draft</span>
                )}
            </div>
            {isPublished ? (
                <OSButton
                    size="sm"
                    width="full"
                    hover="background"
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(publicUrl)
                            setCopied(true)
                            window.setTimeout(() => setCopied(false), 1500)
                            addToast({ description: 'Public link copied.' })
                        } catch {
                            addToast({ description: 'Could not copy. Try again.', error: true })
                        }
                    }}
                >
                    {copied ? (
                        <span className="inline-flex items-center gap-1">
                            <IconCheck className="size-4" /> Link copied
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1">
                            <IconGlobe className="size-4" /> Copy public link
                        </span>
                    )}
                </OSButton>
            ) : null}
            <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-secondary">Subtitle</span>
                <input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="One or two sentences for your profile"
                    className={fieldClass}
                />
            </label>
            <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-secondary">Category</span>
                <select className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-secondary">Cover URL</span>
                <input
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://…"
                    className={fieldClass}
                />
            </label>
            <OSButton variant="primary" size="sm" width="full" onClick={() => savePublish(true)}>
                {isPublished ? 'Update listing' : 'Publish on WIM'}
            </OSButton>
            {isPublished ? (
                <OSButton size="sm" width="full" hover="background" onClick={() => savePublish(false)}>
                    <span className="inline-flex items-center gap-1 text-red">
                        <IconTrash className="size-4" /> Unpublish
                    </span>
                </OSButton>
            ) : null}
        </div>
    )
}
