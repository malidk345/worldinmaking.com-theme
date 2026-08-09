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

import { getRequestContext } from '@cloudflare/next-on-pages'
import type { TaskType } from 'lib/persona-engine'
import {
    runBotTurn,
    getBotSystemStatus,
    type BotAction,
    type ThinkingDepth,
} from 'lib/bots'
import { createForumReply, createForumTopic } from 'lib/bots/actions/forum'
import { runPaperStep, type PaperStepKind } from 'lib/bots/actions/paper'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { envFrom } from 'lib/bots/runtime-env'

/** Read CF secrets + process.env. Must be called inside a handler. */
function readEnv(): Record<string, string> {
    const base: Record<string, string> = {}
    for (const [k, v] of Object.entries(process.env)) {
        if (typeof v === 'string' && v.length > 0) base[k] = v
    }
    try {
        const { env } = getRequestContext()
        for (const [k, v] of Object.entries(env as Record<string, unknown>)) {
            if (typeof v === 'string' && v.length > 0) base[k] = v
        }
    } catch { /* local dev */ }
    return base
}

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function assertCronIfNeeded(req: Request, action: BotAction, env: Record<string, string>): string | null {
    if (action === 'chat' || action === 'status') return null
    const secret = envFrom(env, 'CRON_SECRET', 'BOT_ACT_SECRET')
    if (!secret) return null
    const header = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (header !== secret) {
        return 'Unauthorized: set x-cron-secret (or Authorization Bearer) to CRON_SECRET / BOT_ACT_SECRET'
    }
    return null
}

export default async function handler(req: Request) {
    // Read CF secrets HERE — must be inside the request handler scope
    const env = readEnv()

    // DIAGNOSTIC: log all visible env key names so we can see what CF exposes

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

    // Guard against JSON `null` / scalars — destructuring them throws
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        body = {}
    }

    const action = (body.action || 'chat') as BotAction
    const bot = String(body.bot || body.philosopher || 'nietzsche')
    const mood = body.mood || 'calm'
    const taskType = (body.taskType || defaultTaskForAction(action)) as TaskType
    const thinkingDepth = body.thinkingDepth as ThinkingDepth | undefined
    const rawQuestion = body.question || body.input || body.prompt
    const question = typeof rawQuestion === 'string' ? rawQuestion.trim() : ''
    if (question.length > 8000) {
        return json(
            {
                success: false,
                error: 'question too long (max 8000 chars)',
                action,
                phase: 'validation',
            },
            400
        )
    }
    const payload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload : {}
    const context = typeof body.context === 'string' ? body.context.slice(0, 12000) : payload.context
    const dryRun = body.dryRun === true || payload.dryRun === true

    if (action === 'status') {
        return json(getBotSystemStatus())
    }

    const authErr = assertCronIfNeeded(req, action, env)
    if (authErr) {
        return json({ success: false, error: authErr, action }, 401)
    }

    // Per-bot rate limit for mutating / LLM-heavy actions (`status` already returned above).
    // Scoped per client IP so rotating bot names cannot bypass the bucket.
    const clientIp =
        req.headers.get('cf-connecting-ip') ||
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'local'
    const rlKey = `act:${action}:${clientIp}:${bot.toLowerCase()}`
    const limit = action === 'chat' ? 40 : 15
    const rl = checkRateLimit(rlKey, limit, 60 * 60 * 1000)
    if (!rl.allowed) {
        return json(
            {
                success: false,
                error: `Rate limited for ${action}/${bot}. Retry in ${rl.retryAfterSec}s`,
                action,
                retryAfterSec: rl.retryAfterSec,
            },
            429
        )
    }

    // ── thread_init ──────────────────────────────────────────────
    if (action === 'thread_init') {
        if (!question) {
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
    if (!question) {
        return json({ error: 'question string is required', success: false, action: 'chat' }, 400)
    }

    const result = await runBotTurn({
        question,
        philosopher: bot,
        mood,
        taskType,
        thinkingDepth,
        context: typeof context === 'string' ? context : undefined,
        _env: env,
    } as any)

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
