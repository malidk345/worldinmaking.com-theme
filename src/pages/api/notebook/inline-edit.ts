/**
 * Isolated WIM AI inline editor.
 * Slash / rewrite only. Does not use chat, orchestrate, personas, or thinking.
 */
export const runtime = 'edge'

import { generateWithGateway } from 'lib/bots/ai-gateway'
import { checkRateLimit } from 'lib/bots/rate-limit'
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

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ ok: false, error: 'Method not allowed' }, 405)
    }

    const parsed = await readJsonObject(req, 24 * 1024)
    if (!parsed.ok) {
        return json({ ok: false, error: parsed.error }, parsed.status)
    }

    const instruction =
        typeof parsed.body.instruction === 'string' ? parsed.body.instruction.trim() : ''
    if (!instruction) {
        return json({ ok: false, error: 'Instruction is required' }, 400)
    }
    if (instruction.length > MAX_WIMAI_INSTRUCTION) {
        return json({ ok: false, error: 'Instruction is too long' }, 400)
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
        return json({ ok: false, error: `Rate limit exceeded. Retry in ${retryAfterSec}s`, retryAfterSec }, 429)
    }

    const result = await generateWithGateway({
        systemPrompt: WIMAI_SYSTEM_PROMPT,
        userPrompt: buildWimaiEditorUserPrompt({ instruction, selection, notebook }),
        taskType: 'autonomous_assistant',
        temperature: 0.25,
        thinkingDepth: 'brief',
        botName: WIMAI_BOT_NAME,
    })

    if (!result.ok) {
        return json({ ok: false, error: 'Editor is unavailable right now' }, 503)
    }

    const markdown = cleanWimaiEditorOutput(result.text)
    if (!markdown) {
        return json({ ok: false, error: 'Editor returned an empty result' }, 422)
    }

    return json({ ok: true, markdown, bot: WIMAI_BOT_NAME })
}
