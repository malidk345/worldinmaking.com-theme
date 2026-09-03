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

function personLabel(person?: NotebookCollaborator['person'], fallback = 'Member'): string {
    if (!person) return fallback
    return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username || person.email || fallback
}

export function NotebookShareModal({
    isOpen,
    onClose,
    notebookId,
    notebookTitle,
    initialTab = 'private',
    onPublish,
}: NotebookShareModalProps) {
    const { addToast } = useToast()
    const { user } = useUser()
    const { openSignIn } = useApp()
    const [tab, setTab] = useState<NotebookShareTab>(initialTab)
    useEffect(() => {
        if (isOpen) setTab(initialTab)
    }, [isOpen, initialTab])
    const [copied, setCopied] = useState<string | null>(null)
    const notebook = useMemo(() => (isOpen ? getNotebook(notebookId) : undefined), [isOpen, notebookId])

    const [publicTitle, setPublicTitle] = useState(notebookTitle)
    const [subtitle, setSubtitle] = useState('')
    const [category, setCategory] = useState('notes')
    const [coverUrl, setCoverUrl] = useState('')
    const [handle, setHandle] = useState('')
    const [inviteRole, setInviteRole] = useState<NotebookShareRole>('editor')
    const [people, setPeople] = useState<NotebookCollaborator[]>([])
    const [invites, setInvites] = useState<NotebookPendingInvite[]>([])
    const [linkUrl, setLinkUrl] = useState('')
    const [peopleBusy, setPeopleBusy] = useState(false)
    const [peopleError, setPeopleError] = useState<string | null>(null)

    const signedIn = Boolean(user) || Boolean(getAuthUserId())
    const canInvite = signedIn && canManageNotebookPeople(notebook?.access_role || 'owner')

    useEffect(() => {
        if (!isOpen) return
        setTab(initialTab)
        const meta: NotebookPublishMeta | undefined = notebook?.publish
        setPublicTitle(meta?.publicTitle || notebook?.title || notebookTitle)
        setSubtitle(meta?.subtitle || '')
        setCategory(meta?.category || 'notes')
        setCoverUrl(meta?.coverUrl || '')
        setHandle('')
        setPeopleError(null)
        setLinkUrl('')
    }, [isOpen, initialTab, notebookId, notebook, notebookTitle])

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
                setPeopleError('Could not load people. Sign in and save the notebook, then try again.')
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

    const reloadPeople = async () => {
        const result = await fetchNotebookPeople(notebookId)
        if (!result) return
        setPeople(result.collaborators)
        setInvites(result.invites)
    }

    const sendInvite = async () => {
        if (!canInvite) return
        setPeopleBusy(true)
        setPeopleError(null)
        const result = await inviteNotebookPerson(notebookId, { handle, role: inviteRole })
        setPeopleBusy(false)
        if (!result.ok) {
            setPeopleError(result.error || 'Could not invite that person.')
            return
        }
        setHandle('')
        if (result.url) {
            setLinkUrl(result.url)
            try {
                await navigator.clipboard.writeText(result.url)
            } catch {
                /* still show the URL */
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
        if (!canInvite) return
        setPeopleBusy(true)
        setPeopleError(null)
        const result = await inviteNotebookPerson(notebookId, { link: true, role: inviteRole })
        setPeopleBusy(false)
        if (!result.ok || !result.url) {
            setPeopleError(result.error || 'Could not create a link.')
            return
        }
        setLinkUrl(result.url)
        await copyText('invite', result.url, 'Invite link copied. Anyone signed in with the link can join.')
        await reloadPeople()
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
            <div
                role="dialog"
                aria-labelledby="notebook-share-title"
                data-scheme="secondary"
                className="w-[22rem] max-w-[calc(100vw-2rem)] p-1 space-y-4"
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
                        Invite people
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
                    <div className="space-y-4">
                        {!signedIn ? (
                            <div className="space-y-2">
                                <p className="text-sm text-secondary m-0 leading-relaxed">
                                    Sign in to invite other people to write on this notebook with you. Live cursors and
                                    saves stay in sync through your account.
                                </p>
                                <LemonButton
                                    type="primary"
                                    size="small"
                                    onClick={() => {
                                        rememberAuthNextPath()
                                        openSignIn()
                                    }}
                                >
                                    Sign in to invite
                                </LemonButton>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs text-secondary m-0 leading-relaxed">
                                    Invite by username or email. Editors can write at the same time; viewers can only
                                    read.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <LemonInput
                                        value={handle}
                                        onChange={setHandle}
                                        placeholder="@username or email"
                                        size="small"
                                        className="flex-1"
                                        onPressEnter={() => void sendInvite()}
                                    />
                                    <select
                                        className="text-sm border border-primary rounded px-2 py-1.5 bg-[var(--color-bg-fill-input,#fff)]"
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value === 'viewer' ? 'viewer' : 'editor')}
                                        aria-label="Access"
                                    >
                                        <option value="editor">Can edit</option>
                                        <option value="viewer">Can view</option>
                                    </select>
                                    <LemonButton
                                        type="primary"
                                        size="small"
                                        disabled={!canInvite || peopleBusy || !handle.trim()}
                                        onClick={() => void sendInvite()}
                                    >
                                        Invite
                                    </LemonButton>
                                </div>
                                <LemonButton
                                    type="secondary"
                                    size="small"
                                    disabled={!canInvite || peopleBusy}
                                    onClick={() => void copyInviteLink()}
                                >
                                    {copied === 'invite' ? 'Link copied' : 'Copy invite link'}
                                </LemonButton>
                                {linkUrl ? (
                                    <p className="text-xs text-muted m-0 break-all">{linkUrl}</p>
                                ) : null}
                                {peopleError ? <p className="text-xs text-danger m-0">{peopleError}</p> : null}

                                <div className="space-y-2">
                                    <span className="text-xs font-semibold">People with access</span>
                                    {people.length === 0 ? (
                                        <p className="text-xs text-muted m-0">Only you so far.</p>
                                    ) : (
                                        <ul className="m-0 p-0 list-none space-y-1.5">
                                            {people.map((entry) => (
                                                <li
                                                    key={`${entry.role}-${entry.user_id}`}
                                                    className="flex items-center justify-between gap-2 text-sm"
                                                >
                                                    <span className="min-w-0 truncate">
                                                        {personLabel(entry.person, entry.user_id.slice(0, 8))}
                                                        <span className="text-xs text-muted ml-2">
                                                            {entry.role === 'owner'
                                                                ? 'Owner'
                                                                : entry.role === 'viewer'
                                                                  ? 'Viewer'
                                                                  : 'Editor'}
                                                        </span>
                                                    </span>
                                                    {entry.role !== 'owner' && canInvite ? (
                                                        <LemonButton
                                                            size="small"
                                                            type="tertiary"
                                                            status="danger"
                                                            onClick={() => {
                                                                void removeNotebookPerson(notebookId, {
                                                                    userId: entry.user_id,
                                                                }).then(() => void reloadPeople())
                                                            }}
                                                        >
                                                            Remove
                                                        </LemonButton>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {invites
                                        .filter((invite) => invite.email || invite.username)
                                        .map((invite) => (
                                            <div
                                                key={invite.id}
                                                className="flex items-center justify-between gap-2 text-xs text-muted"
                                            >
                                                <span>
                                                    Pending: {invite.username ? `@${invite.username}` : invite.email} (
                                                    {invite.role})
                                                </span>
                                                {canInvite ? (
                                                    <LemonButton
                                                        size="small"
                                                        type="tertiary"
                                                        onClick={() => {
                                                            void removeNotebookPerson(notebookId, {
                                                                inviteId: invite.id,
                                                            }).then(() => void reloadPeople())
                                                        }}
                                                    >
                                                        Revoke
                                                    </LemonButton>
                                                ) : null}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 border-t border-primary pt-3">
                            <p className="text-xs text-secondary m-0 leading-relaxed">
                                Or send a copy as text. That does not let them edit this notebook live.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <LemonButton type="secondary" size="small" onClick={() => void handleCopyMarkdown()}>
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
    )
}
