export const runtime = 'edge'

import { supabaseRest } from '../../../lib/bots/supabase-edge'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

async function verifyLemonSqueezySignatureEdge(rawBody: string, signature: string, secret: string): Promise<boolean> {
    if (!rawBody || !signature || !secret) return false
    try {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify', 'sign']
        )
        const hex = signature.trim()
        const bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
        }
        return await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(rawBody))
    } catch {
        return false
    }
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    try {
        const rawBody = await req.text()
        const signature = req.headers.get('x-signature') || ''
        const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || ''

        // In production, signature verification is strictly enforced
        if (webhookSecret) {
            const isValid = await verifyLemonSqueezySignatureEdge(rawBody, signature, webhookSecret)
            if (!isValid) {
                console.warn('[LemonSqueezy Webhook] Invalid signature')
                return json({ error: 'Invalid webhook signature' }, 401)
            }
        }

        const payload = JSON.parse(rawBody)
        const eventName = payload?.meta?.event_name as string
        const customData = payload?.meta?.custom_data as Record<string, any> | undefined
        const dataAttributes = payload?.data?.attributes
        const userId = customData?.user_id || dataAttributes?.user_id

        console.info(`[LemonSqueezy Webhook] Received event: ${eventName} for user: ${userId}`)

        if (!userId) {
            console.warn('[LemonSqueezy Webhook] Missing user_id in custom_data')
            return json({ received: true, note: 'No user_id found' }, 200)
        }

        if (eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'subscription_resumed') {
            const status = dataAttributes?.status || 'active'
            const currentPeriodEnd = dataAttributes?.renews_at || dataAttributes?.ends_at
            const subscriptionId = String(payload?.data?.id || '')
            const customerId = String(dataAttributes?.customer_id || '')

            // 1. Upgrade user profile to 'pro'
            if (status === 'active' || status === 'on_trial') {
                await supabaseRest(`profiles?id=eq.${userId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ role: 'pro', updated_at: new Date().toISOString() }),
                })

                // 2. Save subscription details
                await supabaseRest('subscriptions', {
                    method: 'POST',
                    headers: { Prefer: 'resolution=merge-duplicates' },
                    body: JSON.stringify({
                        user_id: userId,
                        subscription_id: subscriptionId,
                        customer_id: customerId,
                        status: status,
                        plan: 'pro',
                        current_period_end: currentPeriodEnd,
                        updated_at: new Date().toISOString(),
                    }),
                })
            }
        } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
            // Downgrade to standard member
            await supabaseRest(`profiles?id=eq.${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({ role: 'member', updated_at: new Date().toISOString() }),
            })

            await supabaseRest(`subscriptions?user_id=eq.${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() }),
            })
        }

        return json({ success: true, event: eventName }, 200)
    } catch (err: any) {
        console.error('[LemonSqueezy Webhook Error]:', err)
        return json({ error: err?.message || 'Webhook processing failed' }, 500)
    }
}
