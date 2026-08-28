/** Shared Groq/Gemini error classification. Gateway and the tool loop use this. */

export function isRateLimitDetail(detail: string): boolean {
    const d = String(detail || '').toLowerCase()
    return (
        d.startsWith('429') ||
        d.includes('rate limit') ||
        d.includes('rate_limit') ||
        d.includes('quota') ||
        d.includes('resource_exhausted') ||
        d.includes('too many requests')
    )
}

export function isAuthDetail(detail: string): boolean {
    const d = String(detail || '').toLowerCase()
    return (
        d.startsWith('401') ||
        d.startsWith('403') ||
        d.includes('invalid_api_key') ||
        d.includes('unauthorized') ||
        d.includes('forbidden')
    )
}

export function isRequestTooLargeDetail(detail: string): boolean {
    const d = String(detail || '').toLowerCase()
    if (d.startsWith('429')) return false
    return d.startsWith('413') || d.includes('request too large')
}

/** Groq/Gemini rejected the tool payload itself — try the next model, not the next key. */
export function isToolProtocolReject(detail: string): boolean {
    const d = String(detail || '').toLowerCase()
    if (d.includes('thought_signature') || d.includes('additionalproperties')) return false
    return d.startsWith('400') && (/\btool\b/.test(d) || /function.?call/.test(d))
}

export function runtimeLabel(provider?: string): string {
    const value = String(provider || '').toLowerCase()
    if (!value || value === 'none') return ''
    if (value.includes('gemini')) return 'Gemini'
    if (value.includes('groq') || value.includes('gpt-oss') || value.includes('qwen') || value.includes('llama')) {
        return 'Groq'
    }
    return ''
}
