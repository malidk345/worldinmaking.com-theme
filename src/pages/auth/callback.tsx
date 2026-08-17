import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, isSupabaseConfigured } from 'lib/supabase'
import { safeAuthNextPath, shouldIgnorePkceExchangeError } from 'lib/auth-callback'
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
            const next = safeAuthNextPath(router.query.next)

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

            router.replace(next)
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
