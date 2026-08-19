import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import SEO from 'components/seo'
import OSButton from 'components/OSButton'
import WimLogo from 'components/WimLogo'
import { updatePassword } from 'lib/wim-auth'
import { supabase, isSupabaseConfigured } from 'lib/supabase'

export default function ResetPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [ready, setReady] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setError('Supabase is not configured')
            return
        }

        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || session?.user) {
                setReady(true)
            }
        })

        void supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) setReady(true)
        })

        return () => {
            sub.subscription.unsubscribe()
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }
        if (password !== confirm) {
            setError('Passwords do not match')
            return
        }
        setLoading(true)
        const res = await updatePassword(password)
        setLoading(false)
        if (res.error) {
            setError(res.error)
            return
        }
        setDone(true)
        window.setTimeout(() => router.replace('/desktop'), 900)
    }

    return (
        <div className="min-h-screen bg-primary text-primary flex items-center justify-center p-6">
            <SEO title="set password" noindex />
            <div className="w-full max-w-md bg-primary border border-primary rounded-xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                    <WimLogo className="size-7" />
                    <span className="text-[11px] font-bold tracking-widest uppercase text-muted">
                        WorldInMaking
                    </span>
                </div>
                <h1 className="text-lg font-bold m-0 mb-2">Set a password</h1>
                <p className="text-sm text-secondary m-0 mb-5">
                    Use this password next time instead of a magic link.
                </p>
                {error && (
                    <p className="bg-red/10 border border-red/30 rounded py-2 px-4 text-xs text-red font-semibold mb-4">
                        {error}
                    </p>
                )}
                {done ? (
                    <p className="text-sm m-0">Password saved. Taking you back…</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold mb-1 opacity-75">New password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="rounded-md border border-primary bg-primary py-2 px-3 w-full text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1 opacity-75">Confirm password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="rounded-md border border-primary bg-primary py-2 px-3 w-full text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <OSButton width="full" variant="primary" type="submit" disabled={loading || !ready}>
                            {loading ? 'Saving…' : ready ? 'Save password' : 'Open the email link first'}
                        </OSButton>
                    </form>
                )}
            </div>
        </div>
    )
}

ResetPasswordPage.noLayout = true
