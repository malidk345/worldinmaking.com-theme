const MAX_BYTES = 200_000
const MAX_RESULT = 4_000
const FETCH_TIMEOUT_MS = 8_000

const BLOCKED_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '[::1]',
    'metadata.google.internal',
    'metadata.google.com',
])

export function isPrivateIPv4(host: string): boolean {
    const parts = host.split('.').map((part) => Number(part))
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        return false
    }
    const [a, b] = parts
    if (a === 10 || a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
}

export function isBlockedFetchUrl(raw: string): string | null {
    let parsed: URL
    try {
        parsed = new URL(raw)
    } catch {
        return 'url is invalid'
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'url must be http or https'
    }
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.internal')) {
        return 'url is not allowed'
    }
    if (isPrivateIPv4(host) || host.includes(':')) {
        return 'url is not allowed'
    }
    return null
}

function stripMarkup(value: string): string {
    return value
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
}

export async function fetchPublicUrl(rawUrl: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
    const blocked = isBlockedFetchUrl(rawUrl)
    if (blocked) return { ok: false, error: blocked }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        const res = await fetch(rawUrl, {
            method: 'GET',
            redirect: 'error',
            signal: controller.signal,
            headers: { 'User-Agent': 'WorldInMaking-AskAI/1.0', Accept: 'text/html,text/plain,application/json' },
        })
        if (!res.ok) return { ok: false, error: `fetch failed (${res.status})` }
        const buf = new Uint8Array(await res.arrayBuffer())
        const slice = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf
        const decoded = new TextDecoder('utf-8', { fatal: false }).decode(slice)
        const text = stripMarkup(decoded).slice(0, MAX_RESULT)
        if (!text) return { ok: false, error: 'page had no readable text' }
        return { ok: true, text }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'fetch failed'
        return { ok: false, error: message.slice(0, 180) }
    } finally {
        clearTimeout(timer)
    }
}
