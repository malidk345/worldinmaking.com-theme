import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { LemonButton, LemonInput } from '~nb-lib/lemon-ui/index'
import {
    IconCheck,
    IconChevronRight,
    IconCopy,
    IconDownload,
    IconExternal,
    IconGear,
    IconGlobe,
    IconPlus,
    IconTrash,
    IconUser,
} from '@posthog/icons'
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
    onClose?: () => void
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

// WIM native MenuBar tokens & styling (same as taskbar accountMenu & MenuBar.tsx)
const itemClass =
    'w-full min-h-[28px] py-1 px-2.5 flex items-center gap-2 rounded text-[13px] leading-snug text-primary hover:bg-accent group transition-colors text-left select-none cursor-pointer outline-none'
const iconClass = 'opacity-50 group-hover:opacity-75 size-4 shrink-0 transition-opacity'
const chevronClass = 'opacity-50 group-hover:opacity-75 size-4 ml-auto shrink-0 transition-transform duration-150'
const headerClass =
    'px-2.5 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider select-none leading-normal'
const separatorClass = 'my-1.5 mx-1.5 h-px bg-border'

export function NotebookShareModal({
    isOpen,
    notebookId,
    notebookTitle,
    onPublish,
}: NotebookShareModalProps) {
    const { addToast } = useToast()
    const { user } = useUser()
    const { openSignIn } = useApp()

    const [copied, setCopied] = useState<string | null>(null)
    const notebook = useMemo(() => (isOpen ? getNotebook(notebookId) : undefined), [isOpen, notebookId])

    const [subtitle, setSubtitle] = useState('')
    const [category, setCategory] = useState('notes')
    const [coverUrl, setCoverUrl] = useState('')
    const [handle, setHandle] = useState('')
    const [inviteRole, setInviteRole] = useState<NotebookShareRole>('editor')
    const [people, setPeople] = useState<NotebookCollaborator[]>([])
    const [invites, setInvites] = useState<NotebookPendingInvite[]>([])
    const [peopleBusy, setPeopleBusy] = useState(false)
    const [peopleError, setPeopleError] = useState<string | null>(null)

    const [showInvite, setShowInvite] = useState(false)
    const [showPublish, setShowPublish] = useState(false)

    const signedIn = Boolean(user) || Boolean(getAuthUserId())
    const canInvite = signedIn && canManageNotebookPeople(notebook?.access_role || 'owner')
    const isPublished = Boolean(notebook?.isPublished)
    const publicUrl = notebook ? getNotebookPublicUrl(notebook) : ''

    useEffect(() => {
        if (!isOpen) return
        setShowPublish(false)
        setShowInvite(false)
        const meta: NotebookPublishMeta | undefined = notebook?.publish
        setSubtitle(meta?.subtitle || '')
        setCategory(meta?.category || 'notes')
        setCoverUrl(meta?.coverUrl || '')
        setHandle('')
        setPeopleError(null)
    }, [isOpen, notebookId, notebook, notebookTitle])

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
        await copyText('md', exportNotebookAsMarkdown(notebookId), 'Notebook text copied.')
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
            try {
                await navigator.clipboard.writeText(result.url)
            } catch {
                /* ok */
            }
        }
        await reloadPeople()
        setShowInvite(false)
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
                return
            }
            return
        }
        setPeopleBusy(true)
        setPeopleError(null)
        const result = await inviteNotebookPerson(notebookId, { link: true, role: inviteRole })
        setPeopleBusy(false)
        if (!result.ok || !result.url) {
            setPeopleError(result.error || 'Could not create a link.')
            return
        }
        await copyText('invite', result.url, 'Invite link copied.')
        await reloadPeople()
    }

    const savePublish = (nextPublished: boolean) => {
        onPublish({
            title: notebook?.title || notebookTitle,
            subtitle: subtitle.trim(),
            coverImage: coverUrl.trim(),
            category,
            isPublished: nextPublished,
        })
        setShowPublish(false)
        addToast({
            description: nextPublished
                ? 'Published. It will show on your profile and anyone with the link can read it.'
                : 'Saved as a draft. Not listed on your profile.',
        })
    }

    return (
        <div
            role="menu"
            aria-label="Share notebook menu"
            data-scheme="secondary"
            className="w-[15.5rem] max-w-[calc(100vw-2rem)] p-1.5 pb-2 text-[13px] text-primary bg-primary rounded-md select-none"
        >
            {/* SECTION 1: COLLABORATION */}
            <div className={headerClass}>
                <span>COLLABORATION</span>
                {signedIn && canInvite ? (
                    <button
                        type="button"
                        onClick={() => setShowInvite((v) => !v)}
                        className="text-muted hover:text-primary transition-colors p-0.5"
                        title="Invite member"
                        aria-label="Invite member"
                    >
                        <IconPlus className="size-3.5 opacity-60 hover:opacity-100" />
                    </button>
                ) : null}
            </div>

            {/* Row 1: Invite members */}
            {signedIn ? (
                <button
                    type="button"
                    onClick={() => setShowInvite((v) => !v)}
                    className={itemClass}
                >
                    <IconPlus className={iconClass} />
                    <span className="truncate leading-normal py-0.5">Invite members</span>
                    <IconChevronRight
                        className={clsx(chevronClass, showInvite && 'rotate-90')}
                    />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        rememberAuthNextPath()
                        openSignIn()
                    }}
                    className={itemClass}
                >
                    <IconUser className={iconClass} />
                    <span className="truncate leading-normal py-0.5">Sign in to invite</span>
                    <IconChevronRight className={chevronClass} />
                </button>
            )}

            {/* Inline Invite Drawer */}
            {showInvite && signedIn ? (
                <div className="px-2.5 py-1.5 space-y-2 text-xs">
                    <p className="text-[11px] text-secondary m-0 leading-normal">
                        Invite by username or email. Editors can write; viewers can only read.
                    </p>
                    <div className="flex gap-1.5">
                        <LemonInput
                            value={handle}
                            onChange={setHandle}
                            placeholder="@username or email"
                            size="small"
                            className="flex-1 text-xs"
                            onPressEnter={() => void sendInvite()}
                        />
                        <select
                            className="text-xs border border-border rounded px-1.5 py-1 bg-[var(--color-bg-fill-input,#fff)] h-[30px] leading-normal"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value === 'viewer' ? 'viewer' : 'editor')}
                            aria-label="Access"
                        >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-0.5">
                        <LemonButton
                            size="small"
                            type="secondary"
                            onClick={() => setShowInvite(false)}
                        >
                            Cancel
                        </LemonButton>
                        <LemonButton
                            size="small"
                            type="primary"
                            disabled={!canInvite || peopleBusy || !handle.trim()}
                            onClick={() => void sendInvite()}
                        >
                            Invite
                        </LemonButton>
                    </div>
                    {peopleError ? <p className="text-[11px] text-danger m-0 leading-normal">{peopleError}</p> : null}
                </div>
            ) : null}

            {/* Row 2: Copy invite link */}
            <button
                type="button"
                onClick={() => void copyInviteLink()}
                className={itemClass}
            >
                <IconCopy className={iconClass} />
                <span className="truncate leading-normal py-0.5">Copy invite link</span>
                {copied === 'invite' ? (
                    <span className="text-[11px] text-success font-medium flex items-center gap-1 ml-auto shrink-0">
                        <IconCheck className="size-3.5" /> Copied
                    </span>
                ) : null}
            </button>

            {/* Members List (if any) */}
            {people.length > 0 || invites.length > 0 ? (
                <div className="px-2.5 pt-1 pb-0.5 space-y-1">
                    {people.map((entry) => (
                        <div
                            key={`${entry.role}-${entry.user_id}`}
                            className="flex items-center justify-between gap-1 text-[12px] text-secondary py-0.5 leading-normal"
                        >
                            <span className="truncate leading-normal">
                                {personLabel(entry.person, entry.user_id.slice(0, 8))}
                                <span className="text-muted ml-1.5">
                                    {entry.role === 'owner' ? 'Owner' : entry.role === 'viewer' ? 'Viewer' : 'Editor'}
                                </span>
                            </span>
                            {entry.role !== 'owner' && canInvite ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        void removeNotebookPerson(notebookId, {
                                            userId: entry.user_id,
                                        }).then(() => void reloadPeople())
                                    }}
                                    className="text-danger hover:underline text-[10px] shrink-0"
                                >
                                    Remove
                                </button>
                            ) : null}
                        </div>
                    ))}
                    {invites
                        .filter((invite) => invite.email || invite.username)
                        .map((invite) => (
                            <div
                                key={invite.id}
                                className="flex items-center justify-between gap-1 text-[11px] text-muted py-0.5 leading-normal"
                            >
                                <span className="truncate leading-normal">
                                    Pending: {invite.username ? `@${invite.username}` : invite.email} ({invite.role})
                                </span>
                                {canInvite ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void removeNotebookPerson(notebookId, {
                                                inviteId: invite.id,
                                            }).then(() => void reloadPeople())
                                        }}
                                        className="text-danger hover:underline shrink-0"
                                    >
                                        Revoke
                                    </button>
                                ) : null}
                            </div>
                        ))}
                </div>
            ) : null}

            {/* SEPARATOR 1 */}
            <div className={separatorClass} />

            {/* SECTION 2: WEB ACCESS */}
            <div className={headerClass}>
                <span>WEB ACCESS</span>
                {isPublished ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-success uppercase tracking-wider">
                        <span className="size-1.5 rounded-full bg-success inline-block" /> Live
                    </span>
                ) : (
                    <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
                        Draft
                    </span>
                )}
            </div>

            {isPublished ? (
                <>
                    {/* Row 1: Copy public link */}
                    <button
                        type="button"
                        onClick={() => void copyText('link', publicUrl, 'Public link copied.')}
                        className={itemClass}
                    >
                        <IconGlobe className={clsx(iconClass, 'text-success opacity-80')} />
                        <span className="truncate leading-normal py-0.5">Copy public link</span>
                        {copied === 'link' ? (
                            <span className="text-[11px] text-success font-medium flex items-center gap-1 ml-auto shrink-0">
                                <IconCheck className="size-3.5" /> Copied
                            </span>
                        ) : (
                            <span className="text-[11px] text-muted ml-auto shrink-0">Copy</span>
                        )}
                    </button>

                    {/* Row 2: Listing settings */}
                    <button
                        type="button"
                        onClick={() => setShowPublish((v) => !v)}
                        className={itemClass}
                    >
                        <IconGear className={iconClass} />
                        <span className="truncate leading-normal py-0.5">Listing settings</span>
                        <IconChevronRight
                            className={clsx(chevronClass, showPublish && 'rotate-90')}
                        />
                    </button>

                    {/* Row 3: Unpublish */}
                    <button
                        type="button"
                        onClick={() => savePublish(false)}
                        className={clsx(itemClass, 'text-danger hover:text-danger')}
                    >
                        <IconTrash className={clsx(iconClass, 'text-danger opacity-80')} />
                        <span className="truncate leading-normal py-0.5 text-danger">Unpublish notebook</span>
                    </button>
                </>
            ) : (
                /* Row 1: Publish to web */
                <button
                    type="button"
                    onClick={() => setShowPublish((v) => !v)}
                    className={itemClass}
                >
                    <IconGlobe className={iconClass} />
                    <span className="truncate leading-normal py-0.5">Publish to web</span>
                    <IconChevronRight
                        className={clsx(chevronClass, showPublish && 'rotate-90')}
                    />
                </button>
            )}

            {/* Inline Publish / Listing Settings Drawer */}
            {showPublish ? (
                <div className="px-2.5 py-1.5 space-y-2 text-xs">
                    <label className="block space-y-0.5">
                        <span className="text-[11px] font-semibold text-secondary leading-normal">Subtitle</span>
                        <LemonInput
                            value={subtitle}
                            onChange={setSubtitle}
                            placeholder="One or two sentences for your profile"
                            size="small"
                            className="text-xs"
                        />
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                        <label className="block space-y-0.5 min-w-0">
                            <span className="text-[11px] font-semibold text-secondary leading-normal">Category</span>
                            <select
                                className="w-full text-xs border border-border rounded px-1.5 py-1 bg-[var(--color-bg-fill-input,#fff)] h-[30px] leading-normal"
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
                        <label className="block space-y-0.5 min-w-0">
                            <span className="text-[11px] font-semibold text-secondary leading-normal">Cover URL</span>
                            <LemonInput
                                value={coverUrl}
                                onChange={setCoverUrl}
                                placeholder="https://…"
                                size="small"
                                className="text-xs"
                            />
                        </label>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-0.5">
                        <LemonButton
                            size="small"
                            type="secondary"
                            onClick={() => setShowPublish(false)}
                        >
                            Cancel
                        </LemonButton>
                        <LemonButton
                            size="small"
                            type="primary"
                            onClick={() => savePublish(true)}
                        >
                            {isPublished ? 'Update listing' : 'Publish'}
                        </LemonButton>
                    </div>
                </div>
            ) : null}

            {/* SEPARATOR 2 */}
            <div className={separatorClass} />

            {/* SECTION 3: EXPORT */}
            <div className={headerClass}>
                <span>EXPORT</span>
            </div>

            {/* Row 1: Copy text (Markdown) */}
            <button
                type="button"
                onClick={() => void handleCopyMarkdown()}
                className={itemClass}
            >
                <IconCopy className={iconClass} />
                <span className="truncate leading-normal py-0.5">Copy text (Markdown)</span>
                {copied === 'md' ? (
                    <span className="text-[11px] text-success font-medium flex items-center gap-1 ml-auto shrink-0">
                        <IconCheck className="size-3.5" /> Copied
                    </span>
                ) : null}
            </button>

            {/* Row 2: Copy for paper */}
            <button
                type="button"
                onClick={() => void handleCopyPaper()}
                className={itemClass}
            >
                <IconCopy className={iconClass} />
                <span className="truncate leading-normal py-0.5">Copy for paper</span>
                {copied === 'paper' ? (
                    <span className="text-[11px] text-success font-medium flex items-center gap-1 ml-auto shrink-0">
                        <IconCheck className="size-3.5" /> Copied
                    </span>
                ) : null}
            </button>

            {/* Row 3: Download .md */}
            <button
                type="button"
                onClick={handleDownloadMd}
                className={itemClass}
            >
                <IconDownload className={iconClass} />
                <span className="truncate leading-normal py-0.5">Download .md</span>
            </button>

            {/* Row 4: Send via email */}
            <button
                type="button"
                onClick={() => void handleEmail()}
                className={itemClass}
            >
                <IconExternal className={iconClass} />
                <span className="truncate leading-normal py-0.5">Send via email</span>
            </button>
        </div>
    )
}
