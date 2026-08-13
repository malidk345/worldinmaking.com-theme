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
    type ThinkingDepth,
} from 'lib/bots'
import { createForumReply, createForumTopic } from 'lib/bots/actions/forum'
import { runPaperStep, type PaperStepKind } from 'lib/bots/actions/paper'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { envFrom, getRuntimeEnv } from 'lib/bots/runtime-env'
import {
    getClientIp,
    normalizeBotName,
    parseBotAction,
    parseBotMood,
    parsePaperStep,
    parseTaskType,
    parseThinkingDepth,
    readJsonObject,
    readOptionalString,
    type ValidBotAction,
} from 'lib/bots/request-validation'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function assertCronIfNeeded(req: Request, action: ValidBotAction, env: Record<string, string | undefined>): string | null {
    if (action === 'chat') return null
    const secret = envFrom(env, 'CRON_SECRET', 'BOT_ACT_SECRET')
    if (!secret) return 'Unauthorized: internal bot action secret is not configured'
    const header = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (header !== secret) {
        return 'Unauthorized: set x-cron-secret (or Authorization Bearer) to CRON_SECRET / BOT_ACT_SECRET'
    }
    return null
}

export default async function handler(req: Request) {
    // Read CF secrets HERE — must be inside the request handler scope
    const env = getRuntimeEnv()

    if (req.method === 'GET') {
        const secret = envFrom(env, 'CRON_SECRET', 'BOT_ACT_SECRET')
        const header = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
        if (!secret || header !== secret) return json({ success: false, error: 'Not found' }, 404)
        return json(getBotSystemStatus(env))
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    const parsed = await readJsonObject(req, 64 * 1024)
    if (!parsed.ok) return json({ error: parsed.error, success: false }, parsed.status)
    const body = parsed.body

    const action = parseBotAction(body.action)
    if (!action) return json({ error: 'Unknown bot action', success: false }, 400)
    const bot = normalizeBotName(body.bot ?? body.philosopher, 'nietzsche')
    if (!bot) return json({ error: 'Unknown philosopher bot', success: false, action }, 400)
    const mood = parseBotMood(body.mood)
    const taskType = parseTaskType(body.taskType, defaultTaskForAction(action))
    const thinkingDepth = parseThinkingDepth(body.thinkingDepth) as ThinkingDepth | undefined | null
    if (!mood || !taskType || thinkingDepth === null) {
        return json({ error: 'Invalid mood, taskType, or thinkingDepth', success: false, action }, 400)
    }
    const rawQuestion = body.question ?? body.input ?? body.prompt
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
    const payload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
        ? (body.payload as Record<string, unknown>)
        : {}
    const directContext = readOptionalString(body.context, 12000)
    const payloadContext = readOptionalString(payload.context, 12000)
    if (directContext === null || payloadContext === null) {
        return json({ error: 'context must be a string', success: false, action }, 400)
    }
    const context = directContext ?? payloadContext
    const dryRun = body.dryRun === true || payload.dryRun === true

    const authErr = assertCronIfNeeded(req, action, env)
    if (authErr) {
        return json({ success: false, error: authErr, action }, 401)
    }

    if (action === 'status') return json(getBotSystemStatus(env))

    // Per-bot rate limit for mutating / LLM-heavy actions (`status` already returned above).
    // Scoped per client IP so rotating bot names cannot bypass the bucket.
    const clientIp = getClientIp(req)
    const aggregate = checkRateLimit(`llm:${clientIp}`, 500, 60 * 60 * 1000)
    const rl = checkRateLimit(`bot_act:${clientIp}`, 500, 60 * 60 * 1000)
    if (!aggregate.allowed || !rl.allowed) {
        const retryAfterSec = Math.max(aggregate.retryAfterSec, rl.retryAfterSec)
        return json(
            {
                success: false,
                error: `Rate limited for ${action}/${bot}. Retry in ${retryAfterSec}s`,
                action,
                retryAfterSec,
            },
            429
        )
    }

    try {
    // ── thread_init ──────────────────────────────────────────────
    if (action === 'thread_init') {
        if (!question) {
            return json(
                { success: false, error: 'question required for thread_init', action, phase: 'validation' },
                400
            )
        }
        const channelId = payload.channelId === undefined
            ? undefined
            : typeof payload.channelId === 'number' && Number.isInteger(payload.channelId) && payload.channelId > 0
              ? payload.channelId
              : null
        if (channelId === null) {
            return json({ success: false, error: 'payload.channelId must be a positive integer', action }, 400)
        }
        const result = await createForumTopic({
            botUsername: bot,
            question,
            mood,
            thinkingDepth,
            context: typeof context === 'string' ? context : undefined,
            dryRun,
            channelId,
        })
        const status = statusForActionResult(result, action)
        return json(result as any, status)
    }

    // ── forum_reply ──────────────────────────────────────────────
    if (action === 'forum_reply') {
        const topicId = String(payload.topicId || body.topicId || '')
        if (!/^\d{1,20}$/.test(topicId)) {
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
        const status = statusForActionResult(result, action)
        return json(result as any, status)
    }

    // ── paper_step ───────────────────────────────────────────────
    if (action === 'paper_step') {
        const step = parsePaperStep(payload.step ?? body.step) as PaperStepKind | null
        if (!step) return json({ success: false, error: 'Invalid paper step', action }, 400)
        const paperId = readOptionalString(payload.paperId ?? body.paperId, 128)
        const directive = readOptionalString(payload.directive ?? body.directive, 12000)
        const previousText = readOptionalString(payload.previousText ?? body.previousText, 12000)
        if (paperId === null || directive === null || previousText === null) {
            return json({ success: false, error: 'paperId, directive, and previousText must be strings', action }, 400)
        }
        const result = await runPaperStep({
            botUsername: bot,
            question: typeof question === 'string' ? question : undefined,
            mood,
            thinkingDepth,
            step,
            paperId,
            directive,
            previousText,
            dryRun,
        })
        const status = statusForActionResult(result, action)
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
        env,
    })

    return json({ ...result, action: 'chat' }, result.success ? 200 : 503)
    } catch (error) {
        console.error('[bots/act] unexpected failure', error)
        return json({ success: false, error: 'Bot action failed', action }, 503)
    }
}

function statusForActionResult(result: unknown, action: ValidBotAction): number {
    const value = result as { success?: boolean; phase?: string; persisted?: boolean }
    if (value.success === false) return 503
    if (value.phase === 'validation' || value.phase === 'validation_failed') return 400
    if (value.phase === 'topic_missing' || value.phase === 'paper_missing') return 404
    if (
        value.phase === 'topic_lookup_failed' ||
        value.phase === 'paper_lookup_failed' ||
        value.phase === 'profile_missing' ||
        value.phase === 'persist_failed'
    ) {
        return 502
    }
    if ((action === 'thread_init' || action === 'forum_reply') && !value.persisted && value.phase !== 'dry_run') {
        return 502
    }
    return 200
}

function defaultTaskForAction(action: ValidBotAction): TaskType {
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
