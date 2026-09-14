/**
 * Robust JSON repair engine specifically engineered for LLM tool call outputs.
 * Handles single quotes, unescaped newlines, trailing commas, Python literals (True/False/None),
 * truncated braces/brackets, comments, and markdown wrapper fences without external dependencies.
 * Edge-runtime safe.
 */

/**
 * Strips markdown code fences (e.g. ```json ... ```) or XML-like wrappers from LLM output.
 */
export function stripJsonEnclosures(raw: string): string {
    let text = String(raw || '').trim()
    // Remove markdown code fences
    const fenceMatch = /^```(?:json|javascript|js)?\s*([\s\S]*?)\s*```$/i.exec(text)
    if (fenceMatch) {
        text = fenceMatch[1].trim()
    }
    // Remove XML-like tags <json>...</json> or <tool_code>...</tool_code>
    const xmlMatch = /^<(?:json|tool_code|arguments)>\s*([\s\S]*?)\s*<\/(?:json|tool_code|arguments)>$/i.exec(text)
    if (xmlMatch) {
        text = xmlMatch[1].trim()
    }
    return text
}

/**
 * Normalizes Python-style literals to JSON standards.
 */
function normalizePythonLiterals(text: string): string {
    return text
        .replace(/\bNone\b/g, 'null')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
}

/**
 * Strips JS / JSON5 line and block comments.
 */
function stripComments(text: string): string {
    let result = ''
    let inString: string | null = null
    let i = 0
    const len = text.length

    while (i < len) {
        const char = text[i]
        const next = text[i + 1]

        if (inString) {
            result += char
            if (char === '\\') {
                if (i + 1 < len) {
                    result += text[i + 1]
                    i += 2
                    continue
                }
            } else if (char === inString) {
                inString = null
            }
            i += 1
            continue
        }

        if (char === '"' || char === "'") {
            inString = char
            result += char
            i += 1
            continue
        }

        // Single line comment
        if (char === '/' && next === '/') {
            i += 2
            while (i < len && text[i] !== '\n' && text[i] !== '\r') {
                i += 1
            }
            continue
        }

        // Multi-line comment
        if (char === '/' && next === '*') {
            i += 2
            while (i < len && !(text[i] === '*' && text[i + 1] === '/')) {
                i += 1
            }
            i += 2
            continue
        }

        result += char
        i += 1
    }

    return result
}

/**
 * Normalizes single-quoted keys and values into double-quoted JSON strings,
 * while safely escaping internal double-quotes and unescaped newlines.
 */
function normalizeQuotesAndEscapes(text: string): string {
    let result = ''
    let i = 0
    const len = text.length
    let inString: string | null = null
    let stringBuffer = ''

    while (i < len) {
        const char = text[i]

        if (inString !== null) {
            if (char === '\\') {
                const next = text[i + 1]
                if (inString === "'" && next === "'") {
                    // Escaped single quote inside single-quoted string -> unescaped single quote
                    stringBuffer += "'"
                    i += 2
                    continue
                }
                if (inString === '"' && next === '"') {
                    stringBuffer += '\\"'
                    i += 2
                    continue
                }
                stringBuffer += char + (next || '')
                i += 2
                continue
            }

            if (char === inString) {
                // Closing quote reached
                // Convert buffer into valid JSON double-quoted string
                const safeContent = stringBuffer
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t')
                result += `"${safeContent}"`
                inString = null
                stringBuffer = ''
                i += 1
                continue
            }

            // Inside string: accumulate characters
            stringBuffer += char
            i += 1
            continue
        }

        if (char === '"' || char === "'") {
            inString = char
            stringBuffer = ''
            i += 1
            continue
        }

        // Unquoted key detection: { key: "value" } -> { "key": "value" }
        if (
            (char === '{' || char === ',') &&
            i + 1 < len
        ) {
            result += char
            i += 1
            // Skip whitespace
            while (i < len && /\s/.test(text[i])) {
                result += text[i]
                i += 1
            }
            // Check for unquoted identifier
            const identMatch = /^[A-Za-z_$][\w$-]*/.exec(text.slice(i))
            if (identMatch) {
                const ident = identMatch[0]
                const afterIdent = text.slice(i + ident.length).trimStart()
                if (afterIdent.startsWith(':') && ident !== 'true' && ident !== 'false' && ident !== 'null') {
                    result += `"${ident}"`
                    i += ident.length
                    continue
                }
            }
            continue
        }

        result += char
        i += 1
    }

    if (inString !== null) {
        // String was unclosed (truncated)
        const safeContent = stringBuffer
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
        result += `"${safeContent}"`
    }

    return result
}

/**
 * Strips trailing commas before closing braces and brackets:
 * `{ "a": 1, }` -> `{ "a": 1 }`
 * `[ 1, 2, ]` -> `[ 1, 2 ]`
 */
function stripTrailingCommas(text: string): string {
    return text.replace(/,\s*([\]}])/g, '$1')
}

/**
 * Balances unclosed brackets and braces in truncated JSON strings.
 */
function balanceEnclosures(text: string): string {
    const stack: string[] = []
    let inString = false
    let escaped = false

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i]

        if (escaped) {
            escaped = false
            continue
        }

        if (char === '\\') {
            escaped = true
            continue
        }

        if (char === '"') {
            inString = !inString
            continue
        }

        if (inString) continue

        if (char === '{') stack.push('}')
        else if (char === '[') stack.push(']')
        else if (char === '}' || char === ']') {
            if (stack.length > 0 && stack[stack.length - 1] === char) {
                stack.pop()
            }
        }
    }

    let balanced = text.trimEnd()
    // If inside an open string at the very end, close it
    if (inString) {
        balanced += '"'
    }
    // Remove any trailing comma before closing
    balanced = balanced.replace(/,\s*$/, '')

    while (stack.length > 0) {
        balanced += stack.pop()
    }

    return balanced
}

/**
 * Finds the first balanced substring starting with `{` or `[`.
 */
export function extractFirstJsonSubstring(text: string): string | null {
    const startObj = text.indexOf('{')
    const startArr = text.indexOf('[')

    let start = -1
    let openChar = ''
    let closeChar = ''

    if (startObj >= 0 && (startArr < 0 || startObj < startArr)) {
        start = startObj
        openChar = '{'
        closeChar = '}'
    } else if (startArr >= 0) {
        start = startArr
        openChar = '['
        closeChar = ']'
    }

    if (start < 0) return null

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < text.length; i += 1) {
        const char = text[i]

        if (escaped) {
            escaped = false
            continue
        }

        if (char === '\\') {
            escaped = true
            continue
        }

        if (char === '"') {
            inString = !inString
            continue
        }

        if (inString) continue

        if (char === openChar) depth += 1
        else if (char === closeChar) {
            depth -= 1
            if (depth === 0) {
                return text.slice(start, i + 1)
            }
        }
    }

    // If truncated, return from start to end
    return text.slice(start)
}

/**
 * Repairs a malformed JSON string into valid JSON syntax.
 */
export function repairJsonString(raw: string): string {
    let clean = stripJsonEnclosures(raw)
    clean = normalizePythonLiterals(clean)
    clean = stripComments(clean)

    // Check if directly parseable
    try {
        JSON.parse(clean)
        return clean
    } catch {
        /* proceed with repair */
    }

    const candidate = extractFirstJsonSubstring(clean) || clean
    let repaired = normalizeQuotesAndEscapes(candidate)
    repaired = stripTrailingCommas(repaired)
    repaired = balanceEnclosures(repaired)

    return repaired
}

/**
 * Safely parses any LLM argument input into a Javascript object.
 * Returns null if the text contains no salvageable JSON object.
 */
export function repairAndParseJsonObject(raw: unknown): Record<string, unknown> | null {
    if (raw === null || raw === undefined) return {}
    if (typeof raw === 'object') {
        if (Array.isArray(raw)) return null
        return raw as Record<string, unknown>
    }

    const text = String(raw).trim()
    if (!text || text === 'null' || text === 'undefined' || text === '{}') return {}

    // 1. Direct parse attempt
    try {
        const direct = JSON.parse(text)
        if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
            return direct as Record<string, unknown>
        }
        if (direct == null) return {}
    } catch {
        /* proceed */
    }

    // 2. Repaired parse attempt
    try {
        const repaired = repairJsonString(text)
        const parsed = JSON.parse(repaired)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>
        }
    } catch {
        /* proceed */
    }

    // 3. Fallback: extract slice between outermost braces
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
        try {
            const sliced = text.slice(start, end + 1)
            const repairedSlice = repairJsonString(sliced)
            const parsed = JSON.parse(repairedSlice)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>
            }
        } catch {
            /* exhausted */
        }
    }

    return null
}
