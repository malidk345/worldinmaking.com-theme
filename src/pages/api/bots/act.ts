/**
 * Unified bot action API (edge).
 *
 * POST body:
 *   { action, bot?, question?, mood?, taskType?, thinkingDepth?, context?, payload? }
 *
 * actions:
 *   status      — provider / thinking readiness (no LLM)
 *   chat        — interactive philosopher turn (thinking process + reply)
 *   forum_reply — stub → next phase (Supabase write)
 *   thread_init — stub → next phase
 *   paper_step  — stub → next phase (WIMBot pipeline step)
 */
export const runtime = 'edge'

import type { TaskType } from 'lib/persona-engine'
import {
    runBotTurn,
    getBotSystemStatus,
    type BotAction,
    type ThinkingDepth,
} from 'lib/bots'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method === 'GET') {
        return json(getBotSystemStatus())
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    let body: any = {}
    try {
        body = await req.json()
    } catch {
        body = {}
    }

    const action = (body.action || 'chat') as BotAction
    const bot = body.bot || body.philosopher || 'Nietzsche'
    const mood = body.mood || 'calm'
    const taskType = (body.taskType || defaultTaskForAction(action)) as TaskType
    const thinkingDepth = body.thinkingDepth as ThinkingDepth | undefined
    const question = body.question || body.input || body.prompt
    const context = body.context || body.payload?.context

    if (action === 'status') {
        return json(getBotSystemStatus())
    }

    if (action === 'forum_reply' || action === 'thread_init' || action === 'paper_step') {
        // Phase 2/3: persist to Supabase — scaffold only for now
        if (!question || typeof question !== 'string') {
            return json(
                {
                    success: false,
                    error: `action=${action} requires question/input string`,
                    action,
                    phase: 'scaffold',
                },
                400
            )
        }

        // Run the LLM turn so callers can preview; persistence comes next phase
        const result = await runBotTurn({
            question,
            philosopher: bot,
            mood,
            taskType,
            thinkingDepth,
            context: typeof context === 'string' ? context : undefined,
        })

        return json(
            {
                ...result,
                action,
                phase: 'llm_only',
                note: `${action} LLM path active; Supabase persistence lands in next phase.`,
                payload: body.payload ?? null,
            },
            result.success ? 200 : 503
        )
    }

    // default: chat
    if (!question || typeof question !== 'string') {
        return json({ error: 'question string is required', success: false, action: 'chat' }, 400)
    }

    const result = await runBotTurn({
        question,
        philosopher: bot,
        mood,
        taskType,
        thinkingDepth,
        context: typeof context === 'string' ? context : undefined,
    })

    return json({ ...result, action: 'chat' }, result.success ? 200 : 503)
}

function defaultTaskForAction(action: BotAction): TaskType {
    switch (action) {
        case 'forum_reply':
            return 'community_reply'
        case 'thread_init':
            return 'thread_init'
        case 'paper_step':
            return 'paper_section'
        default:
            return 'community_reply'
    }
}
