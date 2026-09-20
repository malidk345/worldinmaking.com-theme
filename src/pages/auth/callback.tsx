import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, isSupabaseConfigured } from 'lib/supabase'
import {
    consumeAuthNextPath,
    readOAuthProviderError,
    safeAuthNextPath,
    shouldIgnorePkceExchangeError,
} from 'lib/auth-callback'
import usePostHog from 'hooks/usePostHog'
import WimLogo from 'components/WimLogo'

const COOKIELESS_SENTINEL_VALUE = '$posthog_cookieless'

export default function AuthCallbackPage() {
    const router = useRouter()
    const posthog = usePostHog()
    const [error, setError] = useState<string | null>(null)
    const ran = useRef(false)

    useEffect(() => {
        if (!router.isReady || ran.current) return
        ran.current = true

        // Record a failed OAuth login once, then show the reason to the visitor.
        const failLogin = (reason: string, message?: string) => {
            posthog?.capture?.('wim login error', {
                source: 'auth_callback',
                provider: 'google',
                reason,
                ...(message ? { message } : {}),
            })
            setError(message || 'We could not complete sign in. Please try again.')
        }

        const finish = async () => {
            if (!isSupabaseConfigured) {
                setError('Supabase is not configured')
                return
            }

            const code = typeof router.query.code === 'string' ? router.query.code : null
            const next = consumeAuthNextPath() || safeAuthNextPath(router.query.next)

            // The provider redirects back with an error when the user rejects the consent screen.
            const providerError = readOAuthProviderError(router.query)
            if (providerError) {
                failLogin(providerError.reason, providerError.description)
                return
            }

            const existing = await supabase.auth.getSession()
            if (!existing.data.session && code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                if (exchangeError) {
                    const after = await supabase.auth.getSession()
                    if (!shouldIgnorePkceExchangeError(exchangeError.message, !!after.data.session)) {
                        failLogin('code_exchange_failed', exchangeError.message)
                        return
                    }
                }
            }

            // Confirm authentication before we record success — the funnel and person
            // identity must only advance once Supabase returns a real session.
            const { data: sessionData } = await supabase.auth.getSession()
            const session = sessionData.session
            if (!session?.user) {
                failLogin('no_session')
                return
            }

            // Persist auth tokens to localStorage so early API calls on next page have auth context
            try {
                localStorage.setItem('jwt', session.access_token)
                localStorage.setItem('wim_auth_user_id', session.user.id)
            } catch {
                /* best-effort */
            }

            // Identify the person and record login success now that auth is confirmed.
            // The password path does this in useUser.finalizeLogin; OAuth returns here instead.
            try {
                const distinctId = posthog?.get_distinct_id?.()
                if (distinctId && distinctId !== COOKIELESS_SENTINEL_VALUE && session.user.email) {
                    posthog?.identify?.(session.user.id, { email: session.user.email })
                }
                posthog?.capture?.('wim login success', {
                    method: 'google',
                    email: session.user.email,
                })
            } catch {
                /* best-effort */
            }

            // Hard navigation back to the OS shell — router.replace('/desktop')
            // used to open a centered AppWindow that then vanished on world sync.
            window.location.replace(next)
        }

        void finish()
    }, [router.isReady, router.query])

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
