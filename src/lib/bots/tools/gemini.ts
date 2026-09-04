import type { ToolCall } from './execute'
import { OPENAI_CHAT_TOOLS, toGeminiFunctionDeclarations, type OpenAiToolSpec } from './spec'

export type OpenAiChatMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
        thoughtSignature?: string
    }>
    tool_call_id?: string
    /** Exact Gemini model parts from the last generateContent turn — replay as-is. */
    geminiModelParts?: GeminiPart[]
}

export type GeminiPart =
    | { text: string; thought?: boolean; thoughtSignature?: string }
    | { functionCall: { name: string; args?: Record<string, unknown> }; thoughtSignature?: string }
    | { functionResponse: { name: string; response: Record<string, unknown> } }

type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] }

function parseArgsObject(raw: string): Record<string, unknown> {
    try {
        const parsed = JSON.parse(raw || '{}')
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {}
    } catch {
        return {}
    }
}

function parseToolResponse(raw: string): Record<string, unknown> {
    try {
        const parsed = JSON.parse(raw || '{}')
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>
        }
    } catch {
        /* plain text tool result */
    }
    return { result: String(raw || '') }
}

function toolNameForId(messages: OpenAiChatMessage[], id?: string): string {
    if (!id) return 'unknown'
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const found = messages[index].tool_calls?.find((call) => call.id === id)
        if (found) return found.function.name
    }
    return 'unknown'
}

export function geminiPartThoughtSignature(part: Record<string, unknown> | null | undefined): string | undefined {
    if (!part || typeof part !== 'object') return undefined
    const direct = part.thoughtSignature || part.thought_signature
    if (typeof direct === 'string' && direct.trim()) return direct
    const call = part.functionCall
    if (call && typeof call === 'object' && !Array.isArray(call)) {
        const nested =
            (call as { thoughtSignature?: unknown; thought_signature?: unknown }).thoughtSignature ||
            (call as { thought_signature?: unknown }).thought_signature
        if (typeof nested === 'string' && nested.trim()) return nested
    }
    return undefined
}

function functionCallPart(
    name: string,
    args: Record<string, unknown>,
    thoughtSignature?: string
): GeminiPart {
    const part: { functionCall: { name: string; args?: Record<string, unknown> }; thoughtSignature?: string } = {
        functionCall: { name, args },
    }
    if (thoughtSignature) part.thoughtSignature = thoughtSignature
    return part
}

function firstThoughtSignature(
    calls: NonNullable<OpenAiChatMessage['tool_calls']>
): string | undefined {
    return calls.find((call) => call.thoughtSignature)?.thoughtSignature
}

export function openaiMessagesToGeminiContents(messages: OpenAiChatMessage[]): GeminiContent[] {
    const contents: GeminiContent[] = []
    let expectFunctionResponse = false

    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index]
        if (message.role === 'system') continue
        if (message.role === 'user') {
            expectFunctionResponse = false
            contents.push({ role: 'user', parts: [{ text: message.content || '' }] })
            continue
        }
        if (message.role === 'assistant') {
            if (message.geminiModelParts && message.geminiModelParts.length > 0) {
                contents.push({ role: 'model', parts: message.geminiModelParts })
                expectFunctionResponse = message.geminiModelParts.some((part) => 'functionCall' in part)
                continue
            }
            const calls = message.tool_calls || []
            const signed = Boolean(firstThoughtSignature(calls))
            // Gemini 3 400s if a functionCall part has no thought_signature.
            // Unsigned history (Groq traces, older turns) is flattened to text.
            if (calls.length > 0 && !signed) {
                const summary =
                    message.content ||
                    calls.map((call) => `Used ${call.function.name}`).join('\n') ||
                    'Used tools.'
                contents.push({ role: 'model', parts: [{ text: summary }] })
                expectFunctionResponse = false
                continue
            }
            const parts: GeminiPart[] = []
            if (message.content) parts.push({ text: message.content })
            const leadSignature = firstThoughtSignature(calls)
            calls.forEach((call, callIndex) => {
                const signature = call.thoughtSignature || (callIndex === 0 ? leadSignature : undefined)
                parts.push(functionCallPart(call.function.name, parseArgsObject(call.function.arguments), signature))
            })
            if (parts.length > 0) contents.push({ role: 'model', parts })
            expectFunctionResponse = calls.length > 0
            continue
        }
        if (message.role === 'tool') {
            const group = [message]
            while (index + 1 < messages.length && messages[index + 1].role === 'tool') {
                index += 1
                group.push(messages[index])
            }
            if (!expectFunctionResponse) {
                const text = group
                    .map((item) => `[${toolNameForId(messages, item.tool_call_id)}] ${item.content || ''}`.trim())
                    .join('\n')
                if (text) contents.push({ role: 'user', parts: [{ text }] })
                continue
            }
            contents.push({
                role: 'user',
                parts: group.map((item) => ({
                    functionResponse: {
                        name: toolNameForId(messages, item.tool_call_id),
                        response: parseToolResponse(item.content || ''),
                    },
                })),
            })
            expectFunctionResponse = false
        }
    }
    return contents
}

function appendModelPart(parts: GeminiPart[], next: GeminiPart): void {
    const last = parts[parts.length - 1]
    if ('text' in next && last && 'text' in last && Boolean(last.thought) === Boolean(next.thought) && !next.thoughtSignature) {
        last.text += next.text
        return
    }
    parts.push(next)
}

export async function geminiToolCompletion(params: {
    apiKey: string
    model: string
    systemPrompt: string
    messages: OpenAiChatMessage[]
    toolChoice: 'auto' | 'none' | 'web_search' | 'todo_write'
    onToken?: (text: string) => void
    onThinking?: (text: string) => void
    omitTools?: boolean
    maxTokens?: number
    timeoutMs?: number
    tools?: OpenAiToolSpec[]
    signal?: AbortSignal
}): Promise<
    | { ok: true; content: string; toolCalls: ToolCall[]; modelParts: GeminiPart[]; reasoning?: string }
    | { ok: false; detail: string; status?: number }
> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), params.timeoutMs || 45_000)
    const onExternalAbort = () => controller.abort()
    if (params.signal) {
        if (params.signal.aborted) {
            clearTimeout(timer)
            return { ok: false, detail: 'client request aborted' }
        }
        params.signal.addEventListener('abort', onExternalAbort, { once: true })
    }
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(params.apiKey)}`
        const functionCallingConfig =
            params.toolChoice === 'none'
                ? { mode: 'NONE' as const }
                : params.toolChoice === 'web_search'
                  ? { mode: 'ANY' as const, allowedFunctionNames: ['web_search'] }
                  : params.toolChoice === 'todo_write'
                    ? { mode: 'ANY' as const, allowedFunctionNames: ['todo_write'] }
                    : { mode: 'AUTO' as const }
        const baseBody: Record<string, unknown> = {
            systemInstruction: { parts: [{ text: params.systemPrompt }] },
            contents: openaiMessagesToGeminiContents(params.messages),
        }
        if (!params.omitTools) {
            baseBody.tools = [{ functionDeclarations: toGeminiFunctionDeclarations(params.tools || OPENAI_CHAT_TOOLS) }]
            baseBody.toolConfig = { functionCallingConfig }
        }
        const thinkingConfig = { thinkingBudget: params.omitTools ? 48 : 96, includeThoughts: true }
        let res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                ...baseBody,
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: params.maxTokens || (params.omitTools ? 48 : 8192),
                    thinkingConfig,
                },
            }),
        })
        if (!res.ok) {
            const raw = await res.text()
            const thinkingRejected =
                raw.toLowerCase().includes('thinkingconfig') ||
                raw.toLowerCase().includes('thinking_config') ||
                raw.toLowerCase().includes('includethoughts')
            if (!thinkingRejected) {
                return { ok: false, detail: `${res.status} ${raw.slice(0, 220)}`, status: res.status }
            }
            res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    ...baseBody,
                    generationConfig: { temperature: 0.6, maxOutputTokens: params.maxTokens || 4096 },
                }),
            })
            if (!res.ok) {
                const retryRaw = await res.text()
                return { ok: false, detail: `${res.status} ${retryRaw.slice(0, 220)}`, status: res.status }
            }
        }
        if (!res.body) return { ok: false, detail: 'No response body' }

        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let content = ''
        let reasoning = ''
        const toolCalls: ToolCall[] = []
        const modelParts: GeminiPart[] = []
        let lastThoughtSignature = ''

        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''
                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed.startsWith('data:')) continue
                    const payload = trimmed.slice(5).trim()
                    if (!payload || payload === '[DONE]') continue
                    try {
                        const data = JSON.parse(payload) as {
                            candidates?: Array<{
                                content?: { parts?: Array<Record<string, unknown>> }
                            }>
                        }
                        const parts = data.candidates?.[0]?.content?.parts || []
                        for (const part of parts) {
                            const signature = geminiPartThoughtSignature(part)
                            if (signature) lastThoughtSignature = signature
                            const call = part.functionCall as
                                | { name?: string; args?: Record<string, unknown> }
                                | undefined
                            if (call?.name) {
                                const thoughtSignature = signature || lastThoughtSignature || undefined
                                toolCalls.push({
                                    id: `gemini-${toolCalls.length}-${call.name}`,
                                    name: call.name,
                                    argumentsJson: JSON.stringify(call.args && typeof call.args === 'object' ? call.args : {}),
                                    thoughtSignature,
                                })
                                appendModelPart(
                                    modelParts,
                                    functionCallPart(
                                        call.name,
                                        call.args && typeof call.args === 'object' ? call.args : {},
                                        thoughtSignature
                                    )
                                )
                            } else if (signature && toolCalls.length > 0 && !toolCalls[toolCalls.length - 1].thoughtSignature) {
                                toolCalls[toolCalls.length - 1].thoughtSignature = signature
                                const lastPart = modelParts[modelParts.length - 1]
                                if (lastPart && 'functionCall' in lastPart && !lastPart.thoughtSignature) {
                                    lastPart.thoughtSignature = signature
                                }
                            }
                            const text = part.text
                            const isThought = part.thought === true
                            if (typeof text === 'string' && text) {
                                appendModelPart(modelParts, {
                                    text,
                                    ...(isThought ? { thought: true } : {}),
                                    ...(signature ? { thoughtSignature: signature } : {}),
                                })
                                if (isThought) {
                                    reasoning += text
                                    params.onThinking?.(text)
                                } else {
                                    content += text
                                    if (toolCalls.length === 0) {
                                        params.onToken?.(text)
                                    }
                                }
                            }
                        }
                    } catch {
                        /* ignore malformed SSE lines */
                    }
                }
            }
        } finally {
            reader.releaseLock()
        }

        if (toolCalls.length > 0 && lastThoughtSignature) {
            if (!toolCalls[0].thoughtSignature) toolCalls[0].thoughtSignature = lastThoughtSignature
            const firstFc = modelParts.find((part) => 'functionCall' in part)
            if (firstFc && 'functionCall' in firstFc && !firstFc.thoughtSignature) {
                firstFc.thoughtSignature = lastThoughtSignature
            }
        }

        return { ok: true, content, toolCalls, modelParts, reasoning }
    } catch (error) {
        if (params.signal?.aborted) return { ok: false, detail: 'client request aborted' }
        return { ok: false, detail: error instanceof Error ? error.message : 'fetch error' }
    } finally {
        clearTimeout(timer)
        params.signal?.removeEventListener('abort', onExternalAbort)
    }
}
