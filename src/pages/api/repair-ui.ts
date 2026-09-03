export const runtime = 'edge'

import { generateWithGateway } from 'lib/bots/ai-gateway'
import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getClientIp, readJsonObject } from 'lib/bots/request-validation'
import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { buildRepairUiPrompt, extractRepairedReactSource, REPAIR_UI_SYSTEM } from '../../lib/ai/repair-ui'

const MAX_SOURCE = 24_000
const MAX_ERROR = 800

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

    const parsed = await readJsonObject(req, 64_000)
    if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status)

    const source = typeof parsed.body.source === 'string' ? parsed.body.source : ''
    const error = typeof parsed.body.error === 'string' ? parsed.body.error : ''
    if (source.trim().length < 20) return json({ ok: false, error: 'Source is required' }, 400)
    if (source.length > MAX_SOURCE) return json({ ok: false, error: 'Source too long' }, 400)

    const ip = getClientIp(req)
    const env = getRuntimeEnv()
    const aggregate = await checkRateLimitDurable(`llm:${ip}`, 60, 60 * 60 * 1000, env, { failClosed: true })
    const limit = await checkRateLimitDurable(`repair-ui:${ip}`, 30, 60 * 60 * 1000, env, { failClosed: true })
    if (aggregate.source === 'unavailable' || limit.source === 'unavailable') {
        return json(
            {
                ok: false,
                code: 'RATE_LIMIT_UNAVAILABLE',
                error: 'Rate limit store temporarily unavailable. Please try again.',
                retryAfterSec: Math.max(aggregate.retryAfterSec || 0, limit.retryAfterSec || 0) || 30,
            },
            503,
            buildRateLimitHeaders(limit.source === 'unavailable' ? limit : aggregate)
        )
    }
    if (!aggregate.allowed || !limit.allowed) {
        const hit = !limit.allowed ? limit : aggregate
        return json(
            {
                ok: false,
                code: 'RATE_LIMITED',
                error: 'Too many repair attempts',
                retryAfterSec: hit.retryAfterSec,
            },
            429,
            buildRateLimitHeaders(hit)
        )
    }

    const result = await generateWithGateway({
        systemPrompt: REPAIR_UI_SYSTEM,
        userPrompt: buildRepairUiPrompt(source, error.slice(0, MAX_ERROR)),
        taskType: 'autonomous_assistant',
        temperature: 0.1,
        thinkingDepth: 'brief',
        botName: 'repair-ui',
    })

    if (!result.ok) {
        return json({ ok: false, error: 'Repair model unavailable' }, 503)
    }

    const content = extractRepairedReactSource(result.text)
    if (!content) return json({ ok: false, error: 'Repair did not return React' }, 422)

    return json({ ok: true, content })
}
