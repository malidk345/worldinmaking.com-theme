/**
 * Models sometimes print a fake tool call in the public bubble
 * (`<tool_code>todo_write(...)</tool_code>`) instead of the function channel.
 * Strip that from what the user sees, and recover a real ToolCall when we can.
 */

import { resolveToolName, type ToolCall } from './execute'
import { ALLOWED_TOOL_NAMES } from './spec'
import { repairAndParseJsonObject } from './json-repair'

const LEAK_BLOCK = /<(tool_code|tool_call|invoke)\b[^>]*>[\s\S]*?<\/\1>/gi
const LEAK_UNCLOSED = /<(tool_code|tool_call|invoke)\b[^>]*>[\s\S]*$/gi
const LEAK_FENCE = /```(?:tool_code|tool_call|tool|json)[^\n]*\n[\s\S]*?```/gi
const CALL_IN_BLOCK = /(?:print\()?[ \t]*(?:default_api\.)?([A-Za-z_][\w]*)\s*\(([\s\S]*)\)[ \t]*\)?/
const LEAKED_TOOL_NAMES = Array.from(ALLOWED_TOOL_NAMES).concat('ask_user').sort().join('|')
const BARE_CALL = new RegExp(
    `(?:^|\\n)[ \\t]*(?:print\\()?[ \\t]*(?:default_api\\.)?(${LEAKED_TOOL_NAMES})\\s*\\([\\s\\S]*?\\)[ \\t]*\\)?[ \\t]*(?=\\n|$)`,
    'gi'
)
const TRAILING_BARE_CALL = new RegExp(
    `^\\s*(?:print\\()?[ \\t]*(?:default_api\\.)?(${LEAKED_TOOL_NAMES})\\s*\\([\\s\\S]*$`,
    'i'
)

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
        const repaired = repairAndParseJsonObject(trimmed)
        if (repaired) return JSON.stringify(repaired)
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
    const parsed = repairAndParseJsonObject(args)
    if (!parsed) return null
    return {
        id: `leak-${name}-${index}`,
        name,
        argumentsJson: JSON.stringify(parsed),
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

// Em/en/hyphen dash variants — models echo host copy with any of them.
const DASH = '[-\\u2010-\\u2015]'
const HOST_ARTIFACT_MARKER = new RegExp(
    `^\\s*\\[(?:On[-\\s]?screen artifacts\\b[^\\]]*|Host note\\b[^\\]]*on[-\\s]?screen artifacts[^\\]]*|On screen ${DASH} revise with create_artifact[^\\]]*)\\]\\s*$`,
    'i'
)
const ARTIFACT_HEADING = /^\s*###\s+[A-Za-z][\w-]*\s+"[^"]*"(?:\s+id=\S+)?\s*$/
const ARTIFACT_TYPES =
    /^(?:model3d|canvas|react|html|mermaid|chart|simulation|posthog-analytics|table|markdown|svg|code|3d|3d_model|scene)$/i

function isHostArtifactMarker(line: string): boolean {
    return HOST_ARTIFACT_MARKER.test(line)
}

function isArtifactHeading(line: string): boolean {
    return ARTIFACT_HEADING.test(line)
}

function artifactHeadingType(line: string): string | null {
    const match = /^\s*###\s+([A-Za-z][\w-]*)\s+"/.exec(line)
    return match ? match[1]! : null
}

function skipBalancedJson(lines: string[], start: number, open: '{' | '['): number {
    let i = start
    let depth = 0
    const close = open === '{' ? '}' : ']'
    while (i < lines.length) {
        for (const ch of lines[i]!) {
            if (ch === open) depth += 1
            else if (ch === close) depth -= 1
        }
        i += 1
        if (depth <= 0) break
    }
    return i
}

/** Skip a ### type "title" id=... heading plus its body (JSON, fence, or stub). */
function skipArtifactDump(lines: string[], start: number): number {
    let i = start
    if (i >= lines.length || !isArtifactHeading(lines[i]!)) return start
    i += 1
    if (i >= lines.length) return i
    const first = lines[i]!.trim()
    if (first.startsWith('```')) {
        i += 1
        while (i < lines.length && !lines[i]!.trim().startsWith('```')) i += 1
        if (i < lines.length) i += 1
        return i
    }
    if (first.startsWith('{')) return skipBalancedJson(lines, i, '{')
    if (first.startsWith('[')) return skipBalancedJson(lines, i, '[')
    // Stub / omitted-body line, or non-JSON dump until blank / next marker / heading.
    while (
        i < lines.length &&
        lines[i]!.trim() !== '' &&
        !isHostArtifactMarker(lines[i]!) &&
        !isArtifactHeading(lines[i]!)
    ) {
        i += 1
    }
    return i
}


/**
 * Models sometimes echo host on-screen artifact memory
 * (`[On-screen artifacts — ...]`, `### model3d "..." id=...` + JSON) into the
 * public bubble. Strip those before persist/display.
 */
export function stripLeakedOnScreenArtifacts(value: string): string {
    if (!value) return ''
    const lines = value.split('\n')
    const out: string[] = []
    let i = 0
    while (i < lines.length) {
        const line = lines[i]!
        if (isHostArtifactMarker(line)) {
            i += 1
            while (i < lines.length && isArtifactHeading(lines[i]!)) {
                i = skipArtifactDump(lines, i)
            }
            continue
        }
        // Orphan ### type "title" dumps — with id=, or known artifact type + JSON/fence body.
        if (isArtifactHeading(line)) {
            const type = artifactHeadingType(line)
            const next = lines[i + 1]?.trim() || ''
            const known = Boolean(type && ARTIFACT_TYPES.test(type))
            const hasId = /\bid=/.test(line)
            const bodyLooksDump =
                next.startsWith('{') ||
                next.startsWith('[') ||
                next.startsWith('```') ||
                next.startsWith('[On screen') ||
                next.startsWith('[prior body omitted')
            if (hasId || (known && bodyLooksDump)) {
                i = skipArtifactDump(lines, i)
                continue
            }
        }
        out.push(line)
        i += 1
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function stripLeakedToolMarkup(value: string): string {
    if (!value) return ''
    let text = value
        .replace(LEAK_BLOCK, '')
        .replace(LEAK_FENCE, '')
        .replace(BARE_CALL, '\n')
        .replace(LEAK_UNCLOSED, '')
        .replace(TRAILING_BARE_CALL, '')
    text = stripLeakedOnScreenArtifacts(text)
    text = text.replace(/\n{3,}/g, '\n\n').trim()
    return text
}

/**
 * Per streamed chunk. The full-text strip trims, so "Hello" + " world" becomes
 * "Helloworld" if each piece is trimmed before it is joined. When the chunk
 * has no leak, keep it exactly — including the space at the edge.
 */
export function stripLeakedToolMarkupForStream(value: string): string {
    if (!value) return ''
    const stripped = stripLeakedToolMarkup(value)
    return stripped === value.trim() ? value : stripped
}

export function splitLeakedToolContent(value: string): { calls: ToolCall[]; cleaned: string } {
    return {
        calls: parseLeakedToolCalls(value),
        cleaned: stripLeakedToolMarkup(value),
    }
}
