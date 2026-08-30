import posthog from 'posthog-js'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let isInitialized = false

/**
 * Initializes PostHog analytics and session replay on the client.
 * Safe to call multiple times (idempotent) and safe when no key is configured.
 */
export function initPostHog(): void {
    if (typeof window === 'undefined' || isInitialized) return
    if (!POSTHOG_KEY) {
        return
    }

    try {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            capture_pageview: false, // Handled explicitly via Next.js router events
            capture_pageleave: true,
            autocapture: true,
            session_recording: {
                maskAllInputs: false,
                maskInputOptions: {
                    password: true,
                },
            },
            loaded: () => {
                isInitialized = true
            },
        })
    } catch (err) {
        console.warn('[PostHog] Init error:', err)
    }
}

/**
 * Safely track pageview on Next.js route change.
 */
export function trackPageView(url?: string): void {
    if (typeof window === 'undefined' || !POSTHOG_KEY) return
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
    if (typeof window === 'undefined' || !POSTHOG_KEY || !userId) return
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
    if (typeof window === 'undefined' || !POSTHOG_KEY) return
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
    if (typeof window === 'undefined' || !POSTHOG_KEY) return
    try {
        posthog.capture(eventName, properties)
    } catch {
        // Fail silent
    }
}

export { posthog }
