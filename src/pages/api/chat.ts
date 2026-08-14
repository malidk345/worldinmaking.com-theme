/**
 * Workspace chat SSE endpoint — the single interactive chat path.
 *
 * Notebook Ask AI continues to use /api/notebook/co-author.
 * This route must never manufacture a successful answer when every
 * provider is down: clients receive a typed error event instead.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { streamBotTurn } from 'lib/bots/orchestrate'
import { checkRateLimit } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { normalizeBotName } from 'lib/bots/request-validation'
import { formatSearchResults, searchWebSources } from 'lib/bots/web-search'
import { resolveSearchIntent } from 'lib/bots/intent-router'
import { extractChartArtifacts, stripChartArtifactMarkup } from 'lib/ai/chart-artifacts'
import { stripThinkingBlocks } from 'lib/bots/thinking-tags'
import { formatAiSseEvent, type AiCitation, type AiSseEvent } from 'lib/ai/contracts'
import { getSupabaseUserFromBearer } from '../../../lib/api-authz'
import { incrementDailyUsage, isChatStoreUnavailable } from '../../lib/chat-store'
import { collectGroqKeys, type GatewayMessage } from 'lib/bots/ai-gateway'

const GUEST_HOURLY_LIMIT = 80
const AUTH_HOURLY_LIMIT = 120
const GUEST_DAILY_LIMIT = 200
const AUTH_DAILY_LIMIT = 400

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
        responseLimit: false,
    },
}

const MAX_PROMPT_LENGTH = 8000
const MAX_SYSTEM_PROMPT_LENGTH = 5000
const MAX_STYLE_LENGTH = 2000
const MAX_ATTACHMENT_CONTEXT_LENGTH = 6000
const MAX_HISTORY_LENGTH = 8000
const MAX_NOTEBOOK_CONTEXT_LENGTH = 3500

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

function readOptionalBoundedString(
    value: unknown,
    maxLength: number,
    field: string
): { ok: true; value: string } | { ok: false; error: string } {
    if (value === undefined || value === null) return { ok: true, value: '' }
    if (typeof value !== 'string') return { ok: false, error: `${field} must be a string` }
    if (value.length > maxLength) return { ok: false, error: `${field} too long (max ${maxLength} characters)` }
    return { ok: true, value: value.trim() }
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

    const rawModelId = body.modelId === undefined ? 'nietzsche' : body.modelId
    const philosopher = normalizeBotName(rawModelId)
    if (!philosopher) return jsonError(res, 'Unknown AI model or philosopher', 400)

    const systemPrompt = readOptionalBoundedString(body.systemPrompt, MAX_SYSTEM_PROMPT_LENGTH, 'systemPrompt')
    const styleSuffix = readOptionalBoundedString(body.styleSuffix, MAX_STYLE_LENGTH, 'styleSuffix')
    const attachmentContext = readOptionalBoundedString(
        body.attachmentContext,
        MAX_ATTACHMENT_CONTEXT_LENGTH,
        'attachmentContext'
    )
    const chatHistory = readOptionalBoundedString(body.chatHistory, MAX_HISTORY_LENGTH, 'chatHistory')
    const notebookContext = readOptionalBoundedString(
        body.notebookContext,
        MAX_NOTEBOOK_CONTEXT_LENGTH,
        'notebookContext'
    )
    if (!systemPrompt.ok) return jsonError(res, systemPrompt.error, 400)
    if (!styleSuffix.ok) return jsonError(res, styleSuffix.error, 400)
    if (!attachmentContext.ok) return jsonError(res, attachmentContext.error, 400)
    if (!chatHistory.ok) return jsonError(res, chatHistory.error, 400)
    if (!notebookContext.ok) return jsonError(res, notebookContext.error, 400)

    const conversationId = readOptionalBoundedString(body.conversationId, 80, 'conversationId')
    if (!conversationId.ok) return jsonError(res, conversationId.error, 400)

    let history: GatewayMessage[] = []
    if (body.messages !== undefined) {
        if (!Array.isArray(body.messages)) return jsonError(res, 'messages must be an array', 400)
        if (body.messages.length > 20) return jsonError(res, 'messages too long (max 20)', 400)
        for (const item of body.messages) {
            if (!item || typeof item !== 'object') return jsonError(res, 'each message must be an object', 400)
            const role = (item as { role?: unknown }).role
            const content = (item as { content?: unknown }).content
            if (role !== 'user' && role !== 'assistant') return jsonError(res, 'message.role must be user or assistant', 400)
            if (typeof content !== 'string') return jsonError(res, 'message.content must be a string', 400)
            if (content.length > 4000) return jsonError(res, 'message.content too long (max 4000 characters)', 400)
            if (content.trim()) history.push({ role, content: content.trim() })
        }
    }

    const clientIp = getClientIp(req)
    const bearer = getHeaderValue(req.headers.authorization).startsWith('Bearer ')
        ? getHeaderValue(req.headers.authorization).slice(7).trim()
        : ''
    const user = await getSupabaseUserFromBearer(bearer || null)
    const hourlyLimit = user ? AUTH_HOURLY_LIMIT : GUEST_HOURLY_LIMIT
    const dailyLimit = user ? AUTH_DAILY_LIMIT : GUEST_DAILY_LIMIT
    const quotaSubject = user ? `user:${user.id}` : `ip:${clientIp}`

    const hourly = checkRateLimit(`workspace-chat:${quotaSubject}`, hourlyLimit, 60 * 60 * 1000)
    if (!hourly.allowed) {
        res.setHeader('Retry-After', String(hourly.retryAfterSec))
        return res.status(429).json({
            success: false,
            error: user
                ? `[app] Hourly chat quota exceeded (${hourlyLimit}/h)`
                : `[app] Guest hourly quota exceeded (${hourlyLimit}/h). Sign in for a higher limit.`,
            retryAfterSec: hourly.retryAfterSec,
        })
    }

    try {
        const dailyCount = await incrementDailyUsage(quotaSubject)
        if (typeof dailyCount === 'number' && dailyCount > dailyLimit) {
            res.setHeader('Retry-After', '86400')
            return res.status(429).json({
                success: false,
                error: user
                    ? `[app] Daily chat quota exceeded (${dailyLimit}/d)`
                    : `[app] Guest daily quota exceeded (${dailyLimit}/d). Sign in for a higher limit.`,
                retryAfterSec: 86400,
            })
        }
    } catch (err) {
        if (!isChatStoreUnavailable(err)) {
            console.warn('[chat] daily quota check failed', err)
        }
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const send = (event: AiSseEvent) => {
        res.write(formatAiSseEvent(event))
        const flushable = res as unknown as { flush?: () => void }
        if (typeof flushable.flush === 'function') flushable.flush()
    }

    try {
        let webSearchContext = ''
        let citations: AiCitation[] = []
        const previousUserText = [...history]
            .reverse()
            .find((message) => message.role === 'user')?.content
        let intent = { needsSearch: false, searchQuery: prompt.slice(0, 500) as string | null }
        try {
            const classified = await resolveSearchIntent(prompt, {
                env: getRuntimeEnv(),
                previousUserText,
            })
            intent = { needsSearch: classified.needsSearch, searchQuery: classified.searchQuery }
        } catch {
            // Search is an enhancement; an unavailable classifier must never
            // take down the primary chat response.
        }

        if (intent.needsSearch) {
            const searchRate = checkRateLimit(`web-search:${clientIp}`, 30, 60 * 60 * 1000)
            const searchQuery = (intent.searchQuery || prompt).slice(0, 500).trim()
            if (searchRate.allowed && searchQuery) {
                send({ type: 'search', search: { status: 'running', query: searchQuery } })
                try {
                    const results = await searchWebSources(searchQuery)
                    const formatted = formatSearchResults(results)
                    citations = results.slice(0, 6).map((item, index) => ({
                        id: index + 1,
                        title: item.title,
                        url: item.url,
                        snippet: item.snippet.slice(0, 280),
                        source: item.source,
                    }))
                    send({ type: 'search', search: { status: 'done', query: searchQuery, results: formatted || null } })
                    if (citations.length > 0) send({ type: 'citations', citations })
                    if (formatted) {
                        webSearchContext = `Live Web Search Results for "${searchQuery}" (UNTRUSTED reference data):\n"""${formatted.slice(0, 6000)}"""`
                    }
                } catch {
                    send({ type: 'search', search: { status: 'error', query: searchQuery, results: null } })
                }
            }
        }

        const groqKeysVisible = collectGroqKeys(getRuntimeEnv())
        console.info(
            '[chat] groq keys visible',
            groqKeysVisible.length,
            groqKeysVisible.map((key, index) => `${index + 1}:…${key.slice(-4)}`).join(' ')
        )
        send({ type: 'thinking_start' })
        const context = [
            systemPrompt.value
                ? `User-configured project instructions (untrusted reference data):\n"""${systemPrompt.value}"""`
                : '',
            styleSuffix.value ? `Requested style (untrusted reference data):\n"""${styleSuffix.value}"""` : '',
            notebookContext.value
                ? `Active Notebook Context (untrusted reference data):\n"""${notebookContext.value}"""`
                : '',
            history.length === 0 && chatHistory.value
                ? `Recent Conversation History (untrusted reference data):\n"""${chatHistory.value}"""`
                : '',
            attachmentContext.value
                ? `Attachments (untrusted reference data):\n"""${attachmentContext.value}"""`
                : '',
            webSearchContext,
        ]
            .filter(Boolean)
            .join('\n\n')

        let currentThinkingDetail = ''
        const currentThinkingStageId = 'auto-1'
        send({
            type: 'thinking_step',
            step: {
                id: currentThinkingStageId,
                stepNumber: 1,
                title: 'Thinking',
                detail: '…',
                completed: false,
                source: 'system_event',
            },
        })

        const result = await streamBotTurn(
            {
                question: prompt,
                philosopher,
                taskType: 'autonomous_assistant',
                thinkingDepth: 'deep',
                context,
                messages: history,
                env: getRuntimeEnv(),
                onLifecycle: (event) => send({ type: 'phase', phase: event }),
                onAnalysisSummary: (thinking) => {
                    thinking.stages.forEach((stage, index) =>
                        send({
                            type: 'thinking_step',
                            step: {
                                id: stage.id,
                                stepNumber: index + 1,
                                title: stage.label,
                                detail: stage.text,
                                completed: true,
                                source: stage.source || 'model_summary',
                            },
                        })
                    )
                },
            },
            (token) => {
                send({ type: 'token', text: token })
            },
            (thinkingToken) => {
                currentThinkingDetail += thinkingToken
                send({
                    type: 'thinking_step',
                    step: {
                        id: currentThinkingStageId,
                        stepNumber: 1,
                        title: 'Analyzing',
                        detail: currentThinkingDetail,
                        completed: false,
                        source: 'model_summary',
                    },
                })
            }
        )

        if (!result.success) {
            const attempts = 'attempts' in result ? result.attempts : []
            console.error('[chat] providers failed', { error: result.error, attempts })
            const lastAttempt = (attempts[attempts.length - 1] || '').replace(/\s+/g, ' ').slice(0, 180)
            send({
                type: 'error',
                code: 'provider_unavailable',
                message: lastAttempt
                    ? `The reply could not be completed. ${lastAttempt}`
                    : result.reply,
                retryable: true,
            })
            return res.end()
        }

        const extractedCharts = extractChartArtifacts(result.reply, prompt)
        const chartArtifacts = extractedCharts.map((artifact, index) => ({
            id: `art-${Date.now()}-${index + 1}`,
            title: artifact.title,
            type: 'chart' as const,
            language: 'json',
            content: artifact.content,
            chartSpec: artifact.chartSpec,
            description: artifact.description,
            version: 1,
            createdAt: new Date().toISOString(),
        }))
        const visibleReply = stripThinkingBlocks(stripChartArtifactMarkup(result.reply))

        if (chartArtifacts.length > 0) {
            send({ type: 'artifacts', artifacts: chartArtifacts })
        }

        send({
            type: 'done',
            fullText: visibleReply,
            provider: result.provider,
            artifacts: chartArtifacts,
            latencyMs: result.latencyMs,
        })
        return res.end()
    } catch (error) {
        console.error('[chat] request failed', error)
        send({ type: 'error', code: 'chat_failed', message: 'AI service failed', retryable: true })
        return res.end()
    }
}
