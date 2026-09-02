/**
 * Models sometimes print a fake tool call in the public bubble
 * (`<tool_code>todo_write(...)</tool_code>`) instead of the function channel.
 * Strip that from what the user sees, and recover a real ToolCall when we can.
 */

import { resolveToolName, type ToolCall } from './execute'
import { ALLOWED_TOOL_NAMES } from './spec'

const LEAK_BLOCK = /<(tool_code|tool_call|invoke)\b[^>]*>[\s\S]*?<\/\1>/gi
const LEAK_UNCLOSED = /<(tool_code|tool_call|invoke)\b[^>]*>[\s\S]*$/gi
const LEAK_FENCE = /```(?:tool_code|tool_call|tool|json)[^\n]*\n[\s\S]*?```/gi
const CALL_IN_BLOCK = /(?:print\()?[ \t]*(?:default_api\.)?([A-Za-z_][\w]*)\s*\(([\s\S]*)\)[ \t]*\)?/
const BARE_CALL =
    /(?:^|\n)[ \t]*(?:print\()?[ \t]*(?:default_api\.)?(todo_write|switch_mode|ask_user|remember|finalize_plan|task|write_scratchpad|web_search|create_artifact)\s*\([\s\S]*?\)[ \t]*\)?[ \t]*(?=\n|$)/gi

function pythonishToJson(value: string): string {
    return value
        .replace(/\bNone\b/g, 'null')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":')
}

function splitTopLevel(value: string, separator: string): string[] {
    const parts: string[] = []
    let depth = 0
    let quote: string | null = null
    let start = 0
    for (let index = 0; index < value.length; index += 1) {
        const char = value[index]
        if (quote) {
            if (char === quote && value[index - 1] !== '\\') quote = null
            continue
        }
        if (char === '"' || char === "'") {
            quote = char
            continue
        }
        if (char === '{' || char === '[') depth += 1
        else if (char === '}' || char === ']') depth -= 1
        else if (char === separator && depth === 0) {
            parts.push(value.slice(start, index))
            start = index + 1
        }
    }
    parts.push(value.slice(start))
    return parts.map((part) => part.trim()).filter(Boolean)
}

function kwargsToJson(inner: string): string | null {
    const trimmed = inner.trim()
    if (!trimmed) return '{}'
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            JSON.parse(pythonishToJson(trimmed))
            return pythonishToJson(trimmed)
        } catch {
            /* kwargs path */
        }
    }
    const entries = splitTopLevel(trimmed, ',')
    const fields: string[] = []
    for (const entry of entries) {
        const eq = entry.indexOf('=')
        if (eq <= 0) continue
        const key = entry.slice(0, eq).trim()
        const raw = entry.slice(eq + 1).trim()
        if (!/^[A-Za-z_][\w]*$/.test(key)) continue
        try {
            JSON.parse(pythonishToJson(raw))
            fields.push(`"${key}":${pythonishToJson(raw)}`)
        } catch {
            fields.push(`"${key}":${JSON.stringify(raw)}`)
        }
    }
    if (!fields.length) return null
    return `{${fields.join(',')}}`
}

function callFromSource(source: string, index: number): ToolCall | null {
    const match = CALL_IN_BLOCK.exec(source.trim())
    if (!match) return null
    const name = resolveToolName(match[1])
    if (!ALLOWED_TOOL_NAMES.has(name)) return null
    const args = kwargsToJson(match[2] || '')
    if (!args) return null
    try {
        JSON.parse(args)
    } catch {
        return null
    }
    return {
        id: `leak-${name}-${index}`,
        name,
        argumentsJson: args,
    }
}

export function parseLeakedToolCalls(value: string): ToolCall[] {
    if (!value) return []
    const calls: ToolCall[] = []
    const seen = new Set<string>()
    const add = (source: string) => {
        const call = callFromSource(source, calls.length)
        if (!call) return
        const key = `${call.name}:${call.argumentsJson}`
        if (seen.has(key)) return
        seen.add(key)
        calls.push(call)
    }
    for (const block of value.match(LEAK_BLOCK) || []) add(block.replace(/<\/?[\w]+[^>]*>/g, ' '))
    for (const fence of value.match(LEAK_FENCE) || []) add(fence.replace(/```[\w]*/g, ' '))
    for (const bare of value.match(BARE_CALL) || []) add(bare)
    return calls
}

export function stripLeakedToolMarkup(value: string): string {
    if (!value) return ''
    let text = value
        .replace(LEAK_BLOCK, '')
        .replace(LEAK_FENCE, '')
        .replace(BARE_CALL, '\n')
        .replace(LEAK_UNCLOSED, '')
        .replace(/^\s*(?:print\()?[ \t]*(?:default_api\.)?(todo_write|switch_mode|ask_user|remember|finalize_plan|task)\s*\([\s\S]*$/i, '')
    text = text.replace(/\n{3,}/g, '\n\n').trim()
    return text
}

export function splitLeakedToolContent(value: string): { calls: ToolCall[]; cleaned: string } {
    return {
        calls: parseLeakedToolCalls(value),
        cleaned: stripLeakedToolMarkup(value),
    }
}
