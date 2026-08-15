export const runtime = 'edge'

import { generateWithGateway } from 'lib/bots/ai-gateway'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { getClientIp, readJsonObject } from 'lib/bots/request-validation'
import { buildRepairUiPrompt, extractRepairedReactSource, REPAIR_UI_SYSTEM } from '../../lib/ai/repair-ui'

const MAX_SOURCE = 24_000
const MAX_ERROR = 800

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
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
    const limit = checkRateLimit(`repair-ui:${ip}`, 30, 60 * 60 * 1000)
    if (!limit.allowed) {
        return json({ ok: false, error: 'Too many repair attempts' }, 429)
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
