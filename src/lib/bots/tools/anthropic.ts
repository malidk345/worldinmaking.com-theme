import type { ToolCall } from './execute'
import { fetchWithTransientRetry } from './provider-retry'
import { OPENAI_CHAT_TOOLS, type OpenAiToolSpec } from './spec'
import type { ChatMessage } from './pipeline'
import { systemTextFromMessages } from './system-channel'

const ANTHROPIC_TIMEOUT_MS = 45_000

function linkAbortSignal(controller: AbortController, external?: AbortSignal): () => void {
    if (!external) return () => { /* no-op */ }
    if (external.aborted) {
        controller.abort()
        return () => { /* no-op */ }
    }
    const onAbort = () => controller.abort()
    external.addEventListener('abort', onAbort, { once: true })
    return () => external.removeEventListener('abort', onAbort)
}

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
}

function openaiToAnthropicMessages(messages: ChatMessage[]): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = []
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i]
        if (msg.role === 'system') continue

        if (msg.role === 'user' || msg.role === 'assistant') {
            const content = []
            if (msg.content) {
                content.push({ type: 'text', text: msg.content })
            }
            if (msg.tool_calls && msg.tool_calls.length > 0) {
                for (const call of msg.tool_calls) {
                    let parsedInput = {}
                    try {
                        parsedInput = JSON.parse(call.function.arguments || '{}')
                    } catch {
                        // ignore parse errors
                    }
                    content.push({
                        type: 'tool_use',
                        id: call.id,
                        name: call.function.name,
                        input: parsedInput,
                    })
                }
            }
            if (content.length > 0) {
                out.push({ role: msg.role, content })
            }
        } else if (msg.role === 'tool') {
            const last = out[out.length - 1]
            const toolBlock = {
                type: 'tool_result',
                tool_use_id: msg.tool_call_id,
                content: msg.content || '',
            }
            if (last && last.role === 'user' && Array.isArray(last.content)) {
                last.content.push(toolBlock)
            } else {
                out.push({ role: 'user', content: [toolBlock] })
            }
        }
    }
    return out
}

function openaiToAnthropicTools(tools: OpenAiToolSpec[]): Record<string, unknown>[] {
    return tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
    }))
}

export async function anthropicToolCompletion(params: {
    apiKey: string
    model: string
    systemPrompt?: string
    messages: ChatMessage[]
    toolChoice: 'auto' | 'none' | 'web_search' | 'todo_write'
    onToken?: (text: string) => void
    onThinking?: (text: string) => void
    omitTools?: boolean
    maxTokens?: number
    timeoutMs?: number
    tools?: OpenAiToolSpec[]
    signal?: AbortSignal
}): Promise<
    | { ok: true; content: string; toolCalls: ToolCall[]; reasoning?: string }
    | { ok: false; detail: string; status?: number }
> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), params.timeoutMs || ANTHROPIC_TIMEOUT_MS)
    const unlink = linkAbortSignal(controller, params.signal)
    if (params.signal?.aborted) {
        clearTimeout(timer)
        unlink()
        return { ok: false, detail: 'client request aborted' }
    }

    try {
        const body: Record<string, unknown> = {
            model: params.model,
            messages: openaiToAnthropicMessages(params.messages),
            max_tokens: params.maxTokens || 8192,
            stream: true,
        }

        const system = systemTextFromMessages(params.messages, params.systemPrompt || '')
        if (system) body.system = system

        if (!params.omitTools) {
            const rawTools = params.tools || OPENAI_CHAT_TOOLS
            if (rawTools.length > 0) {
                body.tools = openaiToAnthropicTools(rawTools)
                if (params.toolChoice !== 'none' && params.toolChoice !== 'auto') {
                    body.tool_choice = { type: 'tool', name: params.toolChoice }
                } else if (params.toolChoice === 'none') {
                    delete body.tools
                }
            }
        }

        const res = await fetchWithTransientRetry(
            'https://api.anthropic.com/v1/messages',
            {
                method: 'POST',
                headers: {
                    'x-api-key': params.apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            },
            { signal: controller.signal }
        )

        if (!res.ok) {
            const err = await res.text()
            return { ok: false, detail: `Anthropic Error: ${res.status} ${err.slice(0, 200)}`, status: res.status }
        }

        if (!res.body) return { ok: false, detail: 'No response body' }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let content = ''
        let reasoning = ''
        const toolCalls: ToolCall[] = []
        let currentToolCall: { id: string; name: string; arguments: string } | null = null

        try {
            const iterating = true
            while (iterating) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''
                for (const rawLine of lines) {
                    const line = rawLine.trim()
                    if (!line.startsWith('data: ')) continue
                    const data = line.slice(6)
                    if (data === '[DONE]') continue
                    try {
                        const parsed = JSON.parse(data)
                        if (parsed.type === 'content_block_delta') {
                            if (parsed.delta.type === 'text_delta' && typeof parsed.delta.text === 'string') {
                                content += parsed.delta.text
                                params.onToken?.(parsed.delta.text)
                            } else if (parsed.delta.type === 'thinking_delta' && typeof parsed.delta.thinking === 'string') {
                                reasoning += parsed.delta.thinking
                                params.onThinking?.(parsed.delta.thinking)
                            } else if (parsed.delta.type === 'input_json_delta' && currentToolCall) {
                                currentToolCall.arguments += parsed.delta.partial_json || ''
                            }
                        } else if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
                            currentToolCall = {
                                id: String(parsed.content_block.id || ''),
                                name: String(parsed.content_block.name || ''),
                                arguments: '',
                            }
                        } else if (parsed.type === 'content_block_stop' && currentToolCall) {
                            toolCalls.push({
                                id: currentToolCall.id,
                                name: currentToolCall.name,
                                argumentsJson: currentToolCall.arguments,
                            })
                            currentToolCall = null
                        }
                    } catch {
                        /* partial SSE line already held in buffer; ignore malformed data lines */
                    }
                }
            }
        } finally {
            reader.releaseLock()
        }

        return { ok: true, content, toolCalls, reasoning: reasoning.trim() || undefined }
    } catch (err: unknown) {
        if (params.signal?.aborted) return { ok: false, detail: 'client request aborted' }
        if (controller.signal.aborted) return { ok: false, detail: 'request timed out' }
        return { ok: false, detail: err instanceof Error ? err.message : 'Unknown error' }
    } finally {
        clearTimeout(timer)
        unlink()
    }
}
