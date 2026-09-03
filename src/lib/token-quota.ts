import { supabaseAdmin } from '../../lib/supabase-admin'

export const TOKEN_LIMITS = {
    guest: 50_000,
    member: 200_000,
    pro: 2_000_000,
    dev: 10_000_000,
} as const

export type UserTier = keyof typeof TOKEN_LIMITS

export interface TokenQuotaSnapshot {
    subject: string
    tier: UserTier
    usedTokens: number
    limitTokens: number
    remainingTokens: number
    percentage: number
    allowed: boolean
    resetAtUtc: string
}

// In-memory fallback bucket for rapid access and edge caching
const inMemoryUsage = new Map<string, { tokens: number; day: string }>()

export function estimateTokens(text: unknown): number {
    if (typeof text !== 'string') return 0
    const chars = text.trim().length
    if (chars === 0) return 0
    // Average of ~3.6 chars per token for multi-lingual / code text
    return Math.ceil(chars / 3.6)
}

export function getUtcDayString(): string {
    return new Date().toISOString().slice(0, 10)
}

export function getUtcMidnightString(): string {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() + 1)
    d.setUTCHours(0, 0, 0, 0)
    return d.toISOString()
}

export async function getTokenQuota(
    subject: string,
    tier: UserTier = 'guest'
): Promise<TokenQuotaSnapshot> {
    const day = getUtcDayString()
    const limit = TOKEN_LIMITS[tier] || TOKEN_LIMITS.guest
    const memKey = `${subject}:${day}`

    let used = 0
    const memEntry = inMemoryUsage.get(memKey)
    if (memEntry && memEntry.day === day) {
        used = memEntry.tokens
    } else {
        const { data, error } = await supabaseAdmin
            .from('wim_chat_token_usage')
            .select('tokens')
            .eq('subject', subject)
            .eq('day', day)
            .maybeSingle()
        if (error) throw error
        if (data && typeof data.tokens === 'number') {
            used = data.tokens
            inMemoryUsage.set(memKey, { tokens: used, day })
        }
    }

    const remaining = Math.max(0, limit - used)
    const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 1000) / 10) : 0

    return {
        subject,
        tier,
        usedTokens: used,
        limitTokens: limit,
        remainingTokens: remaining,
        percentage,
        allowed: used < limit,
        resetAtUtc: getUtcMidnightString(),
    }
}

export async function recordTokenUsage(
    subject: string,
    tokensConsumed: number,
    tier: UserTier = 'guest'
): Promise<TokenQuotaSnapshot> {
    const day = getUtcDayString()
    const limit = TOKEN_LIMITS[tier] || TOKEN_LIMITS.guest
    const memKey = `${subject}:${day}`

    const added = Math.max(1, Math.ceil(tokensConsumed))
    const current = inMemoryUsage.get(memKey)
    let newTotal = (current && current.day === day ? current.tokens : 0) + added
    inMemoryUsage.set(memKey, { tokens: newTotal, day })

    // Atomic PostgreSQL increment in Supabase
    try {
        const { data: rpcTotal, error: rpcError } = await supabaseAdmin.rpc(
            'increment_wim_chat_token_usage',
            {
                p_subject: subject,
                p_day: day,
                p_tokens: added,
            }
        )

        if (!rpcError && typeof rpcTotal === 'number') {
            newTotal = rpcTotal
            inMemoryUsage.set(memKey, { tokens: newTotal, day })
        } else {
            // Fallback to direct upsert if RPC is pending
            await supabaseAdmin
                .from('wim_chat_token_usage')
                .upsert(
                    { subject, day, tokens: newTotal, updated_at: new Date().toISOString() },
                    { onConflict: 'subject,day' }
                )
        }
    } catch {
        /* silent fallback to memory */
    }

    const remaining = Math.max(0, limit - newTotal)
    const percentage = limit > 0 ? Math.min(100, Math.round((newTotal / limit) * 1000) / 10) : 0

    return {
        subject,
        tier,
        usedTokens: newTotal,
        limitTokens: limit,
        remainingTokens: remaining,
        percentage,
        allowed: newTotal <= limit,
        resetAtUtc: getUtcMidnightString(),
    }
}

