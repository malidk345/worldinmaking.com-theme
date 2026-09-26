import { useState, useEffect, useRef } from 'react'
import { chatAuthHeadersFresh } from './chat-remote'
import { getAuthUserId, WIM_IDENTITY_EVENT } from './wim-identity'
import { shouldBlankQuotaOnIdentity } from './chat-session'

export interface TokenQuotaSnapshot {
    subject: string
    tier: 'guest' | 'member' | 'pro' | 'dev'
    usedTokens: number
    limitTokens: number
    remainingTokens: number
    percentage: number
    allowed: boolean
    resetAtUtc: string
    /** True when /api/chat-quota could not be verified (fail closed). */
    unavailable?: boolean
}

export const TOKEN_QUOTA_UPDATED_EVENT = 'wimTokenQuotaUpdated'

/** Fail closed if the first quota fetch never settles (hung network / auth). */
export const TOKEN_QUOTA_FETCH_TIMEOUT_MS = 8_000

const CACHE_KEY = 'wim_token_quota_cache_v1'

function unavailableQuotaSnapshot(): TokenQuotaSnapshot {
    return {
        subject: 'unknown',
        tier: 'guest',
        usedTokens: 0,
        limitTokens: 0,
        remainingTokens: 0,
        percentage: 100,
        allowed: false,
        resetAtUtc: new Date().toISOString(),
        unavailable: true,
    }
}

function clearCachedTokenQuota(): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.removeItem(CACHE_KEY)
    } catch {
        /* ignore */
    }
}

/** Drop previous owner's quota cache on logout / account switch. */
export function syncTokenQuotaCacheForIdentity(): void {
    clearCachedTokenQuota()
}

export function quotaOwnerKey(): string {
    return getAuthUserId() || 'guest'
}

if (typeof window !== 'undefined') {
    let rememberedQuotaOwner = quotaOwnerKey()
    window.addEventListener(WIM_IDENTITY_EVENT, () => {
        const next = quotaOwnerKey()
        if (shouldBlankQuotaOnIdentity(rememberedQuotaOwner, next)) {
            clearCachedTokenQuota()
        }
        rememberedQuotaOwner = next
        // Refetch in the background. Same-owner token refresh must not blank the snapshot.
        void fetchTokenQuota()
    })
}

export function getCachedTokenQuota(): TokenQuotaSnapshot | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(CACHE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw) as TokenQuotaSnapshot
            // Never revive a fail-closed marker from storage as a real quota.
            if (parsed?.unavailable) return null
            return parsed
        }
    } catch {
        /* ignore */
    }
    return null
}

export function updateCachedTokenQuota(snapshot: TokenQuotaSnapshot): void {
    if (typeof window === 'undefined' || !snapshot) return
    // Successful responses only — do not persist unavailable markers.
    if (snapshot.unavailable) {
        clearCachedTokenQuota()
        window.dispatchEvent(new CustomEvent(TOKEN_QUOTA_UPDATED_EVENT, { detail: snapshot }))
        return
    }
    try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
        window.dispatchEvent(new CustomEvent(TOKEN_QUOTA_UPDATED_EVENT, { detail: snapshot }))
    } catch {
        /* ignore */
    }
}

export async function fetchTokenQuota(): Promise<TokenQuotaSnapshot | null> {
    if (typeof window === 'undefined') return null

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), TOKEN_QUOTA_FETCH_TIMEOUT_MS)

    try {
        const headers = await chatAuthHeadersFresh()
        const res = await fetch('/api/chat-quota', { headers, signal: controller.signal })
        if (res.ok) {
            const data = (await res.json()) as TokenQuotaSnapshot
            updateCachedTokenQuota(data)
            return data
        }

        // Non-ok (incl. 503 QUOTA_UNAVAILABLE): fail closed — do not hide store
        // outage behind a stale allowed:true cache.
        try {
            await res.json() // drain; body may include { code: 'QUOTA_UNAVAILABLE' }
        } catch {
            /* ignore body parse */
        }
        const unavailable = unavailableQuotaSnapshot()
        clearCachedTokenQuota()
        window.dispatchEvent(new CustomEvent(TOKEN_QUOTA_UPDATED_EVENT, { detail: unavailable }))
        return unavailable
    } catch {
        // Network / abort / auth failure: prefer cache if present, else fail closed
        // so null never leaves the composer send-unlocked.
        const cached = getCachedTokenQuota()
        if (cached) return cached
        const unavailable = unavailableQuotaSnapshot()
        window.dispatchEvent(new CustomEvent(TOKEN_QUOTA_UPDATED_EVENT, { detail: unavailable }))
        return unavailable
    } finally {
        window.clearTimeout(timeoutId)
    }
}

export function useTokenQuota() {
    // Cold start with no cache → null until fetch settles (send stays fail-closed, no composer copy).
    const [quota, setQuota] = useState<TokenQuotaSnapshot | null>(getCachedTokenQuota)
    const ownerRef = useRef(quotaOwnerKey())

    useEffect(() => {
        let mounted = true

        fetchTokenQuota().then((data) => {
            if (mounted && data) setQuota(data)
        })

        // Belt-and-suspenders: if fetch hangs past abort (e.g. auth never resolves),
        // still fail closed so send does not stay unlocked forever.
        const hangId = window.setTimeout(() => {
            if (!mounted) return
            setQuota((current) => {
                if (current) return current
                const unavailable = unavailableQuotaSnapshot()
                window.dispatchEvent(
                    new CustomEvent(TOKEN_QUOTA_UPDATED_EVENT, { detail: unavailable })
                )
                return unavailable
            })
        }, TOKEN_QUOTA_FETCH_TIMEOUT_MS + 500)

        const handleUpdate = (e: Event) => {
            const customEv = e as CustomEvent<TokenQuotaSnapshot>
            if (customEv.detail) {
                setQuota(customEv.detail)
            }
        }

        const onIdentity = () => {
            const next = quotaOwnerKey()
            if (shouldBlankQuotaOnIdentity(ownerRef.current, next)) {
                clearCachedTokenQuota()
                setQuota(null)
            }
            ownerRef.current = next
            void fetchTokenQuota().then((data) => {
                if (mounted && data) setQuota(data)
            })
        }
        window.addEventListener(TOKEN_QUOTA_UPDATED_EVENT, handleUpdate)
        window.addEventListener(WIM_IDENTITY_EVENT, onIdentity)
        return () => {
            mounted = false
            window.clearTimeout(hangId)
            window.removeEventListener(TOKEN_QUOTA_UPDATED_EVENT, handleUpdate)
            window.removeEventListener(WIM_IDENTITY_EVENT, onIdentity)
        }
    }, [])

    return { quota, refresh: fetchTokenQuota }
}