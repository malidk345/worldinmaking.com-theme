const MAX_BYTES = 200_000
const MAX_RESULT = 4_000
const FETCH_TIMEOUT_MS = 8_000
const DNS_TIMEOUT_MS = 2_500

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

export function isPrivateIPv6(host: string): boolean {
    const raw = host.toLowerCase().replace(/^\[|\]$/g, '')
    if (!raw.includes(':')) return false
    if (raw === '::' || raw === '::1') return true
    const mapped = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateIPv4(mapped[1])
    const first = raw.split(':')[0] || ''
    const n = Number.parseInt(first, 16)
    if (!Number.isFinite(n)) return true
    // fe80::/10 link-local, fc00::/7 unique local, ff00::/8 multicast, ::/8 loopback/unspecified-ish
    if ((n & 0xffc0) === 0xfe80) return true
    if ((n & 0xfe00) === 0xfc00) return true
    if ((n & 0xff00) === 0xff00) return true
    if (n === 0) return true
    return false
}

export function isBlockedAddress(host: string): boolean {
    const value = host.toLowerCase().replace(/^\[|\]$/g, '')
    if (!value) return true
    if (isPrivateIPv4(value)) return true
    if (value.includes(':')) return isPrivateIPv6(value)
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
    if (isBlockedAddress(host)) {
        return 'url is not allowed'
    }
    return null
}

type DohAnswer = { data?: string; type?: number }

async function dohLookup(name: string, type: 'A' | 'AAAA', signal: AbortSignal): Promise<string[]> {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`
    const res = await fetch(url, {
        method: 'GET',
        redirect: 'error',
        signal,
        headers: { Accept: 'application/dns-json' },
    })
    if (!res.ok) return []
    const body = (await res.json()) as { Status?: number; Answer?: DohAnswer[] }
    if (body.Status !== 0 || !Array.isArray(body.Answer)) return []
    const recordType = type === 'A' ? 1 : 28
    return body.Answer.filter((row) => row.type === recordType && typeof row.data === 'string').map((row) =>
        String(row.data).replace(/^\[|\]$/g, '').trim()
    )
}

/** Resolve hostname and refuse private/link-local/metadata answers. Fail closed if DNS is unavailable. */
export async function assertPublicHostname(host: string, signal?: AbortSignal): Promise<string | null> {
    const name = host.toLowerCase().replace(/^\[|\]$/g, '')
    if (!name) return 'url is not allowed'
    if (isBlockedAddress(name)) return 'url is not allowed'
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DNS_TIMEOUT_MS)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)
    try {
        const [v4, v6] = await Promise.all([dohLookup(name, 'A', controller.signal), dohLookup(name, 'AAAA', controller.signal)])
        const records = [...v4, ...v6]
        if (!records.length) return 'url is not allowed'
        if (records.some((address) => isBlockedAddress(address))) return 'url is not allowed'
        return null
    } catch {
        return 'url is not allowed'
    } finally {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
    }
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
    let parsed: URL
    try {
        parsed = new URL(rawUrl)
    } catch {
        return { ok: false, error: 'url is invalid' }
    }
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        const ipv4Literal = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
        if (!ipv4Literal && !host.includes(':')) {
            const resolved = await assertPublicHostname(host, controller.signal)
            if (resolved) return { ok: false, error: resolved }
        }
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
