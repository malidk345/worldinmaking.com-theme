import { useState, useEffect } from 'react'
import { chatAuthHeadersFresh } from './chat-remote'

export interface TokenQuotaSnapshot {
    subject: string
    tier: 'guest' | 'member' | 'pro' | 'dev'
    usedTokens: number
    limitTokens: number
    remainingTokens: number
    percentage: number
    allowed: boolean
    resetAtUtc: string
}

export const TOKEN_QUOTA_UPDATED_EVENT = 'wimTokenQuotaUpdated'

const CACHE_KEY = 'wim_token_quota_cache_v1'

export function getCachedTokenQuota(): TokenQuotaSnapshot | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(CACHE_KEY)
        if (raw) return JSON.parse(raw)
    } catch {
        /* ignore */
    }
    return null
}

export function updateCachedTokenQuota(snapshot: TokenQuotaSnapshot): void {
    if (typeof window === 'undefined' || !snapshot) return
    try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
        window.dispatchEvent(new CustomEvent(TOKEN_QUOTA_UPDATED_EVENT, { detail: snapshot }))
    } catch {
        /* ignore */
    }
}

export async function fetchTokenQuota(): Promise<TokenQuotaSnapshot | null> {
    if (typeof window === 'undefined') return null
    try {
        const headers = await chatAuthHeadersFresh()
        const res = await fetch('/api/chat-quota', { headers })
        if (res.ok) {
            const data = (await res.json()) as TokenQuotaSnapshot
            updateCachedTokenQuota(data)
            return data
        }
    } catch {
        /* silent fallback */
    }
    return getCachedTokenQuota()
}

export function useTokenQuota() {
    const [quota, setQuota] = useState<TokenQuotaSnapshot | null>(getCachedTokenQuota)

    useEffect(() => {
        let mounted = true
        fetchTokenQuota().then((data) => {
            if (mounted && data) setQuota(data)
        })

        const handleUpdate = (e: Event) => {
            const customEv = e as CustomEvent<TokenQuotaSnapshot>
            if (customEv.detail) {
                setQuota(customEv.detail)
            }
        }

        window.addEventListener(TOKEN_QUOTA_UPDATED_EVENT, handleUpdate)
        return () => {
            mounted = false
            window.removeEventListener(TOKEN_QUOTA_UPDATED_EVENT, handleUpdate)
        }
    }, [])

    return { quota, refresh: fetchTokenQuota }
}