/**
 * Workspace chat SSE endpoint — the single interactive chat path.
 *
 * Notebook Ask AI binds to this route. `/api/notebook/co-author` is the
 * remaining block-critique path and uses the same tool harness.
 * This route must never manufacture a successful answer when every
 * provider is down: clients receive a typed error event instead.
 *
 * Edge runtime (next-on-pages): plain Request/Response + ReadableStream SSE.
 */
export const runtime = 'edge'

import { streamBotTurn } from 'lib/bots/orchestrate'
import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { getClientIp, normalizeBotName, readJsonObject } from 'lib/bots/request-validation'
import { stripChartArtifactMarkup } from 'lib/ai/chart-artifacts'
import { stripThinkingBlocks } from 'lib/bots/thinking-tags'
import { stripLeakedToolMarkup } from 'lib/bots/tools/leak'
import { shouldAdvertiseQualityCorrection, formatAiSseEvent, toPublicProviderLabel, type AiCitation, type AiSseEvent } from 'lib/ai/contracts'
import { finalizeArtifactTurn } from '../../lib/artifacts'
import {
    clipNotebookBackground,
    isNotebookTask,
    NOTEBOOK_AVAILABLE_INSTRUCTION,
    NOTEBOOK_EDITOR_INSTRUCTION,
} from '../../lib/notebook-chat-bind'
import { getSupabaseUserFromRequest } from '../../../lib/api-authz'
import { incrementDailyUsage } from '../../lib/chat-store'
import { collectGroqKeys, type GatewayMessage } from 'lib/bots/ai-gateway'
import { parseAgentCheckpoint, parseResumeAction } from 'lib/bots/agent/checkpoint'
import { parseAgentMode } from 'lib/bots/agent/modes'
import { parseHostSnapshot } from 'lib/bots/tools/host'
import { isUserPro } from '../../lib/wim-billing'
import { estimateTokens, getTokenQuota, recordTokenUsage, type UserTier } from '../../lib/token-quota'

const GUEST_HOURLY_LIMIT = 30
const AUTH_HOURLY_LIMIT = 100
const PRO_HOURLY_LIMIT = 300

const GUEST_DAILY_LIMIT = 100
const AUTH_DAILY_LIMIT = 300
const PRO_DAILY_LIMIT = 1000
const MAX_BODY_BYTES = 1024 * 1024

const MAX_PROMPT_LENGTH = 8000
const MAX_SYSTEM_PROMPT_LENGTH = 5000
const MAX_STYLE_LENGTH = 2000
const MAX_ATTACHMENT_CONTEXT_LENGTH = 18000
const MAX_HISTORY_LENGTH = 8000
const MAX_NOTEBOOK_CONTEXT_LENGTH = 24000

function json(body: Record<string, unknown>, status = 200, headers?: HeadersInit) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

function jsonError(message: string, status: number, headers?: HeadersInit) {
    return json({ success: false, error: message }, status, headers)
}

function readOptionalBoundedString(
    value: unknown,
    maxLength: number,
    field: string,
    opts?: { truncate?: boolean }
): { ok: true; value: string } | { ok: false; error: string } {
    if (value === undefined || value === null) return { ok: true, value: '' }
    if (typeof value !== 'string') return { ok: false, error: `${field} must be a string` }
    const trimmed = value.trim()
    if (trimmed.length > maxLength) {
        if (opts?.truncate) return { ok: true, value: trimmed.slice(0, maxLength) }
        return { ok: false, error: `${field} too long (max ${maxLength} characters)` }
    }
    return { ok: true, value: trimmed }
}


const BYOK_KEY_MAX = 200

/** Read BYOK keys from the chat JSON body only (never from shared headers). */
function readByokEnv(body: Record<string, unknown>): Record<string, string> {
    const byokEnv: Record<string, string> = {}
    const raw = body.byok
    const fromBody =
        raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : null

    const take = (provider: 'groq' | 'gemini' | 'openai' | 'anthropic' | 'deepseek', envName: string) => {
        if (!fromBody) return
        const candidate = fromBody[provider]
        if (typeof candidate === 'string' && candidate.trim()) {
            byokEnv[envName] = candidate.trim().slice(0, BYOK_KEY_MAX)
        }
    }

    take('groq', 'GROQ_API_KEY')
    take('gemini', 'GEMINI_API_KEY')
    take('openai', 'OPENAI_API_KEY')
    take('anthropic', 'ANTHROPIC_API_KEY')
    take('deepseek', 'DEEPSEEK_API_KEY')
    return byokEnv
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return jsonError('Method not allowed', 405)

    try {
        const parsed = await readJsonObject(req, MAX_BODY_BYTES)
        if (!parsed.ok) return jsonError(parsed.error, parsed.status)
        const body = parsed.body

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt && !parseAgentCheckpoint(body.checkpoint)) return jsonError('Prompt is required.', 400)
    if (prompt.length > MAX_PROMPT_LENGTH) {
        return jsonError(`Prompt too long (max ${MAX_PROMPT_LENGTH} characters)`, 400)
    }

    const rawModelId = body.modelId === undefined ? 'nietzsche' : body.modelId
    const philosopher = normalizeBotName(rawModelId)
    if (!philosopher) return jsonError('Unknown AI model or philosopher', 400)

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
        'notebookContext',
        { truncate: true }
    )
    if (!systemPrompt.ok) return jsonError(systemPrompt.error, 400)
    if (!styleSuffix.ok) return jsonError(styleSuffix.error, 400)
    if (!attachmentContext.ok) return jsonError(attachmentContext.error, 400)
    if (!chatHistory.ok) return jsonError(chatHistory.error, 400)
    if (!notebookContext.ok) return jsonError(notebookContext.error, 400)

    const conversationId = readOptionalBoundedString(body.conversationId, 80, 'conversationId')
    if (!conversationId.ok) return jsonError(conversationId.error, 400)

    const host = parseHostSnapshot(body.workspace)
    const agentMode = parseAgentMode(body.agentMode)
    const checkpoint = parseAgentCheckpoint(body.checkpoint)
    const resumeAction = parseResumeAction(body.resumeAction)
    const resumePayload = typeof body.resumePayload === 'string' ? body.resumePayload.slice(0, 800) : undefined
    if (body.checkpoint !== undefined && !checkpoint) return jsonError('checkpoint is invalid', 400)
    if (checkpoint && !resumeAction) return jsonError('resumeAction is required with checkpoint', 400)

    let history: GatewayMessage[] = []
    if (body.messages !== undefined) {
        if (!Array.isArray(body.messages)) return jsonError('messages must be an array', 400)
        if (body.messages.length > 30) return jsonError('messages too long (max 30)', 400)
        for (const item of body.messages) {
            if (!item || typeof item !== 'object') return jsonError('each message must be an object', 400)
            const role = (item as { role?: unknown }).role
            const content = (item as { content?: unknown }).content
            if (role !== 'user' && role !== 'assistant' && role !== 'tool') {
                return jsonError('message.role must be user, assistant, or tool', 400)
            }
            if (typeof content !== 'string') return jsonError('message.content must be a string', 400)
            if (content.length > 4000) return jsonError('message.content too long (max 4000 characters)', 400)
            if (role === 'tool') {
                const toolCallId = (item as { tool_call_id?: unknown }).tool_call_id
                if (typeof toolCallId !== 'string' || !toolCallId.trim()) {
                    return jsonError('tool messages need tool_call_id', 400)
                }
                history.push({
                    role: 'tool',
                    content: content.trim(),
                    tool_call_id: toolCallId.trim().slice(0, 80),
                })
                continue
            }
            const rawArtifacts = (item as { artifacts?: unknown }).artifacts
            let artifacts: GatewayMessage['artifacts']
            if (rawArtifacts !== undefined) {
                if (!Array.isArray(rawArtifacts) || rawArtifacts.length > 3) {
                    return jsonError('message.artifacts must be an array of at most 3 items', 400)
                }
                artifacts = []
                for (const artifact of rawArtifacts) {
                    if (!artifact || typeof artifact !== 'object') {
                        return jsonError('each artifact must be an object', 400)
                    }
                    const type = (artifact as { type?: unknown }).type
                    const title = (artifact as { title?: unknown }).title
                    const body = (artifact as { content?: unknown }).content
                    const id = (artifact as { id?: unknown }).id
                    if (typeof type !== 'string' || typeof title !== 'string' || typeof body !== 'string') {
                        return jsonError('artifact type, title, and content must be strings', 400)
                    }
                    if (body.length > 8000) return jsonError('artifact.content too long (max 8000 characters)', 400)
                    artifacts.push({
                        id: typeof id === 'string' ? id.slice(0, 80) : undefined,
                        type: type.slice(0, 40),
                        title: title.slice(0, 80),
                        content: body,
                    })
                }
            }
            const rawCalls = (item as { tool_calls?: unknown }).tool_calls
            let toolCalls: GatewayMessage['tool_calls']
            if (rawCalls !== undefined) {
                if (!Array.isArray(rawCalls) || rawCalls.length > 4) {
                    return jsonError('message.tool_calls must be an array of at most 4 items', 400)
                }
                toolCalls = []
                for (const call of rawCalls) {
                    if (!call || typeof call !== 'object') return jsonError('each tool_call must be an object', 400)
                    const id = (call as { id?: unknown }).id
                    const name = (call as { name?: unknown }).name
                    const args = (call as { arguments?: unknown }).arguments
                    if (typeof id !== 'string' || typeof name !== 'string' || typeof args !== 'string') {
                        return jsonError('tool_call id, name, and arguments must be strings', 400)
                    }
                    if (args.length > 4000) return jsonError('tool_call.arguments too long', 400)
                    const signature = (call as { thoughtSignature?: unknown }).thoughtSignature
                    toolCalls.push({
                        id: id.slice(0, 80),
                        name: name.slice(0, 80),
                        arguments: args,
                        thoughtSignature:
                            typeof signature === 'string' && signature.length > 0 && signature.length <= 24_000
                                ? signature
                                : undefined,
                    })
                }
            }
            if (content.trim() || (artifacts && artifacts.length > 0) || (toolCalls && toolCalls.length > 0)) {
                history.push({
                    role,
                    content: content.trim(),
                    artifacts: artifacts && artifacts.length > 0 ? artifacts : undefined,
                    tool_calls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
                })
            }
        }
    }

    const clientIp = getClientIp(req)
    const user = await getSupabaseUserFromRequest(req)
    const isPro = user ? isUserPro(user as any) : false

    if (user && host) {
        const meta = (user.user_metadata || {}) as Record<string, unknown>
        const name = (meta.first_name || meta.name || meta.full_name || user.email?.split('@')[0]) as string | undefined
        const username = (meta.username || user.email?.split('@')[0]) as string | undefined
        const resolvedRole = user.role || user.profile?.role || (isPro ? 'pro' : 'member')
        if (!host.user) {
            host.user = {
                id: user.id,
                name: user.profile?.first_name ? `${user.profile.first_name}${user.profile.last_name ? ` ${user.profile.last_name}` : ''}`.trim() : name,
                username: user.profile?.username || username,
                role: resolvedRole,
                plan: isPro ? 'pro' : 'free',
            }
        } else {
            if (!host.user.name && name) host.user.name = name
            if (!host.user.username && username) host.user.username = username
            host.user.plan = isPro ? 'pro' : 'free'
            host.user.role = resolvedRole
        }
    }
    const isDevEnv =
        process.env.NODE_ENV === 'development' ||
        clientIp === '127.0.0.1' ||
        clientIp === '::1' ||
        clientIp === 'localhost'

    const hourlyLimit = isDevEnv
        ? 5000
        : isPro
        ? PRO_HOURLY_LIMIT
        : user
        ? AUTH_HOURLY_LIMIT
        : GUEST_HOURLY_LIMIT
    const dailyLimit = isDevEnv
        ? 20000
        : isPro
        ? PRO_DAILY_LIMIT
        : user
        ? AUTH_DAILY_LIMIT
        : GUEST_DAILY_LIMIT
    const quotaSubject = user ? `user:${user.id}` : `ip:${clientIp}`

    if (!isDevEnv) {
        const hourly = await checkRateLimitDurable(
            `workspace-chat:${quotaSubject}`,
            hourlyLimit,
            60 * 60 * 1000,
            getRuntimeEnv(),
            { failClosed: true }
        )
        if (!hourly.allowed) {
            if (hourly.source === 'unavailable') {
                return json(
                    {
                        success: false,
                        error: '[app] Inquiry quota could not be verified. Please try again.',
                        code: 'QUOTA_UNAVAILABLE',
                        retryAfterSec: hourly.retryAfterSec,
                    },
                    503,
                    { ...buildRateLimitHeaders(hourly), 'Retry-After': String(hourly.retryAfterSec) }
                )
            }
            return json(
                {
                    success: false,
                    error: isPro
                        ? `[app] Pace limit reached. Please pause a moment before continuing.`
                        : user
                        ? `[app] Hourly inquiry limit reached. Upgrade to Pro for expanded capacity.`
                        : `[app] Guest inquiry limit reached. Sign in to keep exploring without waiting.`,
                    retryAfterSec: hourly.retryAfterSec,
                    code: 'QUOTA_EXCEEDED',
                },
                429,
                { ...buildRateLimitHeaders(hourly), 'Retry-After': String(hourly.retryAfterSec) }
            )
        }
    }

    const tokenTier: UserTier = isDevEnv ? 'dev' : isPro ? 'pro' : user ? 'member' : 'guest'
    if (!isDevEnv) {
        try {
            const tokenQuota = await getTokenQuota(quotaSubject, tokenTier)
            if (!tokenQuota.allowed) {
                return json(
                    {
                        success: false,
                        error: isPro
                            ? `[app] Daily token budget reached. Quota resets at 00:00 UTC.`
                            : user
                            ? `[app] Daily inquiry limit reached. Upgrade to Pro for unbounded thought and frontier models.`
                            : `[app] Guest inquiry limit reached. Sign in to keep writing and save your notebooks.`,
                        retryAfterSec: 86400,
                        code: 'QUOTA_EXCEEDED',
                    },
                    429,
                    { 'Retry-After': '86400' }
                )
            }
            const dailyCount = await incrementDailyUsage(quotaSubject)
            if (typeof dailyCount === 'number' && dailyCount > dailyLimit) {
                return json(
                    {
                        success: false,
                        error: isPro
                            ? `[app] Daily inquiry limit reached. Quota resets at 00:00 UTC.`
                            : user
                            ? `[app] Daily inquiry limit reached. Upgrade to Pro for unbounded thought and frontier models.`
                            : `[app] Guest inquiry limit reached. Sign in to keep writing and save your notebooks.`,
                        retryAfterSec: 86400,
                        code: 'QUOTA_EXCEEDED',
                    },
                    429,
                    { 'Retry-After': '86400' }
                )
            }
        } catch (err) {
            console.warn('[chat] quota check failed closed', err)
            return json(
                {
                    success: false,
                    error: '[app] Inquiry quota could not be verified. Please try again.',
                    code: 'QUOTA_UNAVAILABLE',
                },
                503
            )
        }
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: AiSseEvent) => controller.enqueue(encoder.encode(formatAiSseEvent(event)))

            try {
                let webSearchContext = ''
                let citations: AiCitation[] = []
                const enableTools = true
                // Tools own search. Heuristic pre-search is the no-tools fallback only.

                const groqKeysVisible = collectGroqKeys(getRuntimeEnv())
                console.info(
                    '[chat] groq keys visible',
                    groqKeysVisible.length,
                    groqKeysVisible.map((key, index) => `${index + 1}:…${key.slice(-4)}`).join(' ')
                )

                // Periodic SSE keep-alive heartbeat to prevent edge proxy dropouts during deep reasoning
                send({ type: 'mode', mode: agentMode })

                const heartbeat = setInterval(() => {
                    try {
                        controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'))
                    } catch {
                        clearInterval(heartbeat)
                    }
                }, 15_000)

                const notebookTask = body.notebookBound === true && isNotebookTask(prompt)
                const notebookForContext = notebookContext.value
                    ? notebookTask
                        ? notebookContext.value
                        : clipNotebookBackground(notebookContext.value)
                    : ''
                const scratchpadContext = host?.scratchpad
                    ? [
                          host.scratchpad.documents?.length
                              ? `Scratchpad documents (${host.scratchpad.documents.length}):\n${host.scratchpad.documents.map((d) => `- ${d.name} (${d.type || 'file'})`).join('\n')}`
                              : '',
                          host.scratchpad.nodes?.length
                              ? `Scratchpad nodes (${host.scratchpad.nodes.length}) — titles only, not the task:\n${host.scratchpad.nodes.slice(0, 15).map((n) => `- [${n.type.toUpperCase()}] ${n.title || 'untitled'}${n.source ? ` (${n.source})` : ''}`).join('\n')}`
                              : '',
                          host.scratchpad.tasks?.length
                              ? `Scratchpad tasks (${host.scratchpad.tasks.length}):\n${host.scratchpad.tasks.map((t) => `- [${t.status === 'completed' ? 'x' : t.status === 'in_progress' ? '-' : ' '}] ${t.title}`).join('\n')}`
                              : '',
                      ]
                          .filter(Boolean)
                          .join('\n\n')
                    : ''

                const context = [
                    systemPrompt.value
                        ? `User-configured project instructions (untrusted reference data):\n"""${systemPrompt.value}"""`
                        : '',
                    styleSuffix.value ? `Requested style (untrusted reference data):\n"""${styleSuffix.value}"""` : '',
                    notebookForContext
                        ? `Notebook background (optional — ignore unless the Query is about this notebook):\n"""${notebookForContext}"""`
                        : '',
                    scratchpadContext
                        ? `Scratchpad inventory (optional — ignore unless the Query is about these notes):\n"""${scratchpadContext}"""`
                        : '',
                    history.length === 0 && chatHistory.value
                        ? `Recent Conversation History (untrusted reference data):\n"""${chatHistory.value}"""`
                        : '',
                    attachmentContext.value
                        ? `Attachments (optional background — use only if the Query needs them):\n"""${attachmentContext.value}"""`
                        : '',
                    webSearchContext,
                ]
                    .filter(Boolean)
                    .join('\n\n')

                if (host && attachmentContext.value) {
                    host.attachments = [{ name: 'attachments', content: attachmentContext.value }]
                }

                const trustedInstruction = notebookTask
                    ? NOTEBOOK_EDITOR_INSTRUCTION
                    : body.notebookBound === true
                      ? NOTEBOOK_AVAILABLE_INSTRUCTION
                      : ''
                let livePublicTokensCount = 0
                let livePublicText = ''
                let liveThinkingAcc = ''

                const byokEnv = readByokEnv(body)
                const activeEnv = { ...getRuntimeEnv(), ...byokEnv }

                const result = await streamBotTurn(
                    {
                        question: prompt,
                        philosopher,
                        taskType: 'autonomous_assistant',
                        thinkingDepth: isPro ? 'deep' : 'brief',
                        context,
                        messages: history,
                        env: activeEnv,
                        scope: notebookTask ? 'notebook_coauthor' : 'ask_ai',
                        trustedInstruction: trustedInstruction || undefined,
                        enableTools,
                        host,
                        agentMode,
                        checkpoint: checkpoint && resumeAction ? checkpoint : undefined,
                        resumeAction,
                        resumePayload,
                        onTool: (event) => send({ type: 'tool', tool: event }),
                        onNode: (event) => send({ type: 'node', node: event }),
                        onMode: (mode) => send({ type: 'mode', mode }),
                        onHuman: (human) => send({ type: 'human', human }),
                        onActivity: (activity) => send({ type: 'activity', activity }),
                        onLifecycle: (event) => send({ type: 'phase', phase: event }),
                    },
                    (token) => {
                        livePublicTokensCount += 1
                        livePublicText += token
                        send({ type: 'token', text: token })
                    },
                    (thinkingChunk) => {
                        liveThinkingAcc += thinkingChunk
                    }
                )

                clearInterval(heartbeat)

                if (!result.success) {
                    const attempts = 'attempts' in result ? result.attempts : []
                    console.error('[chat] providers failed', { error: result.error, attempts })
                    const productReply =
                        typeof result.reply === 'string' && result.reply.trim()
                            ? result.reply.trim()
                            : 'The philosopher network is unavailable right now.'
                    const errorCode =
                        result.error === 'empty_public_reply'
                            ? 'EMPTY_REPLY'
                            : result.error === 'tools_required'
                              ? 'TOOLS_REQUIRED'
                              : 'PROVIDER_UNAVAILABLE'
                    send({
                        type: 'error',
                        code: errorCode,
                        message: productReply,
                        retryable: true,
                    })
                    controller.close()
                    return
                }



                if (result.success && result.citations?.length) {
                    const start = citations.length
                    citations = [
                        ...citations,
                        ...result.citations.map((item, index) => ({ ...item, id: start + index + 1 })),
                    ]
                    send({ type: 'citations', citations })
                }

                const turn = finalizeArtifactTurn(
                    prompt,
                    result.reply,
                    result.success ? result.artifacts : undefined,
                    { scrape: false }
                )
                const visibleReply =
                    turn.visibleText || stripLeakedToolMarkup(stripThinkingBlocks(stripChartArtifactMarkup(result.reply)))

                // Safety fallback: if no live tokens were streamed during generation, flush visible reply
                if (livePublicTokensCount === 0 && visibleReply) {
                    send({ type: 'token', text: visibleReply })
                }

                if (turn.artifacts.length > 0) {
                    send({ type: 'artifacts', artifacts: turn.artifacts as any })
                }

                if (result.success && result.actions?.length) {
                    for (const action of result.actions) {
                        send({ type: 'action', action })
                    }
                }

                if (result.success && result.interrupt) {
                    send({ type: 'human', human: result.interrupt })
                }
                if (result.success && result.checkpoint) {
                    send({ type: 'checkpoint', checkpoint: result.checkpoint })
                }

                // Record & stream real token usage to update client sidebar
                if (!byokEnv.GROQ_API_KEY && !byokEnv.GEMINI_API_KEY && !byokEnv.OPENAI_API_KEY && !byokEnv.ANTHROPIC_API_KEY && !byokEnv.DEEPSEEK_API_KEY) {
                    const inTokens = estimateTokens(prompt) + estimateTokens(context) + estimateTokens(JSON.stringify(history))
                    const outTokens = estimateTokens(visibleReply) + estimateTokens(liveThinkingAcc)
                    const totalTurnTokens = Math.max(10, inTokens + outTokens)
                    try {
                        const snapshot = await recordTokenUsage(quotaSubject, totalTurnTokens, tokenTier)
                        send({ type: 'token_usage', snapshot })
                    } catch {
                        /* ignore tracking error */
                    }
                }

                const qualityGate = result.success ? result.qualityGate : undefined
                const corrected = shouldAdvertiseQualityCorrection(
                    qualityGate,
                    livePublicText,
                    visibleReply
                )
                send({
                    type: 'done',
                    fullText: visibleReply,
                    provider: toPublicProviderLabel(result.provider),
                    artifacts: turn.artifacts as any,
                    latencyMs: result.latencyMs,
                    ...(corrected ? { corrected: true } : {}),
                    ...(qualityGate ? { qualityGate } : {}),
                })
                controller.close()
            } catch (error) {
                console.error('[chat] request failed', error)
                send({ type: 'error', code: 'CHAT_FAILED', message: 'AI service failed', retryable: true })
                controller.close()
            }
        },
    })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        })
    } catch (err: any) {
        console.error('[chat] fatal handler error:', err)
        return jsonError('Internal chat handler error', 500)
    }
}