import React, { useEffect, useState } from 'react'
import SEO from 'components/seo'
import ScrollArea from 'components/RadixUI/ScrollArea'
import OSButton from 'components/OSButton'
import OSInput from 'components/OSForm/input'
import { Fieldset } from 'components/OSFieldset'
import { useUser } from 'hooks/useUser'
import { useToast } from 'context/Toast'
import { useAppActions } from 'context/App'
import { isUserPro } from 'lib/wim-billing'
import { IconSpinner } from '@posthog/icons'
import Link from 'components/Link'

type BillingStatus = {
    desk: 'desk' | 'study'
    email?: string | null
    subscription?: {
        status?: string | null
        plan?: string | null
        currentPeriodEnd?: string | null
        hasLemonId?: boolean
        portalUrl?: string | null
    } | null
}

function when(iso?: string | null) {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AccountWindow() {
    const { user, logout, isValidating, updatePassword, updateEmail } = useUser()
    const { openSignIn } = useAppActions()
    const { addToast } = useToast()
    const isStudy = isUserPro(user as any)
    const handle = user?.username || user?.profile?.username || ''
    const email = user?.email || ''

    const [status, setStatus] = useState<BillingStatus | null>(null)
    const [busy, setBusy] = useState<'status' | 'cancel' | 'delete' | 'password' | 'email' | 'export' | null>(
        user ? 'status' : null
    )
    const [confirmCancel, setConfirmCancel] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteTyped, setDeleteTyped] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [nextEmail, setNextEmail] = useState('')

    const loadStatus = async () => {
        if (!user) {
            setStatus(null)
            setBusy(null)
            return
        }
        setBusy('status')
        try {
            const { chatAuthHeadersFresh } = await import('lib/chat-remote')
            const headers = await chatAuthHeadersFresh()
            const res = await fetch('/api/billing/status', { headers })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Could not load account')
            setStatus(data as BillingStatus)
        } catch (err: any) {
            addToast({ error: true, description: err?.message || 'Could not load account' })
        } finally {
            setBusy(null)
        }
    }

    useEffect(() => {
        if (isValidating) return
        loadStatus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, isValidating])

    const authFetch = async (url: string, body?: Record<string, unknown>) => {
        const { chatAuthHeadersFresh } = await import('lib/chat-remote')
        const headers = await chatAuthHeadersFresh(!!body)
        return fetch(url, {
            method: 'POST',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        })
    }

    const handleCancelStudy = async () => {
        setBusy('cancel')
        try {
            const res = await authFetch('/api/billing/cancel')
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Could not cancel')
            addToast({
                description: data.untilPeriodEnd
                    ? `Study stays through ${when(data.currentPeriodEnd) || 'the paid period'}.`
                    : 'Study cancelled.',
            })
            setConfirmCancel(false)
            await loadStatus()
        } catch (err: any) {
            addToast({ error: true, description: err?.message || 'Could not cancel' })
        } finally {
            setBusy(null)
        }
    }

    const handleEmail = async () => {
        const next = nextEmail.trim()
        if (!next) {
            addToast({ error: true, description: 'Enter a new email address.' })
            return
        }
        if (next.toLowerCase() === email.toLowerCase()) {
            addToast({ error: true, description: 'That is already the current email.' })
            return
        }
        setBusy('email')
        try {
            const res = await updateEmail(next)
            if (res.error) throw new Error(res.error)
            addToast({ description: 'Check the new address to confirm the change.' })
            setNextEmail('')
        } catch (err: any) {
            addToast({ error: true, description: err?.message || 'Could not update email' })
        } finally {
            setBusy(null)
        }
    }

    const handleExport = async () => {
        setBusy('export')
        try {
            const { chatAuthHeadersFresh } = await import('lib/chat-remote')
            const headers = await chatAuthHeadersFresh()
            const res = await fetch('/api/account/export', { headers })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Could not export')
            }
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            const day = new Date().toISOString().slice(0, 10)
            a.href = url
            a.download = `worldinmaking-export-${day}.json`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
            addToast({ description: 'Download started.' })
        } catch (err: any) {
            addToast({ error: true, description: err?.message || 'Could not export' })
        } finally {
            setBusy(null)
        }
    }

    const handlePassword = async () => {
        if (password.length < 6) {
            addToast({ error: true, description: 'Password must be at least 6 characters.' })
            return
        }
        if (password !== passwordConfirm) {
            addToast({ error: true, description: 'Passwords do not match.' })
            return
        }
        setBusy('password')
        try {
            const res = await updatePassword(password)
            if (res.error) throw new Error(res.error)
            addToast({ description: 'Password updated.' })
            setPassword('')
            setPasswordConfirm('')
        } catch (err: any) {
            addToast({ error: true, description: err?.message || 'Could not update password' })
        } finally {
            setBusy(null)
        }
    }

    const handleDelete = async () => {
        setBusy('delete')
        try {
            const res = await authFetch('/api/account/delete', { confirm: deleteTyped })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Could not delete account')
            addToast({ description: 'Account deleted.' })
            await logout()
        } catch (err: any) {
            addToast({ error: true, description: err?.message || 'Could not delete account' })
            setBusy(null)
        }
    }

    const membership = status?.desk === 'study' || isStudy ? 'Study' : 'Desk'
    const period = when(status?.subscription?.currentPeriodEnd)
    const expectedConfirm = handle || email
    const subStatus = (status?.subscription?.status || '').toLowerCase()
    const canLeaveStudy =
        !!status?.subscription?.hasLemonId && !['cancelled', 'expired'].includes(subStatus)

    return (
        <div data-scheme="primary" className="h-full min-h-0 bg-transparent text-primary flex flex-col">
            <SEO title="account" noindex />
            <ScrollArea className="flex-1 min-h-0">
                <div className="min-h-full flex items-center justify-center px-5 py-8">
                    <div className="w-full max-w-sm">
                    {!user ? (
                        <div className="text-center">
                            <p className="text-sm text-secondary mb-4">Sign in to manage membership.</p>
                            <OSButton size="md" variant="primary" onClick={() => openSignIn()}>
                                Sign in
                            </OSButton>
                        </div>
                    ) : (
                        <>
                            <Fieldset className="mb-4" legend="Membership">
                                <div className="text-sm space-y-3">
                                    <p className="flex justify-between m-0 gap-3">
                                        <span className="font-semibold">Plan</span>
                                        <span>{busy === 'status' ? '…' : membership}</span>
                                    </p>
                                    {period ? (
                                        <p className="flex justify-between m-0 gap-3">
                                            <span className="font-semibold">Paid through</span>
                                            <span>{period}</span>
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {canLeaveStudy ? (
                                        confirmCancel ? (
                                            <>
                                                <OSButton
                                                    size="md"
                                                    variant="primary"
                                                    disabled={busy === 'cancel'}
                                                    onClick={handleCancelStudy}
                                                >
                                                    {busy === 'cancel' ? (
                                                        <span className="inline-flex items-center gap-2">
                                                            <IconSpinner className="size-4 animate-spin" />
                                                            Cancelling
                                                        </span>
                                                    ) : (
                                                        'Confirm cancel'
                                                    )}
                                                </OSButton>
                                                <OSButton size="md" onClick={() => setConfirmCancel(false)}>
                                                    Back
                                                </OSButton>
                                            </>
                                        ) : (
                                            <OSButton size="md" onClick={() => setConfirmCancel(true)}>
                                                Cancel study
                                            </OSButton>
                                        )
                                    ) : membership === 'Desk' ? (
                                        <OSButton size="md" variant="primary" asLink to="/pricing">
                                            Upgrade
                                        </OSButton>
                                    ) : null}
                                    {status?.subscription?.portalUrl ? (
                                        <OSButton
                                            size="md"
                                            asLink
                                            to={status.subscription.portalUrl}
                                            external
                                        >
                                            Invoices
                                        </OSButton>
                                    ) : null}
                                </div>
                            </Fieldset>

                            <Fieldset className="mb-4" legend="Email">
                                <p className="text-sm flex justify-between m-0 gap-3">
                                    <span className="font-semibold">Current</span>
                                    <span className="truncate">{email || '—'}</span>
                                </p>
                                <OSInput
                                    label="New email"
                                    type="email"
                                    direction="column"
                                    value={nextEmail}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNextEmail(e.target.value)}
                                    autoComplete="email"
                                />
                                <div className="mt-2">
                                    <OSButton
                                        size="md"
                                        disabled={busy === 'email' || !nextEmail.trim()}
                                        onClick={handleEmail}
                                    >
                                        {busy === 'email' ? (
                                            <span className="inline-flex items-center gap-2">
                                                <IconSpinner className="size-4 animate-spin" />
                                                Saving
                                            </span>
                                        ) : (
                                            'Update email'
                                        )}
                                    </OSButton>
                                </div>
                            </Fieldset>

                            <Fieldset className="mb-4" legend="Password">
                                <OSInput
                                    label="New password"
                                    type="password"
                                    direction="column"
                                    value={password}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                />
                                <OSInput
                                    label="Confirm"
                                    type="password"
                                    direction="column"
                                    value={passwordConfirm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setPasswordConfirm(e.target.value)
                                    }
                                    autoComplete="new-password"
                                />
                                <div className="mt-2">
                                    <OSButton
                                        size="md"
                                        disabled={busy === 'password' || !password}
                                        onClick={handlePassword}
                                    >
                                        {busy === 'password' ? (
                                            <span className="inline-flex items-center gap-2">
                                                <IconSpinner className="size-4 animate-spin" />
                                                Saving
                                            </span>
                                        ) : (
                                            'Update password'
                                        )}
                                    </OSButton>
                                </div>
                            </Fieldset>

                            <Fieldset className="mb-4" legend="Your data">
                                <OSButton size="md" disabled={busy === 'export'} onClick={handleExport}>
                                    {busy === 'export' ? (
                                        <span className="inline-flex items-center gap-2">
                                            <IconSpinner className="size-4 animate-spin" />
                                            Preparing
                                        </span>
                                    ) : (
                                        'Download a copy'
                                    )}
                                </OSButton>
                            </Fieldset>

                            {deleteOpen ? (
                                <Fieldset legend="Delete account">
                                    <OSInput
                                        label={`Type ${expectedConfirm || 'delete'}`}
                                        direction="column"
                                        value={deleteTyped}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setDeleteTyped(e.target.value)
                                        }
                                        autoComplete="off"
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <OSButton
                                            size="md"
                                            variant="primary"
                                            disabled={busy === 'delete' || !deleteTyped.trim()}
                                            onClick={handleDelete}
                                        >
                                            {busy === 'delete' ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <IconSpinner className="size-4 animate-spin" />
                                                    Deleting
                                                </span>
                                            ) : (
                                                'Delete'
                                            )}
                                        </OSButton>
                                        <OSButton
                                            size="md"
                                            onClick={() => {
                                                setDeleteOpen(false)
                                                setDeleteTyped('')
                                            }}
                                        >
                                            Cancel
                                        </OSButton>
                                    </div>
                                </Fieldset>
                            ) : (
                                <button
                                    type="button"
                                    className="text-red dark:text-yellow text-sm font-semibold bg-transparent border-0 p-0 cursor-pointer"
                                    onClick={() => setDeleteOpen(true)}
                                >
                                    Delete account
                                </button>
                            )}
                            <p className="mt-6 mb-0 text-xs text-muted flex flex-wrap gap-x-3 gap-y-1">
                                <Link href="/terms" className="hover:text-primary">
                                    Terms
                                </Link>
                                <Link href="/privacy" className="hover:text-primary">
                                    Privacy
                                </Link>
                                <Link href="/cookies" className="hover:text-primary">
                                    Cookies
                                </Link>
                                <Link href="/refund" className="hover:text-primary">
                                    Refunds
                                </Link>
                            </p>
                        </>
                    )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
