import posthog from 'posthog-js'

const RAW_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
const RAW_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

function getCleanHost(host: string): string {
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
    const key = RAW_KEY.trim()
    if (!key) {
        return
    }

    const host = getCleanHost(RAW_HOST)

    try {
        posthog.init(key, {
            api_host: host,
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
                if (process.env.NODE_ENV !== 'production') {
                    console.info('[PostHog] Initialized successfully with host:', host)
                }
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
    if (typeof window === 'undefined' || !RAW_KEY) return
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
    if (typeof window === 'undefined' || !RAW_KEY || !userId) return
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
    if (typeof window === 'undefined' || !RAW_KEY) return
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
    if (typeof window === 'undefined' || !RAW_KEY) return
    try {
        posthog.capture(eventName, properties)
    } catch {
        // Fail silent
    }
}

export { posthog }
