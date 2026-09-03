import { useEffect, useState } from 'react'
import { LemonButton } from '~nb-lib/lemon-ui/index'
import { useApp } from '../../../context/App'
import { useUser } from '../../../hooks/useUser'
import { rememberAuthNextPath } from '../../../lib/auth-callback'
import {
    acceptNotebookInviteClient,
    fetchNotebookInvitePreview,
    type NotebookInvitePreview,
} from '../../../lib/notebook-collaborators-client'
import { rememberRemoteNotebook, type StoredNotebook } from './notebookStorage'

interface NotebookInviteSceneProps {
    token: string
    onJoined: (notebookId: string) => void
    onBack: () => void
}

function personName(person?: { first_name?: string; last_name?: string; username?: string }): string {
    if (!person) return 'Someone'
    return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username || 'Someone'
}

export function NotebookInviteScene({ token, onJoined, onBack }: NotebookInviteSceneProps): JSX.Element {
    const { user } = useUser()
    const { openSignIn } = useApp()
    const [preview, setPreview] = useState<NotebookInvitePreview | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        fetchNotebookInvitePreview(token)
            .then((next) => {
                if (cancelled) return
                setPreview(next)
                if (!next) setError('This invite is missing, expired, or was revoked.')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [token])

    const join = async () => {
        setBusy(true)
        setError(null)
        const result = await acceptNotebookInviteClient(token)
        if (result.needsAuth) {
            rememberAuthNextPath()
            openSignIn(() => {
                void join()
            })
            setBusy(false)
            return
        }
        if (!result.ok || !result.notebook_id) {
            setError(result.error || 'Could not join this notebook.')
            setBusy(false)
            return
        }
        if (result.notebook) {
            rememberRemoteNotebook(result.notebook as StoredNotebook)
        }
        setBusy(false)
        onJoined(result.notebook_id)
    }

    const roleLabel = preview?.role === 'viewer' ? 'view' : 'write'

    return (
        <div className="max-w-lg mx-auto py-12 px-4 space-y-4 text-center">
            <p className="m-0 text-xs uppercase tracking-wide text-muted">Notebook invite</p>
            {loading ? (
                <p className="m-0 text-sm text-muted animate-pulse">Loading invite…</p>
            ) : preview ? (
                <>
                    <h1 className="m-0 text-2xl font-semibold text-primary">{preview.notebook_title}</h1>
                    <p className="m-0 text-sm text-secondary leading-relaxed">
                        {personName(preview.inviter)} invited you to {roleLabel} on this notebook with them.
                    </p>
                    {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {user ? (
                            <LemonButton type="primary" onClick={() => void join()} loading={busy}>
                                {preview.role === 'viewer' ? 'Open notebook' : 'Join and write'}
                            </LemonButton>
                        ) : (
                            <LemonButton
                                type="primary"
                                onClick={() => {
                                    rememberAuthNextPath()
                                    openSignIn(() => {
                                        void join()
                                    })
                                }}
                            >
                                Sign in to join
                            </LemonButton>
                        )}
                        <LemonButton type="secondary" onClick={onBack}>
                            Back to notebooks
                        </LemonButton>
                    </div>
                </>
            ) : (
                <>
                    <h1 className="m-0 text-xl font-semibold">Invite unavailable</h1>
                    <p className="m-0 text-sm text-secondary">{error || 'This invite is no longer valid.'}</p>
                    <LemonButton type="primary" onClick={onBack}>
                        Back to notebooks
                    </LemonButton>
                </>
            )}
        </div>
    )
}
