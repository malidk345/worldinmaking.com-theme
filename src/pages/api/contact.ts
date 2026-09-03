export const runtime = 'edge'

import { supabaseAdmin } from '../../../lib/supabase-admin'
import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rate = await checkRateLimitDurable(`contact:${ip}`, 12, 60 * 60 * 1000, getRuntimeEnv(), {
        failClosed: true,
    })
    if (rate.source === 'unavailable') {
        return json(
            {
                code: 'RATE_LIMIT_UNAVAILABLE',
                error: 'Rate limit store temporarily unavailable. Please try again.',
                retryAfterSec: rate.retryAfterSec,
            },
            503,
            buildRateLimitHeaders(rate)
        )
    }
    if (!rate.allowed) {
        return json(
            {
                error: 'Too many messages sent. Please try again later.',
                code: 'RATE_LIMITED',
                retryAfterSec: rate.retryAfterSec,
            },
            429,
            buildRateLimitHeaders(rate)
        )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
        return json({ error: 'Invalid JSON payload' }, 400)
    }

    const name = String(body.name || '').trim().slice(0, 150)
    const email = String(body.email || '').trim().slice(0, 255)
    const message = String(body.message || '').trim().slice(0, 5000)
    const topic = String(body.topic || '').trim().slice(0, 100)

    if (!name) return json({ error: 'Name is required' }, 400)
    if (!email || !email.includes('@') || !email.includes('.')) {
        return json({ error: 'A valid email address is required' }, 400)
    }
    if (!message) return json({ error: 'Message cannot be empty' }, 400)

    const formattedMessage = topic && topic !== 'General' ? `[${topic}]\n\n${message}` : message

    const { error: insertError } = await supabaseAdmin.from('contact_messages').insert({
        name,
        email,
        message: formattedMessage,
        is_read: false,
        created_at: new Date().toISOString(),
    })

    if (insertError) {
        return json({ error: insertError.message || 'Failed to send message' }, 500)
    }

    return json({ success: true, message: 'Your message has been sent successfully!' })
}
