/**
 * WorldInMaking Billing & Subscription System
 * Powered by Lemon Squeezy (Merchant of Record for individual creators / solo developers without a company).
 * Handles checkout creation, webhook signature verification, and plan entitlement checks.
 */

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
        name: 'Explorer (Free)',
        priceMonthlyUsd: 0,
        hourlyChatLimit: 15,
        dailyChatLimit: 30,
        features: [
            'Standard intelligence & fast response models',
            'Standard daily inquiry capacity',
            'Full notebook editor & desktop OS tools',
            'Community forum reading and discussions',
        ],
    },
    pro: {
        id: 'pro',
        name: 'Thinker (Pro)',
        priceMonthlyUsd: 9.99,
        priceYearlyUsd: 99.0,
        hourlyChatLimit: 60,
        dailyChatLimit: 300,
        features: [
            'Next-generation frontier reasoning & deep thinking models',
            'Expanded high-volume inquiry capacity',
            'Multi-mind philosophical debate & panel inquiries',
            'Persistent semantic memory across past notes & chats',
            'Deep notebook structural overhaul & inline margin notes',
            'Unlimited live React sandboxes, charts & Mermaid artifacts',
            'Pro Thinker profile badge & exclusive desktop themes',
        ],
    },
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

/** Verify Lemon Squeezy HMAC SHA256 Webhook Signature */
export function verifyLemonSqueezySignature(rawBody: string, signature: string, secret: string): boolean {
    if (!rawBody || !signature || !secret) return false
    try {
        const crypto = require('crypto')
        const hmac = crypto.createHmac('sha256', secret)
        const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8')
        const signatureBuffer = Buffer.from(signature, 'utf8')
        return digest.length === signatureBuffer.length && crypto.timingSafeEqual(digest, signatureBuffer)
    } catch {
        return false
    }
}

/** Create Lemon Squeezy Checkout URL for individual creator */
export async function createCheckoutSession(params: {
    userId: string
    userEmail: string
    userName?: string
    planInterval?: 'month' | 'year'
    redirectUrl?: string
}): Promise<{ ok: boolean; checkoutUrl?: string; error?: string; isTestMode?: boolean }> {
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID
    const monthlyVariantId = process.env.LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY
    const yearlyVariantId = process.env.LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY

    // Test / Sandbox Fallback when API keys are not yet configured in env
    if (!apiKey || !storeId) {
        const fallbackUrl = `/profile?billing_demo=true&plan=pro&interval=${params.planInterval || 'month'}`
        return {
            ok: true,
            checkoutUrl: fallbackUrl,
            isTestMode: true,
        }
    }

    const variantId = params.planInterval === 'year' ? (yearlyVariantId || monthlyVariantId) : monthlyVariantId
    if (!variantId) {
        return { ok: false, error: 'Lemon Squeezy Variant ID is not configured.' }
    }

    try {
        const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: {
                Accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                data: {
                    type: 'checkouts',
                    attributes: {
                        checkout_data: {
                            email: params.userEmail,
                            name: params.userName || undefined,
                            custom: {
                                user_id: params.userId,
                            },
                        },
                        product_options: {
                            redirect_url: params.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://worldinmaking.com'}/profile?upgraded=true`,
                        },
                    },
                    relationships: {
                        store: {
                            data: {
                                type: 'stores',
                                id: String(storeId),
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
            const errData = await res.json()
            const msg = errData?.errors?.[0]?.detail || `Lemon Squeezy API error: ${res.status}`
            return { ok: false, error: msg }
        }

        const data = await res.json()
        const checkoutUrl = data?.data?.attributes?.url
        return { ok: true, checkoutUrl }
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Failed to initialize checkout session' }
    }
}
