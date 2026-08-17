/**
 * Invite a philosopher to comment on a notebook passage.
 * JSON only. Does not stream, open chat, or rewrite the document.
 */
export const runtime = 'edge'

import { generateWithGateway } from 'lib/bots/ai-gateway'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { getClientIp, readJsonObject } from 'lib/bots/request-validation'
import {
    MAX_INVITE_NOTEBOOK,
    MAX_INVITE_SELECTION,
    buildInviteCommentSystemPrompt,
    buildInviteCommentUserPrompt,
    cleanInviteCommentOutput,
    resolveInviteBot,
} from 'lib/bots/notebook-invite'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

    const parsed = await readJsonObject(req, 16 * 1024)
    if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status)

    const botId = typeof parsed.body.botId === 'string' ? parsed.body.botId.trim().toLowerCase() : ''
    const bot = resolveInviteBot(botId)
    if (!bot) return json({ ok: false, error: 'Unknown philosopher' }, 400)

    const selection =
        typeof parsed.body.selection === 'string' ? parsed.body.selection.slice(0, MAX_INVITE_SELECTION) : ''
    if (!selection.trim()) return json({ ok: false, error: 'A passage is required' }, 400)
    const notebook =
        typeof parsed.body.notebook === 'string' ? parsed.body.notebook.slice(0, MAX_INVITE_NOTEBOOK) : ''

    const ip = getClientIp(req)
    const aggregate = checkRateLimit(`llm:${ip}`, 60, 60 * 60 * 1000)
    const rl = checkRateLimit(`invite:${ip}`, 20, 60 * 60 * 1000)
    if (!aggregate.allowed || !rl.allowed) {
        const retryAfterSec = Math.max(aggregate.retryAfterSec, rl.retryAfterSec)
        return json({ ok: false, error: `Rate limit exceeded. Retry in ${retryAfterSec}s`, retryAfterSec }, 429)
    }

    const result = await generateWithGateway({
        systemPrompt: buildInviteCommentSystemPrompt(bot.id),
        userPrompt: buildInviteCommentUserPrompt({ selection, notebook }),
        taskType: 'dialectic_challenge',
        temperature: 0.7,
        thinkingDepth: 'brief',
        botName: bot.name,
    })

    if (!result.ok) return json({ ok: false, error: 'Philosopher is unreachable right now' }, 503)

    const text = cleanInviteCommentOutput(result.text)
    if (!text) return json({ ok: false, error: 'Empty comment' }, 422)

    return json({ ok: true, text, author: bot.displayName, botId: bot.id })
}
