import type { ToolCall } from './execute'
import { OPENAI_CHAT_TOOLS, type OpenAiToolSpec } from './spec'
import type { ChatMessage } from './pipeline'

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
    tools?: OpenAiToolSpec[]
    signal?: AbortSignal
}): Promise<
    | { ok: true; content: string; toolCalls: ToolCall[]; reasoning?: string }
    | { ok: false; detail: string; status?: number }
> {
    const controller = new AbortController()
    const onAbort = () => controller.abort()
    if (params.signal?.aborted) return { ok: false, detail: 'client request aborted' }
    params.signal?.addEventListener('abort', onAbort)

    try {
        const body: Record<string, unknown> = {
            model: params.model,
            messages: openaiToAnthropicMessages(params.messages),
            max_tokens: params.maxTokens || 8192,
            stream: true,
        }

        const systemArr: string[] = []
        if (params.systemPrompt) systemArr.push(params.systemPrompt)
        for (const m of params.messages) {
            if (m.role === 'system' && m.content) systemArr.push(m.content)
        }
        if (systemArr.length > 0) {
            body.system = systemArr.join('\n\n')
        }

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

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': params.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        })

        if (!res.ok) {
            const err = await res.text()
            return { ok: false, detail: `Anthropic Error: ${res.status} ${err.slice(0, 200)}`, status: res.status }
        }

        if (!res.body) return { ok: false, detail: 'No response body' }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let content = ''
        const toolCalls: ToolCall[] = []
        let currentToolCall: Record<string, unknown> | null = null

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                    const parsed = JSON.parse(data)
                    if (parsed.type === 'content_block_delta') {
                        if (parsed.delta.type === 'text_delta') {
                            content += parsed.delta.text
                            params.onToken?.(parsed.delta.text)
                        } else if (parsed.delta.type === 'input_json_delta') {
                            if (currentToolCall) {
                                currentToolCall.arguments += parsed.delta.partial_json
                            }
                        }
                    } else if (parsed.type === 'content_block_start') {
                        if (parsed.content_block.type === 'tool_use') {
                            currentToolCall = {
                                id: parsed.content_block.id,
                                name: parsed.content_block.name,
                                arguments: '',
                            }
                        }
                    } else if (parsed.type === 'content_block_stop') {
                        if (currentToolCall) {
                            toolCalls.push({
                                id: currentToolCall.id as string,
                                name: currentToolCall.name as string,
                                argumentsJson: currentToolCall.arguments as string,
                            })
                            currentToolCall = null
                        }
                    }
                } catch {
                    // Ignore parse errors on partial stream lines
                }
            }
        }

        return { ok: true, content, toolCalls }

    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return { ok: false, detail: 'client request aborted' }
        return { ok: false, detail: err instanceof Error ? err.message : 'Unknown error' }
    } finally {
        params.signal?.removeEventListener('abort', onAbort)
    }
}
