/**
 * WorldInMaking Billing & Subscription System
 * Powered by Lemon Squeezy (Merchant of Record).
 */

import { envFrom, getRuntimeEnv, type EnvStore } from './bots/runtime-env'

export type SubscriptionPlan = 'free' | 'pro' | 'patron'

export type SubscriptionRecord = {
    id: string
    userId: string
    subscriptionId?: string
    customerId?: string
    orderId?: string
    variantId?: string
    status: 'active' | 'on_trial' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired' | 'free'
    plan: SubscriptionPlan
    interval?: 'month' | 'year'
    currentPeriodEnd?: string
    createdAt: string
    updatedAt: string
}

export const BILLING_PLANS = {
    free: {
        id: 'free',
        name: 'desk',
        priceMonthlyUsd: 0,
        hourlyChatLimit: 15,
        dailyChatLimit: 30,
        features: [
            'the OS: notebooks, forum, WIM AI in a window',
            'standard daily inquiry budget',
            'fast models for ordinary questions',
            'published pages and public threads',
        ],
    },
    pro: {
        id: 'pro',
        name: 'study',
        priceMonthlyUsd: 9.99,
        priceYearlyUsd: 99.99,
        hourlyChatLimit: 60,
        dailyChatLimit: 300,
        features: [
            'deeper models when a question needs to sit',
            'a larger daily inquiry budget',
            'panel debates — several philosophers at once',
            'memory that follows you across notebooks',
            'more room for charts, mermaid, and live sandboxes',
        ],
    },
}

/** Test/live launch coupon from Lemon Squeezy. Duration `once` = first invoice only. */
export const BILLING_DISCOUNT = {
    code: 'WIM25',
    percent: 25,
    duration: 'once' as const,
}

export function discountedUsd(priceUsd: number, percent = BILLING_DISCOUNT.percent): number {
    return Math.round(priceUsd * (100 - percent)) / 100
}

const PRO_STATUSES = new Set(['active', 'on_trial', 'paused', 'past_due'])

/** Lemon Squeezy subscription status → site role. Cancelled stays Pro until period end. */
export function subscriptionEntitlement(
    status?: string | null,
    periodEnd?: string | null
): 'pro' | 'member' {
    const normalized = String(status || '').toLowerCase()
    if (PRO_STATUSES.has(normalized)) return 'pro'
    if (normalized === 'cancelled' && periodEnd && Date.parse(periodEnd) > Date.now()) return 'pro'
    return 'member'
}

/** Check if current user is subscribed to Pro (or is admin/moderator) */
export function isUserPro(user?: { email?: string; role?: { type?: string } | string; profile?: { role?: string | null }; app_metadata?: { plan?: string } } | null): boolean {
    if (!user) return false
    const role = typeof user.role === 'object' ? user.role?.type : user.role
    const profileRole = user.profile?.role
    const metaPlan = user.app_metadata?.plan
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    const isAdminEmail = !!user.email && adminEmails.includes(user.email.toLowerCase())
    return (
        isAdminEmail ||
        role === 'pro' ||
        role === 'admin' ||
        role === 'moderator' ||
        profileRole === 'pro' ||
        profileRole === 'admin' ||
        profileRole === 'moderator' ||
        metaPlan === 'pro'
    )
}

function hexToBytes(hex: string): Uint8Array | null {
    const clean = hex.trim()
    if (!clean || clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) return null
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
    }
    return bytes
}

/** Verify Lemon Squeezy HMAC SHA256 webhook signature (Edge + Node). */
export async function verifyLemonSqueezySignature(
    rawBody: string,
    signature: string,
    secret: string
): Promise<boolean> {
    if (!rawBody || !signature || !secret) return false
    try {
        const bytes = hexToBytes(signature)
        if (!bytes) return false
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        )
        return await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(rawBody))
    } catch {
        return false
    }
}

export function getLemonSqueezyConfig(env?: EnvStore) {
    const store = env ?? getRuntimeEnv()
    return {
        apiKey: envFrom(store, 'LEMON_SQUEEZY_API_KEY'),
        storeId: envFrom(store, 'LEMON_SQUEEZY_STORE_ID'),
        webhookSecret: envFrom(store, 'LEMON_SQUEEZY_WEBHOOK_SECRET'),
        monthlyVariantId: envFrom(store, 'LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY'),
        yearlyVariantId: envFrom(store, 'LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY'),
        discountCode: envFrom(store, 'LEMON_SQUEEZY_DISCOUNT_CODE') || BILLING_DISCOUNT.code,
        appUrl: envFrom(store, 'NEXT_PUBLIC_APP_URL') || 'https://worldinmaking.com',
    }
}

export function lemonSqueezyMissingConfig(env?: EnvStore, interval?: 'month' | 'year'): string[] {
    const cfg = getLemonSqueezyConfig(env)
    const missing: string[] = []
    if (!cfg.apiKey) missing.push('LEMON_SQUEEZY_API_KEY')
    if (!cfg.storeId) missing.push('LEMON_SQUEEZY_STORE_ID')
    if (interval === 'year') {
        if (!cfg.yearlyVariantId) missing.push('LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY')
    } else if (interval === 'month') {
        if (!cfg.monthlyVariantId) missing.push('LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY')
    } else if (!cfg.monthlyVariantId && !cfg.yearlyVariantId) {
        missing.push('LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY')
        missing.push('LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY')
    }
    return missing
}

/** Create Lemon Squeezy Checkout URL */
export async function createCheckoutSession(params: {
    userId: string
    userEmail: string
    userName?: string
    planInterval?: 'month' | 'year'
    redirectUrl?: string
    env?: EnvStore
}): Promise<{ ok: boolean; checkoutUrl?: string; error?: string }> {
    const cfg = getLemonSqueezyConfig(params.env)
    const planInterval = params.planInterval === 'year' ? 'year' : 'month'
    const missing = lemonSqueezyMissingConfig(params.env, planInterval)
    if (missing.length) {
        return {
            ok: false,
            error: `Lemon Squeezy is not configured (${missing.join(', ')}). Add the keys in .env.local and Cloudflare Pages, then run pnpm billing:setup.`,
        }
    }

    const variantId = planInterval === 'year' ? cfg.yearlyVariantId : cfg.monthlyVariantId
    if (!variantId) {
        return {
            ok: false,
            error:
                planInterval === 'year'
                    ? 'Yearly Lemon Squeezy variant is not configured.'
                    : 'Monthly Lemon Squeezy variant is not configured.',
        }
    }

    try {
        const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: {
                Accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                Authorization: `Bearer ${cfg.apiKey}`,
            },
            body: JSON.stringify({
                data: {
                    type: 'checkouts',
                    attributes: {
                        checkout_data: {
                            email: params.userEmail,
                            name: params.userName || undefined,
                            custom: {
                                user_id: String(params.userId),
                            },
                            ...(cfg.discountCode && cfg.discountCode !== 'none'
                                ? { discount_code: cfg.discountCode }
                                : {}),
                        },
                        checkout_options: {
                            embed: false,
                            media: false,
                            logo: true,
                        },
                        product_options: {
                            redirect_url:
                                params.redirectUrl || `${cfg.appUrl.replace(/\/$/, '')}/profile?upgraded=true`,
                            enabled_variants: [Number(variantId) || variantId],
                        },
                    },
                    relationships: {
                        store: {
                            data: {
                                type: 'stores',
                                id: String(cfg.storeId),
                            },
                        },
                        variant: {
                            data: {
                                type: 'variants',
                                id: String(variantId),
                            },
                        },
                    },
                },
            }),
        })

        if (!res.ok) {
            const errData = await res.json().catch(() => null)
            const msg = errData?.errors?.[0]?.detail || `Lemon Squeezy API error: ${res.status}`
            return { ok: false, error: msg }
        }

        const data = await res.json()
        const checkoutUrl = data?.data?.attributes?.url
        if (!checkoutUrl) {
            return { ok: false, error: 'Lemon Squeezy did not return a checkout URL.' }
        }
        return { ok: true, checkoutUrl }
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Failed to initialize checkout session' }
    }
}

export function lemonCancelSubscriptionBody(subscriptionId: string) {
    const id = String(subscriptionId)
    return {
        data: {
            type: 'subscriptions',
            id,
            attributes: { cancelled: true },
        },
    }
}

export async function cancelLemonSubscription(
    subscriptionId: string,
    env?: EnvStore
): Promise<{ ok: boolean; status?: string; endsAt?: string | null; error?: string }> {
    const cfg = getLemonSqueezyConfig(env)
    if (!cfg.apiKey) return { ok: false, error: 'Lemon Squeezy API key is not configured.' }
    const id = String(subscriptionId || '').trim()
    if (!id) return { ok: false, error: 'No Lemon Squeezy subscription id.' }

    try {
        const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
                Accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                Authorization: `Bearer ${cfg.apiKey}`,
            },
            body: JSON.stringify(lemonCancelSubscriptionBody(id)),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
            const msg = data?.errors?.[0]?.detail || `Lemon Squeezy API error: ${res.status}`
            return { ok: false, error: msg }
        }
        const attrs = data?.data?.attributes || {}
        return {
            ok: true,
            status: attrs.status || 'cancelled',
            endsAt: attrs.ends_at || attrs.renews_at || null,
        }
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Failed to cancel subscription' }
    }
}

export async function getLemonCustomerPortalUrl(
    subscriptionId: string,
    env?: EnvStore
): Promise<string | null> {
    const cfg = getLemonSqueezyConfig(env)
    const id = String(subscriptionId || '').trim()
    if (!cfg.apiKey || !id) return null
    try {
        const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(id)}`, {
            headers: {
                Accept: 'application/vnd.api+json',
                Authorization: `Bearer ${cfg.apiKey}`,
            },
        })
        if (!res.ok) return null
        const data = await res.json().catch(() => null)
        const urls = data?.data?.attributes?.urls || {}
        return urls.customer_portal || urls.update_payment_method || null
    } catch {
        return null
    }
}
