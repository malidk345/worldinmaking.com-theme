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
import { checkRateLimit } from 'lib/bots/rate-limit'
import { getRuntimeEnv, envFrom } from 'lib/bots/runtime-env'
import { getClientIp, normalizeBotName, readJsonObject } from 'lib/bots/request-validation'
import { stripChartArtifactMarkup } from 'lib/ai/chart-artifacts'
import { stripThinkingBlocks } from 'lib/bots/thinking-tags'
import { formatAiSseEvent, type AiCitation, type AiSseEvent } from 'lib/ai/contracts'
import { finalizeArtifactTurn } from '../../lib/artifacts'
import { isNotebookTask, NOTEBOOK_AVAILABLE_INSTRUCTION, NOTEBOOK_EDITOR_INSTRUCTION } from '../../lib/notebook-chat-bind'
import { getSupabaseUserFromRequest } from '../../../lib/api-authz'
import { incrementDailyUsage, isChatStoreUnavailable } from '../../lib/chat-store'
import { collectGroqKeys, type GatewayMessage } from 'lib/bots/ai-gateway'
import { parseHostSnapshot } from 'lib/bots/tools/host'
import { isUserPro } from '../../lib/wim-billing'
import { estimateTokens, recordTokenUsage, getTokenQuota, type UserTier } from '../../lib/token-quota'

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

export default async function handler(req: Request) {
    if (req.method !== 'POST') return jsonError('Method not allowed', 405)

    try {
        const parsed = await readJsonObject(req, MAX_BODY_BYTES)
        if (!parsed.ok) return jsonError(parsed.error, parsed.status)
        const body = parsed.body

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt) return jsonError('Prompt is required.', 400)
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
        const hourly = checkRateLimit(`workspace-chat:${quotaSubject}`, hourlyLimit, 60 * 60 * 1000)
        if (!hourly.allowed) {
            return json(
                {
                    success: false,
                    error: isPro
                        ? `[app] Pace limit reached. Please pause a moment before continuing.`
                        : user
                        ? `[app] Hourly inquiry limit reached. Upgrade to Pro for expanded capacity.`
                        : `[app] Guest inquiry limit reached. Sign in to keep exploring without waiting.`,
                    retryAfterSec: hourly.retryAfterSec,
                },
                429,
                { 'Retry-After': String(hourly.retryAfterSec) }
            )
        }
    }

    try {
        if (!isDevEnv) {
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
                    },
                    429,
                    { 'Retry-After': '86400' }
                )
            }
        }
    } catch (err) {
        if (!isChatStoreUnavailable(err)) {
            console.warn('[chat] daily quota check failed', err)
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
                const heartbeat = setInterval(() => {
                    try {
                        controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'))
                    } catch {
                        clearInterval(heartbeat)
                    }
                }, 15_000)

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

                const notebookTask = body.notebookBound === true && isNotebookTask(prompt)
                const trustedInstruction = notebookTask
                    ? NOTEBOOK_EDITOR_INSTRUCTION
                    : body.notebookBound === true
                      ? NOTEBOOK_AVAILABLE_INSTRUCTION
                      : ''
                let livePublicTokensCount = 0
                let liveThinkingAcc = ''

                const byokEnv: Record<string, string> = {}
                const byokGroq = req.headers.get('x-byok-groq')
                const byokGemini = req.headers.get('x-byok-gemini')
                const byokOpenai = req.headers.get('x-byok-openai')
                const byokAnthropic = req.headers.get('x-byok-anthropic')
                if (byokGroq) byokEnv.GROQ_API_KEY = byokGroq
                if (byokGemini) byokEnv.GEMINI_API_KEY = byokGemini
                if (byokOpenai) byokEnv.OPENAI_API_KEY = byokOpenai
                if (byokAnthropic) byokEnv.ANTHROPIC_API_KEY = byokAnthropic
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
                        onTool: (event) => send({ type: 'tool', tool: event }),
                        onLifecycle: (event) => send({ type: 'phase', phase: event }),
                    },
                    (token) => {
                        livePublicTokensCount += 1
                        send({ type: 'token', text: token })
                    },
                    (thinkingChunk) => {
                        liveThinkingAcc += thinkingChunk
                        send({
                            type: 'thinking_step',
                            step: {
                                id: 'stream-think',
                                stepNumber: 1,
                                title: 'Thinking',
                                detail: liveThinkingAcc,
                                completed: false,
                                source: 'model_summary',
                            },
                        })
                    }
                )

                clearInterval(heartbeat)

                if (!result.success) {
                    const attempts = 'attempts' in result ? result.attempts : []
                    console.error('[chat] providers failed', { error: result.error, attempts })
                    const lastAttempt = (attempts[attempts.length - 1] || '').replace(/\s+/g, ' ').slice(0, 180)
                    send({
                        type: 'error',
                        code: 'PROVIDER_UNAVAILABLE',
                        message: lastAttempt ? `The reply could not be completed. ${lastAttempt}` : result.reply,
                        retryable: true,
                    })
                    controller.close()
                    return
                }

                if (liveThinkingAcc) {
                    send({
                        type: 'thinking_step',
                        step: {
                            id: 'stream-think',
                            stepNumber: 1,
                            title: 'Thinking',
                            detail: liveThinkingAcc,
                            completed: true,
                            source: 'model_summary',
                        },
                    })
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
                    turn.visibleText || stripThinkingBlocks(stripChartArtifactMarkup(result.reply))

                // Safety fallback: if no live tokens were streamed during generation, flush visible reply
                if (livePublicTokensCount === 0 && visibleReply) {
                    send({ type: 'token', text: visibleReply })
                }

                if (turn.artifacts.length > 0) {
                    send({ type: 'artifacts', artifacts: turn.artifacts })
                }

                if (result.success && result.actions?.length) {
                    for (const action of result.actions) {
                        send({ type: 'action', action })
                    }
                }

                // Record & stream real token usage to update client sidebar
                if (!byokGroq && !byokGemini && !byokOpenai && !byokAnthropic) {
                    const inTokens = estimateTokens(prompt) + estimateTokens(context) + estimateTokens(JSON.stringify(history))
                    const outTokens = estimateTokens(visibleReply) + estimateTokens(liveThinkingAcc)
                    const totalTurnTokens = Math.max(10, inTokens + outTokens)
                    try {
                        const tokenTier: UserTier = isDevEnv ? 'dev' : isPro ? 'pro' : user ? 'member' : 'guest'
                        const snapshot = await recordTokenUsage(quotaSubject, totalTurnTokens, tokenTier)
                        send({ type: 'token_usage', snapshot } as any)
                    } catch {
                        /* ignore tracking error */
                    }
                }

                send({
                    type: 'done',
                    fullText: visibleReply,
                    provider: result.provider,
                    artifacts: turn.artifacts,
                    latencyMs: result.latencyMs,
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
        return jsonError(err?.message || 'Internal chat handler error', 500)
    }
}
