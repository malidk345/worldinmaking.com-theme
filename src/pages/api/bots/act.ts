/**
 * Unified bot action API (edge).
 *
 * POST body:
 *   {
 *     action: 'chat' | 'forum_reply' | 'thread_init' | 'paper_step' | 'status',
 *     bot?: string,              // philosopher username
 *     question?: string,
 *     mood?: string,
 *     taskType?: TaskType,
 *     thinkingDepth?: 'brief'|'standard'|'deep',
 *     context?: string,
 *     dryRun?: boolean,          // LLM only, no Supabase write
 *     payload?: {
 *       topicId?: string,        // forum_reply
 *       paperId?: string,        // paper_step
 *       step?: PaperStepKind,    // paper_step
 *       directive?: string,
 *       channelId?: number,
 *       context?: string,
 *     }
 *   }
 */
export const runtime = 'edge'

import type { TaskType } from 'lib/persona-engine'
import {
    runBotTurn,
    getBotSystemStatus,
    type BotAction,
    type ThinkingDepth,
} from 'lib/bots'
import { createForumReply, createForumTopic } from 'lib/bots/actions/forum'
import { runPaperStep, type PaperStepKind } from 'lib/bots/actions/paper'
import { envFrom, getRuntimeEnv } from 'lib/bots/runtime-env'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function assertCronIfNeeded(req: Request, action: BotAction, dryRun: boolean): string | null {
    // Mutating actions may be locked behind CRON_SECRET when set
    if (dryRun) return null
    if (action === 'chat' || action === 'status') return null
    const env = getRuntimeEnv()
    const secret = envFrom(env, 'CRON_SECRET', 'BOT_ACT_SECRET')
    if (!secret) return null // open when no secret configured
    const header = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (header !== secret) {
        return 'Unauthorized: set x-cron-secret (or Authorization Bearer) to CRON_SECRET / BOT_ACT_SECRET'
    }
    return null
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
    const bot = String(body.bot || body.philosopher || 'nietzsche')
    const mood = body.mood || 'calm'
    const taskType = (body.taskType || defaultTaskForAction(action)) as TaskType
    const thinkingDepth = body.thinkingDepth as ThinkingDepth | undefined
    const question = body.question || body.input || body.prompt
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}
    const context = body.context || payload.context
    const dryRun = body.dryRun === true || payload.dryRun === true

    if (action === 'status') {
        return json(getBotSystemStatus())
    }

    const authErr = assertCronIfNeeded(req, action, dryRun)
    if (authErr) {
        return json({ success: false, error: authErr, action }, 401)
    }

    // ── thread_init ──────────────────────────────────────────────
    if (action === 'thread_init') {
        if (!question || typeof question !== 'string') {
            return json(
                { success: false, error: 'question required for thread_init', action, phase: 'validation' },
                400
            )
        }
        const result = await createForumTopic({
            botUsername: bot,
            question,
            mood,
            thinkingDepth,
            context: typeof context === 'string' ? context : undefined,
            dryRun,
            channelId: typeof payload.channelId === 'number' ? payload.channelId : undefined,
        })
        const status = (result as any).success === false ? 503 : 200
        return json(result as any, status)
    }

    // ── forum_reply ──────────────────────────────────────────────
    if (action === 'forum_reply') {
        const topicId = String(payload.topicId || body.topicId || '')
        if (!topicId) {
            return json(
                {
                    success: false,
                    error: 'payload.topicId required for forum_reply',
                    action,
                    phase: 'validation',
                },
                400
            )
        }
        const result = await createForumReply({
            botUsername: bot,
            question:
                typeof question === 'string' && question.trim()
                    ? question
                    : 'Reply to this forum topic in your voice. Engage the argument directly.',
            topicId,
            mood,
            thinkingDepth,
            context: typeof context === 'string' ? context : undefined,
            dryRun,
        })
        const status =
            (result as any).phase === 'validation' || (result as any).phase === 'topic_missing'
                ? 400
                : (result as any).success === false
                  ? 503
                  : 200
        return json(result as any, status)
    }

    // ── paper_step ───────────────────────────────────────────────
    if (action === 'paper_step') {
        const step = (payload.step || body.step || 'thesis') as PaperStepKind
        const result = await runPaperStep({
            botUsername: bot,
            question: typeof question === 'string' ? question : undefined,
            mood,
            thinkingDepth,
            step,
            paperId: payload.paperId || body.paperId,
            directive: payload.directive || body.directive,
            previousText: payload.previousText || body.previousText,
            dryRun,
        })
        const status = (result as any).success === false ? 503 : 200
        return json(result as any, status)
    }

    // ── chat (default) ───────────────────────────────────────────
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
