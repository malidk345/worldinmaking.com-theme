import posthog from 'posthog-js'
import { readConsent } from './wim-consent'

function getPostHogKey(): string {
    if (typeof window !== 'undefined') {
        const win = window as any
        if (win.__POSTHOG_KEY) return win.__POSTHOG_KEY
        if (win.POSTHOG_KEY) return win.POSTHOG_KEY
    }
    return (process.env.NEXT_PUBLIC_POSTHOG_KEY || '').trim()
}

function getPostHogHost(): string {
    let host = ''
    if (typeof window !== 'undefined') {
        const win = window as any
        host = win.__POSTHOG_HOST || win.POSTHOG_HOST || ''
    }
    if (!host) {
        host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
    }
    const trimmed = (host || '').trim().replace(/\/+$/, '')
    if (!trimmed) return 'https://us.i.posthog.com'
    if (trimmed.includes('eu.posthog.com') && !trimmed.includes('eu.i.posthog.com')) {
        return 'https://eu.i.posthog.com'
    }
    if (trimmed.includes('us.posthog.com') && !trimmed.includes('us.i.posthog.com')) {
        return 'https://us.i.posthog.com'
    }
    return trimmed
}

/**
 * True when an exception carries the benign "ResizeObserver loop ..." browser
 * warning. Chrome and Safari raise this as an unhandled window error whenever a
 * ResizeObserver callback changes layout faster than notifications deliver. It
 * is a layout-timing warning, not a crash, so it only adds noise to error
 * tracking. The message text sits in `$exception_message` and in each
 * `$exception_list` item's `value`.
 */
function isResizeObserverLoopError(properties: Record<string, any> | undefined): boolean {
    if (!properties) return false
    const candidates: unknown[] = [properties.$exception_message]
    const list = properties.$exception_list
    if (Array.isArray(list)) {
        for (const item of list) candidates.push(item?.value)
    }
    return candidates.some((value) => typeof value === 'string' && value.includes('ResizeObserver loop'))
}

let isInitialized = false

/**
 * Initializes PostHog analytics and session replay on the client.
 * Safe to call multiple times (idempotent) and safe when no key is configured.
 */
export function initPostHog(): void {
    if (typeof window === 'undefined' || isInitialized) return
    const key = getPostHogKey()
    if (!key) {
        return
    }

    const host = getPostHogHost()
    const allowed = readConsent() === 'yes'

    try {
        posthog.init(key, {
            api_host: host,
            ui_host: host.includes('eu') ? 'https://eu.posthog.com' : 'https://us.posthog.com',
            before_send: (event) => {
                if (event?.event === '$exception' && isResizeObserverLoopError(event.properties)) {
                    return null
                }
                return event
            },
            capture_pageview: false, // Handled explicitly via Next.js router events
            capture_pageleave: allowed,
            autocapture: allowed,
            person_profiles: 'identified_only',
            persistence: allowed ? 'localStorage+cookie' : 'memory',
            opt_out_capturing_by_default: !allowed,
            disable_session_recording: !allowed,
            session_recording: allowed
                ? {
                      maskAllInputs: false,
                      maskInputOptions: {
                          password: true,
                      },
                  }
                : undefined,
            loaded: (ph) => {
                isInitialized = true
                if (typeof window !== 'undefined') {
                    ;(window as any).posthog = ph
                }
                if (!allowed) {
                    ph.opt_out_capturing()
                }
            },
        })

        if (typeof window !== 'undefined') {
            ;(window as any).posthog = posthog
        }
    } catch (err) {
        console.warn('[PostHog] Init error:', err)
    }
}

/** Turn product analytics on or off after the visitor answers the banner. */
export function applyAnalyticsConsent(accepted: boolean): void {
    if (typeof window === 'undefined') return
    try {
        if (accepted) {
            posthog.set_config({
                persistence: 'localStorage+cookie',
                autocapture: true,
                capture_pageleave: true,
                disable_session_recording: false,
            })
            posthog.opt_in_capturing()
            posthog.startSessionRecording?.()
        } else {
            posthog.stopSessionRecording?.()
            posthog.opt_out_capturing()
            posthog.set_config({
                persistence: 'memory',
                autocapture: false,
                capture_pageleave: false,
                disable_session_recording: true,
            })
        }
    } catch {
        // Fail silent
    }
}

export function trackPageView(url?: string): void {
    if (typeof window === 'undefined') return
    if (readConsent() !== 'yes') return
    try {
        posthog.capture('$pageview', {
            $current_url: url || window.location.href,
        })
    } catch {
        // Fail silent
    }
}

/**
 * Identify authenticated user and associate profile traits.
 */
export function identifyUser(userId: string, traits?: Record<string, any>): void {
    if (typeof window === 'undefined' || !userId) return
    if (readConsent() !== 'yes') return
    try {
        posthog.identify(userId, traits)
    } catch {
        // Fail silent
    }
}

/**
 * Reset PostHog user identity on logout.
 */
export function resetUser(): void {
    if (typeof window === 'undefined') return
    try {
        posthog.reset()
    } catch {
        // Fail silent
    }
}

/**
 * Track custom product events (e.g. AI chats, tool executions, window actions).
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (typeof window === 'undefined') return
    if (readConsent() !== 'yes') return
    try {
        posthog.capture(eventName, properties)
    } catch {
        // Fail silent
    }
}

export { posthog }
