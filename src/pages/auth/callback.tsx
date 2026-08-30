import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, isSupabaseConfigured } from 'lib/supabase'
import { consumeAuthNextPath, safeAuthNextPath, shouldIgnorePkceExchangeError } from 'lib/auth-callback'
import WimLogo from 'components/WimLogo'

export default function AuthCallbackPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const ran = useRef(false)

    useEffect(() => {
        if (!router.isReady || ran.current) return
        ran.current = true

        const finish = async () => {
            if (!isSupabaseConfigured) {
                setError('Supabase is not configured')
                return
            }

            const code = typeof router.query.code === 'string' ? router.query.code : null
            const next = consumeAuthNextPath() || safeAuthNextPath(router.query.next)

            const existing = await supabase.auth.getSession()
            if (!existing.data.session && code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                if (exchangeError) {
                    const after = await supabase.auth.getSession()
                    if (!shouldIgnorePkceExchangeError(exchangeError.message, !!after.data.session)) {
                        setError(exchangeError.message)
                        return
                    }
                }
            }

            // Persist auth tokens to localStorage so early API calls on next page have auth context
            try {
                const { data: sessionData } = await supabase.auth.getSession()
                if (sessionData.session?.access_token) {
                    localStorage.setItem('jwt', sessionData.session.access_token)
                }
                if (sessionData.session?.user?.id) {
                    localStorage.setItem('wim_auth_user_id', sessionData.session.user.id)
                }
            } catch {
                /* best-effort */
            }

            // Hard navigation back to the OS shell — router.replace('/desktop')
            // used to open a centered AppWindow that then vanished on world sync.
            window.location.replace(next)
        }

        void finish()
    }, [router.isReady, router.query.code, router.query.next])

    return (
        <div className="min-h-screen bg-primary text-primary flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3">
                <WimLogo className="size-9" />
                <p className="text-sm text-secondary m-0">{error || 'Signing you in…'}</p>
            </div>
        </div>
    )
}

AuthCallbackPage.noLayout = true
