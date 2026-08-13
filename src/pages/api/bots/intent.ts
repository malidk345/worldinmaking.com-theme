export const config = { runtime: 'edge' }


import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { getClientIp, readJsonObject } from 'lib/bots/request-validation'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { classifyIntent } from 'lib/bots/intent-router'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    const env = getRuntimeEnv()
    const parsed = await readJsonObject(req, 16 * 1024)
    if (!parsed.ok) return json({ error: parsed.error }, parsed.status)
    const { question } = parsed.body

    if (!question || typeof question !== 'string' || !question.trim()) {
        return json({ error: 'question required' }, 400)
    }
    const clientIp = getClientIp(req)
    const rate = checkRateLimit(`intent:${clientIp}`, 30, 60 * 60 * 1000)
    if (!rate.allowed) return json({ error: 'Rate limited', retryAfterSec: rate.retryAfterSec }, 429)
    const boundedQuestion = question.trim().slice(0, 8000)

    const result = await classifyIntent(boundedQuestion, env)
    return json({ ...result })
}
