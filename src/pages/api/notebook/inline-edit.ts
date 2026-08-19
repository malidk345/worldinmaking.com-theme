/**
 * Isolated WIM AI inline editor.
 * Slash / rewrite only. Does not use chat, orchestrate, personas, or thinking.
 */
export const runtime = 'edge'

import { generateWithGateway } from 'lib/bots/ai-gateway'
import { checkRateLimit, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getClientIp, readJsonObject } from 'lib/bots/request-validation'
import {
    MAX_WIMAI_INSTRUCTION,
    MAX_WIMAI_NOTEBOOK,
    MAX_WIMAI_SELECTION,
    WIMAI_BOT_NAME,
    WIMAI_SYSTEM_PROMPT,
    buildWimaiEditorUserPrompt,
    cleanWimaiEditorOutput,
} from 'lib/bots/wimai-editor'

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
    if (req.method !== 'POST') {
        return json({ ok: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405)
    }

    const parsed = await readJsonObject(req, 24 * 1024)
    if (!parsed.ok) {
        return json({ ok: false, error: parsed.error, code: 'INVALID_JSON' }, parsed.status)
    }

    const instruction =
        typeof parsed.body.instruction === 'string' ? parsed.body.instruction.trim() : ''
    if (!instruction) {
        return json({ ok: false, error: 'Instruction is required', code: 'MISSING_INSTRUCTION' }, 400)
    }
    if (instruction.length > MAX_WIMAI_INSTRUCTION) {
        return json({ ok: false, error: 'Instruction is too long', code: 'INSTRUCTION_TOO_LONG' }, 400)
    }

    const selection =
        typeof parsed.body.selection === 'string'
            ? parsed.body.selection.slice(0, MAX_WIMAI_SELECTION)
            : ''
    const notebook =
        typeof parsed.body.notebook === 'string' ? parsed.body.notebook.slice(0, MAX_WIMAI_NOTEBOOK) : ''

    const ip = getClientIp(req)
    const aggregate = checkRateLimit(`llm:${ip}`, 60, 60 * 60 * 1000)
    const rl = checkRateLimit(`wimai:${ip}`, 40, 60 * 60 * 1000)
    if (!aggregate.allowed || !rl.allowed) {
        const retryAfterSec = Math.max(aggregate.retryAfterSec, rl.retryAfterSec)
        const rlHeaders = buildRateLimitHeaders(!aggregate.allowed ? aggregate : rl)
        return json(
            { ok: false, code: 'RATE_LIMITED', error: `Rate limit exceeded. Retry in ${retryAfterSec}s`, retryAfterSec },
            429,
            rlHeaders
        )
    }

    const result = await generateWithGateway({
        systemPrompt: WIMAI_SYSTEM_PROMPT,
        userPrompt: buildWimaiEditorUserPrompt({ instruction, selection, notebook }),
        taskType: 'autonomous_assistant',
        temperature: 0.25,
        thinkingDepth: 'brief',
        botName: WIMAI_BOT_NAME,
    })

    const rlHeaders = buildRateLimitHeaders(rl)

    if (!result.ok) {
        return json(
            { ok: false, code: 'PROVIDER_FAILED', error: 'Editor is unavailable right now' },
            503,
            rlHeaders
        )
    }

    const markdown = cleanWimaiEditorOutput(result.text)
    if (!markdown) {
        return json(
            { ok: false, code: 'EMPTY_OUTPUT', error: 'Editor returned an empty result' },
            422,
            rlHeaders
        )
    }

    return json(
        { ok: true, markdown, bot: WIMAI_BOT_NAME, provider: result.provider, latencyMs: result.latencyMs },
        200,
        {
            ...rlHeaders,
            'X-WIM-AI-Provider': result.provider,
            'X-WIM-AI-Latency-Ms': String(result.latencyMs),
        }
    )
}
