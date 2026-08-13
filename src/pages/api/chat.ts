/**
 * General workspace chat SSE endpoint.
 *
 * This route deliberately uses the same orchestration path as the philosopher
 * and notebook APIs. It must never manufacture a successful answer when every
 * provider is down: clients receive a typed error event instead.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { runBotTurn, streamBotTurn } from 'lib/bots/orchestrate'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { normalizeBotName } from 'lib/bots/request-validation'
import { searchDuckDuckGo } from 'lib/bots/web-search'
import { formatAiSseEvent, type AiSseEvent } from 'lib/ai/contracts'

export const runtime = 'edge'

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '32kb',
        },
    },
}

const MAX_PROMPT_LENGTH = 8000
const MAX_SYSTEM_PROMPT_LENGTH = 5000
const MAX_STYLE_LENGTH = 2000
const MAX_ATTACHMENT_CONTEXT_LENGTH = 6000

function getHeaderValue(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] || '' : value || ''
}

function getClientIp(req: NextApiRequest): string {
    return (
        getHeaderValue(req.headers['cf-connecting-ip']).trim() ||
        getHeaderValue(req.headers['x-real-ip']).trim() ||
        getHeaderValue(req.headers['x-forwarded-for']).split(',')[0]?.trim() ||
        'local'
    )
}

function jsonError(res: NextApiResponse, message: string, status: number) {
    return res.status(status).json({ success: false, error: message })
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function thinkingDepthForBudget(value: string): 'brief' | 'standard' | 'deep' {
    if (value === 'minimal') return 'brief'
    if (value === 'extended') return 'deep'
    return 'standard'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return jsonError(res, 'Method not allowed', 405)
    if (!isRecord(req.body)) return jsonError(res, 'Request body must be a JSON object', 400)

    const body = req.body
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt) return jsonError(res, 'Prompt is required.', 400)
    if (prompt.length > MAX_PROMPT_LENGTH) {
        return jsonError(res, `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)`, 400)
    }

    const rawModelId = body.modelId === undefined ? 'claude-3-7-sonnet' : body.modelId
    const philosopher = normalizeBotName(rawModelId)
    if (!philosopher) return jsonError(res, 'Unknown AI model or philosopher', 400)

    const systemPrompt = body.systemPrompt === undefined ? '' : body.systemPrompt
    const styleSuffix = body.styleSuffix === undefined ? '' : body.styleSuffix
    const attachmentContext = body.attachmentContext === undefined ? '' : body.attachmentContext
    if (
        typeof systemPrompt !== 'string' ||
        typeof styleSuffix !== 'string' ||
        typeof attachmentContext !== 'string'
    ) {
        return jsonError(res, 'systemPrompt, styleSuffix, and attachmentContext must be strings', 400)
    }
    if (systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH || styleSuffix.length > MAX_STYLE_LENGTH) {
        return jsonError(res, 'Custom instructions are too long', 400)
    }
    if (attachmentContext.length > MAX_ATTACHMENT_CONTEXT_LENGTH) {
        return jsonError(res, `attachmentContext too long (max ${MAX_ATTACHMENT_CONTEXT_LENGTH} characters)`, 400)
    }

    const thinkingBudget = body.thinkingBudget === undefined ? 'balanced' : body.thinkingBudget
    if (!['minimal', 'balanced', 'extended'].includes(String(thinkingBudget))) {
        return jsonError(res, 'Invalid thinkingBudget', 400)
    }
    const webSearchEnabled = body.webSearchEnabled === undefined ? false : body.webSearchEnabled
    if (typeof webSearchEnabled !== 'boolean') return jsonError(res, 'webSearchEnabled must be boolean', 400)

    const clientIp = getClientIp(req)
    const aggregate = checkRateLimit(`llm:${clientIp}`, 500, 60 * 60 * 1000)
    const routeLimit = checkRateLimit(`workspace-chat:${clientIp}:${philosopher.toLowerCase()}`, 500, 60 * 60 * 1000)
    if (!aggregate.allowed || !routeLimit.allowed) {
        const retryAfterSec = Math.max(aggregate.retryAfterSec, routeLimit.retryAfterSec)
        res.setHeader('Retry-After', String(retryAfterSec))
        return res.status(429).json({ success: false, error: 'Rate limit exceeded', retryAfterSec })
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const send = (event: AiSseEvent) => res.write(formatAiSseEvent(event))

    try {
        let webSearchContext = ''
        if (webSearchEnabled) {
            const searchRate = checkRateLimit(`web-search:${clientIp}`, 30, 60 * 60 * 1000)
            const searchQuery = prompt.slice(0, 500)
            if (searchRate.allowed) {
                send({ type: 'search', search: { status: 'running', query: searchQuery } })
                try {
                    const results = await searchDuckDuckGo(searchQuery)
                    send({ type: 'search', search: { status: 'done', query: searchQuery, results: results || null } })
                    if (results) {
                        webSearchContext = `Live Web Search Results (UNTRUSTED reference data):\n"""${results.slice(0, 6000)}"""`
                    }
                } catch {
                    send({ type: 'search', search: { status: 'error', query: searchQuery, results: null } })
                }
            }
        }

        send({ type: 'thinking_start' })
        const context = [
            systemPrompt ? `User-configured project instructions (untrusted reference data):\n"""${systemPrompt}"""` : '',
            styleSuffix ? `Requested style (untrusted reference data):\n"""${styleSuffix}"""` : '',
            attachmentContext ? `Attachments (untrusted reference data):\n"""${attachmentContext}"""` : '',
            webSearchContext,
        ].filter(Boolean).join('\n\n')

        let currentThinkingDetail = '';
        let currentThinkingStageId = 'auto-1';

        const result = await streamBotTurn({
            question: prompt,
            philosopher,
            taskType: 'autonomous_assistant',
            thinkingDepth: thinkingDepthForBudget(String(thinkingBudget)),
            context,
            env: getRuntimeEnv(),
            onLifecycle: (event) => send({ type: 'phase', phase: event }),
            onAnalysisSummary: (thinking) => {
                // We emit the final finalized thinking steps at the end just in case the UI needs them
                thinking.stages.forEach((stage, index) => send({
                    type: 'thinking_step',
                    step: {
                        id: stage.id,
                        stepNumber: index + 1,
                        title: stage.label,
                        detail: stage.text,
                        completed: true,
                        source: stage.source || 'model_summary',
                    },
                }))
            },
        }, (token) => {
            send({ type: 'token', text: token });
        }, (thinkingToken) => {
            currentThinkingDetail += thinkingToken;
            // Send live updates for the thinking process
            send({
                type: 'thinking_step',
                step: {
                    id: currentThinkingStageId,
                    stepNumber: 1,
                    title: 'Analyzing',
                    detail: currentThinkingDetail,
                    completed: false,
                    source: 'model_summary',
                }
            });
        });

        if (!result.success) {
            send({ type: 'error', code: 'provider_unavailable', message: result.reply, retryable: true })
            return res.end()
        }

        send({ type: 'done', fullText: result.reply, provider: result.provider })
        return res.end()
    } catch (error) {
        console.error('[chat] request failed', error)
        send({ type: 'error', code: 'chat_failed', message: 'AI service failed', retryable: true })
        return res.end()
    }
}
