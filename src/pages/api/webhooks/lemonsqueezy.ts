import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyLemonSqueezySignature } from '../../../lib/wim-billing'
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin'

// Disable body parsing so we can verify raw HMAC signature
export const config = {
    api: {
        bodyParser: false,
    },
}

async function getRawBody(req: NextApiRequest): Promise<string> {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    return Buffer.concat(chunks).toString('utf8')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const rawBody = await getRawBody(req)
        const signature = (req.headers['x-signature'] as string) || ''
        const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || ''

        // In production, signature verification is strictly enforced
        if (webhookSecret) {
            const isValid = verifyLemonSqueezySignature(rawBody, signature, webhookSecret)
            if (!isValid) {
                console.warn('[LemonSqueezy Webhook] Invalid signature')
                return res.status(401).json({ error: 'Invalid webhook signature' })
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
            return res.status(200).json({ received: true, note: 'No user_id found' })
        }

        const supabase = getSupabaseAdmin()

        if (eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'subscription_resumed') {
            const status = dataAttributes?.status || 'active'
            const currentPeriodEnd = dataAttributes?.renews_at || dataAttributes?.ends_at
            const subscriptionId = String(payload?.data?.id || '')
            const customerId = String(dataAttributes?.customer_id || '')

            // 1. Upgrade user profile to 'pro'
            if (status === 'active' || status === 'on_trial') {
                await supabase
                    .from('profiles')
                    .update({ role: 'pro', updated_at: new Date().toISOString() })
                    .eq('id', userId)

                // 2. Save subscription details
                await supabase.from('subscriptions').upsert(
                    {
                        user_id: userId,
                        subscription_id: subscriptionId,
                        customer_id: customerId,
                        status: status,
                        plan: 'pro',
                        current_period_end: currentPeriodEnd,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id' }
                )
            }
        } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
            // Downgrade to standard member
            await supabase
                .from('profiles')
                .update({ role: 'member', updated_at: new Date().toISOString() })
                .eq('id', userId)

            await supabase
                .from('subscriptions')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('user_id', userId)
        }

        return res.status(200).json({ success: true, event: eventName })
    } catch (err: any) {
        console.error('[LemonSqueezy Webhook Error]:', err)
        return res.status(500).json({ error: err?.message || 'Webhook processing failed' })
    }
}
