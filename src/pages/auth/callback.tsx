import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, isSupabaseConfigured } from 'lib/supabase'
import WimLogo from 'components/WimLogo'

export default function AuthCallbackPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!router.isReady) return

        const finish = async () => {
            if (!isSupabaseConfigured) {
                setError('Supabase is not configured')
                return
            }

            const code = typeof router.query.code === 'string' ? router.query.code : null
            const next = typeof router.query.next === 'string' ? router.query.next : '/desktop'

            if (code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                if (exchangeError) {
                    setError(exchangeError.message)
                    return
                }
            }

            router.replace(next.startsWith('/') ? next : '/desktop')
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
