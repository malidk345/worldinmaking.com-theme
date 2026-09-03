/**
 * Invite a philosopher to comment on a notebook passage.
 * JSON only. Does not stream, open chat, or rewrite the document.
 */
export const runtime = 'edge'

import { generateWithGateway } from 'lib/bots/ai-gateway'
import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { getClientIp, readJsonObject } from 'lib/bots/request-validation'
import {
    MAX_INVITE_NOTEBOOK,
    MAX_INVITE_SELECTION,
    buildInviteCommentSystemPrompt,
    buildInviteCommentUserPrompt,
    parseInviteNotePayload,
    pickTwoInviteBots,
    resolveInviteBot,
} from 'lib/bots/notebook-invite'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

    const parsed = await readJsonObject(req, 16 * 1024)
    if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status)

    const requestedIds = Array.isArray(parsed.body.botIds)
        ? parsed.body.botIds.filter((value): value is string => typeof value === 'string')
        : typeof parsed.body.botId === 'string'
          ? [parsed.body.botId]
          : parsed.body.duo === true
            ? pickTwoInviteBots()
            : []
    const bots = requestedIds.map((id) => resolveInviteBot(id.trim().toLowerCase())).filter(Boolean)
    if (!bots.length) return json({ ok: false, error: 'Unknown philosopher' }, 400)

    const selection =
        typeof parsed.body.selection === 'string' ? parsed.body.selection.slice(0, MAX_INVITE_SELECTION) : ''
    if (!selection.trim()) return json({ ok: false, error: 'A passage is required' }, 400)
    const notebook =
        typeof parsed.body.notebook === 'string' ? parsed.body.notebook.slice(0, MAX_INVITE_NOTEBOOK) : ''

    const env = getRuntimeEnv()
    const ip = getClientIp(req)
    const aggregate = await checkRateLimitDurable(`llm:${ip}`, 60, 60 * 60 * 1000, env, { failClosed: true })
    const rl = await checkRateLimitDurable(`invite:${ip}`, 20, 60 * 60 * 1000, env, { failClosed: true })
    if (aggregate.source === 'unavailable' || rl.source === 'unavailable') {
        const blocked = aggregate.source === 'unavailable' ? aggregate : rl
        return json(
            {
                ok: false,
                code: 'RATE_LIMIT_UNAVAILABLE',
                error: 'Rate limit store temporarily unavailable. Please try again.',
                retryAfterSec: blocked.retryAfterSec,
            },
            503,
            buildRateLimitHeaders(blocked)
        )
    }
    if (!aggregate.allowed || !rl.allowed) {
        const retryAfterSec = Math.max(aggregate.retryAfterSec, rl.retryAfterSec)
        return json(
            { ok: false, error: `Rate limit exceeded. Retry in ${retryAfterSec}s`, retryAfterSec },
            429,
            buildRateLimitHeaders(!aggregate.allowed ? aggregate : rl)
        )
    }

    const notes = (
        await Promise.all(
            bots.map(async (bot) => {
                if (!bot) return null
                const result = await generateWithGateway({
                    systemPrompt: buildInviteCommentSystemPrompt(bot.id),
                    userPrompt: buildInviteCommentUserPrompt({ selection, notebook }),
                    taskType: 'autonomous_assistant',
                    temperature: 0.75,
                    thinkingDepth: 'brief',
                    botName: bot.name,
                })
                if (!result.ok) return null
                const payload = parseInviteNotePayload(result.text)
                if (!payload.text) return null
                return {
                    botId: bot.id,
                    author: bot.displayName,
                    phrase: payload.phrase,
                    text: payload.text,
                    intent: payload.intent,
                    scope: payload.scope,
                    ...(payload.suggestion ? { suggestion: payload.suggestion } : {}),
                }
            })
        )
    ).filter(Boolean)

    if (!notes.length) return json({ ok: false, error: 'Philosophers are unreachable right now' }, 503)

    const first = notes[0]
    return json({
        ok: true,
        notes,
        text: first?.text,
        author: first?.author,
        botId: first?.botId,
    })
}