export const runtime = 'edge'

import { supabaseRest } from '../../../lib/bots/supabase-edge'
import { envFrom, getRuntimeEnv } from '../../../lib/bots/runtime-env'
import { subscriptionEntitlement, verifyLemonSqueezySignature } from '../../../lib/wim-billing'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

const SUBSCRIPTION_EVENTS = new Set([
    'subscription_created',
    'subscription_updated',
    'subscription_resumed',
    'subscription_unpaused',
    'subscription_paused',
    'subscription_cancelled',
    'subscription_expired',
    'subscription_payment_success',
    'subscription_payment_failed',
    'subscription_payment_recovered',
])

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    try {
        const rawBody = await req.text()
        const signature = req.headers.get('x-signature') || ''
        const env = getRuntimeEnv()
        const webhookSecret = envFrom(env, 'LEMON_SQUEEZY_WEBHOOK_SECRET')

        if (!webhookSecret) {
            console.error('[LemonSqueezy Webhook] LEMON_SQUEEZY_WEBHOOK_SECRET is not set')
            return json({ error: 'Webhook secret is not configured' }, 500)
        }

        const isValid = await verifyLemonSqueezySignature(rawBody, signature, webhookSecret)
        if (!isValid) {
            console.warn('[LemonSqueezy Webhook] Invalid signature')
            return json({ error: 'Invalid webhook signature' }, 401)
        }

        const payload = JSON.parse(rawBody)
        const eventName = payload?.meta?.event_name as string
        const customData = payload?.meta?.custom_data as Record<string, any> | undefined
        const dataAttributes = payload?.data?.attributes || {}
        const userId = String(customData?.user_id || dataAttributes?.user_id || '').trim()

        console.info(`[LemonSqueezy Webhook] Received event: ${eventName} for user: ${userId || 'unknown'}`)

        if (!SUBSCRIPTION_EVENTS.has(eventName)) {
            return json({ received: true, event: eventName, note: 'ignored' }, 200)
        }

        if (!userId) {
            console.warn('[LemonSqueezy Webhook] Missing user_id in custom_data')
            return json({ received: true, note: 'No user_id found' }, 200)
        }

        const status = String(dataAttributes?.status || 'active')
        const currentPeriodEnd = dataAttributes?.renews_at || dataAttributes?.ends_at || null
        const subscriptionId = String(payload?.data?.id || '')
        const customerId = String(dataAttributes?.customer_id || '')
        const variantId = dataAttributes?.variant_id != null ? String(dataAttributes.variant_id) : null
        const interval = dataAttributes?.variant_id
            ? dataAttributes?.first_subscription_item?.interval || null
            : null
        const role = subscriptionEntitlement(status, currentPeriodEnd)

        const profilePatch = await supabaseRest(`profiles?id=eq.${encodeURIComponent(userId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ role, updated_at: new Date().toISOString() }),
            env,
        })
        if (!profilePatch.ok) {
            console.error('[LemonSqueezy Webhook] profile patch failed', profilePatch.detail || profilePatch.error)
            return json({ error: 'Failed to update profile entitlement' }, 502)
        }

        const subscriptionRow = {
            user_id: userId,
            subscription_id: subscriptionId || null,
            customer_id: customerId || null,
            variant_id: variantId,
            status,
            plan: role === 'pro' ? 'pro' : 'free',
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
        }

        const upsert = await supabaseRest('subscriptions?on_conflict=user_id', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(subscriptionRow),
            env,
        })
        if (!upsert.ok) {
            console.error('[LemonSqueezy Webhook] subscription upsert failed', upsert.detail || upsert.error)
            return json({ error: 'Failed to persist subscription' }, 502)
        }

        return json({ success: true, event: eventName, role, interval: interval || undefined }, 200)
    } catch (err: any) {
        console.error('[LemonSqueezy Webhook Error]:', err)
        return json({ error: err?.message || 'Webhook processing failed' }, 500)
    }
}
