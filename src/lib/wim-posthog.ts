import posthog from 'posthog-js'

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

    try {
        posthog.init(key, {
            api_host: host,
            ui_host: host.includes('eu') ? 'https://eu.posthog.com' : 'https://us.posthog.com',
            capture_pageview: false, // Handled explicitly via Next.js router events
            capture_pageleave: true,
            autocapture: true,
            person_profiles: 'always',
            session_recording: {
                maskAllInputs: false,
                maskInputOptions: {
                    password: true,
                },
            },
            loaded: (ph) => {
                isInitialized = true
                if (typeof window !== 'undefined') {
                    ;(window as any).posthog = ph
                }
                console.info('[PostHog] Initialized successfully with host:', host)
            },
        })

        if (typeof window !== 'undefined') {
            ;(window as any).posthog = posthog
        }
    } catch (err) {
        console.warn('[PostHog] Init error:', err)
    }
}

/**
 * Safely track pageview on Next.js route change.
 */
export function trackPageView(url?: string): void {
    if (typeof window === 'undefined') return
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
    try {
        posthog.capture(eventName, properties)
    } catch {
        // Fail silent
    }
}

export { posthog }
