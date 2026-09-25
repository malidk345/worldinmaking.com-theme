/**
 * Shared plumbing for the academic search sources: API keys, typed provider
 * failures, fetch with one polite retry, per-source cool-downs, serial
 * rate-limit queues and small text/DOI helpers.
 *
 * Split out of academic-search.ts so extra sources (TR Dizin, CORE, DOAJ,
 * encyclopedias) and the citation verifier can share it without import cycles.
 */

import { envFrom, getRuntimeEnv, type EnvStore } from './runtime-env'
import { searchFetchSignal } from './web-search'

export type AcademicSourceReason =
    | 'rate_limited'
    | 'timeout'
    | 'http_error'
    | 'network_error'
    | 'parse_error'
    | 'queue_busy'
    | 'error'
    | 'skipped_by_field'
    | 'skipped_by_filter'
    | 'cooldown'
    /** Source needs an API key that is not configured (never attempted). */
    | 'missing_key'
    /** The paper identifier we have cannot be used with this source. */
    | 'no_identifier'
    /** No open full text available from this source for the paper. */
    | 'no_fulltext'

const RETRY_AFTER_MAX_MS = 3_000
const DEFAULT_RETRY_BACKOFF_MS = 700
/** Leave at least this much of the source budget for the retried request. */
const RETRY_MIN_REMAINING_MS = 1_500
/** Never park a source for longer than this, even if the server asks for hours. */
const COOLDOWN_MAX_MS = 10 * 60_000
export const DEFAULT_ACADEMIC_CONTACT_EMAIL = 'dursunkayamustafa@gmail.com'

// Unicode property regexes are built via RegExp() because the repo's TS target
// rejects the `u` literal flag; runtime (V8 / Workers) supports them.
export const COMBINING_MARKS_RE = new RegExp('\\p{M}+', 'gu')
export const NON_LETTER_DIGIT_RE = new RegExp('[^\\p{L}\\p{N}]+', 'gu')
export const NON_LETTER_DIGIT_SPLIT_RE = new RegExp('[^\\p{L}\\p{N}]+', 'u')
export const QUERY_JUNK_RE = new RegExp('[^\\p{L}\\p{N}\\s-]', 'gu')
export const TOKEN_JUNK_RE = new RegExp('[^\\p{L}\\p{N}-]', 'gu')

// ---------------------------------------------------------------------------
// Keys / env
// ---------------------------------------------------------------------------

export interface AcademicApiKeys {
    openAlexKey?: string
    semanticScholarKey?: string
    ncbiKey?: string
    contactEmail: string
}

/** Reads optional academic API keys from the request env. Values are never logged. */
export function resolveAcademicApiKeys(env?: EnvStore): AcademicApiKeys {
    let store: EnvStore = {}
    try {
        store = env ?? getRuntimeEnv()
    } catch {
        store = env ?? {}
    }
    const email = envFrom(store, 'ACADEMIC_CONTACT_EMAIL')
    return {
        openAlexKey: envFrom(store, 'OPENALEX_API_KEY') || undefined,
        semanticScholarKey: envFrom(store, 'SEMANTIC_SCHOLAR_API_KEY') || undefined,
        ncbiKey: envFrom(store, 'NCBI_API_KEY') || undefined,
        contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : DEFAULT_ACADEMIC_CONTACT_EMAIL,
    }
}

export function userAgent(email: string): string {
    return `WorldInMaking/1.0 (https://worldinmaking.com; mailto:${email})`
}

// ---------------------------------------------------------------------------
// Abort / failure plumbing
// ---------------------------------------------------------------------------

export function abortError(): DOMException {
    return new DOMException('The operation was aborted.', 'AbortError')
}

export function assertAcademicNotAborted(signal?: AbortSignal): void {
    if (signal?.aborted) throw abortError()
}

/** A provider-level failure (never a client Stop). */
export class AcademicSourceError extends Error {
    reason: AcademicSourceReason
    httpStatus?: number
    constructor(reason: AcademicSourceReason, httpStatus?: number) {
        super(httpStatus ? `${reason} (HTTP ${httpStatus})` : reason)
        this.name = 'AcademicSourceError'
        this.reason = reason
        this.httpStatus = httpStatus
    }
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(abortError())
            return
        }
        const onAbort = () => {
            clearTimeout(timer)
            reject(abortError())
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort)
            resolve()
        }, Math.max(0, ms))
        signal?.addEventListener('abort', onAbort, { once: true })
    })
}

/** Retry-After / reset header → absolute epoch ms (seconds, HTTP date or ISO). */
function headerToEpochMs(value: string | null | undefined, now: number): number | null {
    if (value == null) return null
    const raw = String(value).trim()
    if (!raw) return null
    if (/^\d+(\.\d+)?$/.test(raw)) return now + Math.round(parseFloat(raw) * 1000)
    // CORE sends "2026-09-25T14:52:42+0000" (no colon in the offset).
    const at = Date.parse(raw.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'))
    return Number.isFinite(at) ? at : null
}

/**
 * Retry-After → delay in ms. Missing header → default backoff.
 * Returns null when the server asks for more than RETRY_AFTER_MAX_MS (do not retry).
 */
export function retryDelayFromHeader(value: string | null | undefined, now = Date.now()): number | null {
    if (value == null || String(value).trim() === '') return DEFAULT_RETRY_BACKOFF_MS
    const at = headerToEpochMs(value, now)
    if (at === null) return DEFAULT_RETRY_BACKOFF_MS
    const ms = at - now
    if (ms > RETRY_AFTER_MAX_MS) return null
    return Math.max(ms, 250)
}

export function readHeader(res: Response, name: string): string | null {
    try {
        return typeof res.headers?.get === 'function' ? res.headers.get(name) : null
    } catch {
        return null
    }
}

function isTimeoutError(err: unknown, signal?: AbortSignal): boolean {
    const name = err && typeof err === 'object' ? (err as { name?: unknown }).name : undefined
    return name === 'TimeoutError' || (name === 'AbortError' && !signal?.aborted)
}

// ---------------------------------------------------------------------------
// Per-source cool-down (module state = per isolate; survives across requests)
// ---------------------------------------------------------------------------

const cooldownUntil = new Map<string, number>()

export function sourceCooldownRemaining(key: string, now = Date.now()): number {
    const until = cooldownUntil.get(key) || 0
    return until > now ? until - now : 0
}

export function setSourceCooldown(key: string, untilMs: number, now = Date.now()): void {
    const capped = Math.min(untilMs, now + COOLDOWN_MAX_MS)
    if (capped > now) cooldownUntil.set(key, Math.max(capped, cooldownUntil.get(key) || 0))
}

/** Records a cool-down from Retry-After / X-RateLimit-Retry-After on a 429. */
function noteRateLimit(key: string | undefined, res: Response): void {
    if (!key) return
    const now = Date.now()
    const at =
        headerToEpochMs(readHeader(res, 'retry-after'), now) ??
        headerToEpochMs(readHeader(res, 'x-ratelimit-retry-after'), now) ??
        now + 30_000
    setSourceCooldown(key, at, now)
}

export interface FetchAcademicOptions {
    /** Enables per-source cool-down after a 429 (no request while parked). */
    cooldownKey?: string
    /** Disable the single retry (strict keyless quotas such as CORE). */
    noRetry?: boolean
}

/**
 * fetch with the source timeout, one retry on 429/5xx (short backoff, honours
 * Retry-After ≤ 3 s), and typed failures. Client Stop rethrows AbortError.
 * A 429 with a long Retry-After parks the source (`cooldown`) for later calls.
 */
export async function fetchAcademic(
    url: string,
    init: RequestInit,
    timeoutMs: number,
    signal?: AbortSignal,
    opts: FetchAcademicOptions = {}
): Promise<Response> {
    if (opts.cooldownKey && sourceCooldownRemaining(opts.cooldownKey) > 0) {
        throw new AcademicSourceError('cooldown')
    }
    const deadline = Date.now() + timeoutMs
    const attempts = opts.noRetry ? 1 : 2
    for (let attempt = 0; attempt < attempts; attempt++) {
        assertAcademicNotAborted(signal)
        const remaining = deadline - Date.now()
        if (remaining <= 0) throw new AcademicSourceError('timeout')
        let res: Response
        try {
            res = await fetch(url, { ...init, signal: searchFetchSignal(remaining, signal) })
        } catch (err) {
            if (signal?.aborted) throw abortError()
            if (isTimeoutError(err, signal)) throw new AcademicSourceError('timeout')
            throw new AcademicSourceError('network_error')
        }
        if (res.ok) return res
        const status = typeof res.status === 'number' ? res.status : 0
        const retryable = status === 429 || status >= 500
        const reason: AcademicSourceReason = status === 429 ? 'rate_limited' : 'http_error'
        if (status === 429) {
            const wait = retryDelayFromHeader(readHeader(res, 'retry-after'))
            if (wait === null || attempt === attempts - 1) noteRateLimit(opts.cooldownKey, res)
        }
        if (!retryable || attempt === attempts - 1) throw new AcademicSourceError(reason, status || undefined)
        const wait = retryDelayFromHeader(readHeader(res, 'retry-after'))
        if (wait === null || Date.now() + wait + RETRY_MIN_REMAINING_MS > deadline) {
            throw new AcademicSourceError(reason, status || undefined)
        }
        try {
            await res.body?.cancel()
        } catch {
            /* ignore */
        }
        await sleep(wait, signal)
    }
    throw new AcademicSourceError('error')
}

export async function readJson<T>(res: Response): Promise<T> {
    try {
        return (await res.json()) as T
    } catch {
        throw new AcademicSourceError('parse_error')
    }
}

export async function readText(res: Response): Promise<string> {
    try {
        return await res.text()
    } catch {
        throw new AcademicSourceError('parse_error')
    }
}

// ---------------------------------------------------------------------------
// Serial rate-limit queues (module-level; arXiv 1/3 s, CORE 5/10 s, DOAJ 2/s)
// ---------------------------------------------------------------------------

type QueueOutcome<T> = { skipped: true } | { value: T }

export interface SerialQueue {
    /** Runs `task` after the previous one started ≥ minIntervalMs ago; queue_busy if our slot is > maxWaitMs away. */
    run<T>(task: () => Promise<T>, maxWaitMs: number, signal?: AbortSignal): Promise<T>
    reset(minIntervalMs?: number): void
}

export function createSerialQueue(defaultIntervalMs: number): SerialQueue {
    let minIntervalMs = defaultIntervalMs
    let chain: Promise<unknown> = Promise.resolve()
    let lastStartedAt = 0
    return {
        reset(ms = defaultIntervalMs) {
            minIntervalMs = ms
            chain = Promise.resolve()
            lastStartedAt = 0
        },
        run<T>(task: () => Promise<T>, maxWaitMs: number, signal?: AbortSignal): Promise<T> {
            let cancelled = false
            let started = false
            let timer: ReturnType<typeof setTimeout> | undefined
            const turn: Promise<QueueOutcome<T>> = chain.then(async () => {
                if (cancelled || signal?.aborted) return { skipped: true as const }
                const wait = lastStartedAt + minIntervalMs - Date.now()
                if (wait > 0) {
                    try {
                        await sleep(wait, signal)
                    } catch {
                        return { skipped: true as const }
                    }
                }
                if (cancelled || signal?.aborted) return { skipped: true as const }
                started = true
                if (timer) clearTimeout(timer)
                lastStartedAt = Date.now()
                return { value: await task() }
            })
            chain = turn.catch(() => undefined)
            return new Promise<T>((resolve, reject) => {
                timer = setTimeout(() => {
                    if (!started) {
                        cancelled = true
                        reject(new AcademicSourceError('queue_busy'))
                    }
                }, Math.max(0, maxWaitMs))
                turn.then(
                    (out) => {
                        if (timer) clearTimeout(timer)
                        if ('value' in out) resolve(out.value)
                        else if (signal?.aborted) reject(abortError())
                        else reject(new AcademicSourceError('queue_busy'))
                    },
                    (err) => {
                        if (timer) clearTimeout(timer)
                        reject(err)
                    }
                )
            })
        },
    }
}

/**
 * Semantic Scholar allows ~1 request / s per key (keyless shares a small pool):
 * graph lookups (related papers, snippets) are serialized through this queue.
 */
export const s2Queue = createSerialQueue(1_100)

export function __resetCooldownsForTests(): void {
    cooldownUntil.clear()
}

// ---------------------------------------------------------------------------
// Text / DOI helpers
// ---------------------------------------------------------------------------

/** Lowercase, strip diacritics (NFKD), map Turkish dotless ı → i. */
export function foldText(value: string): string {
    return String(value || '')
        .normalize('NFKD')
        .replace(COMBINING_MARKS_RE, '')
        .replace(/ı/g, 'i')
        .toLowerCase()
}

export function decodeEntities(value: string): string {
    return value
        // Repository metadata (CORE) sometimes carries literal JS escapes: "Feenberg\u27s".
        .replace(/\\u([0-9a-fA-F]{4}|[0-9a-fA-F]{2}(?![0-9a-fA-F]))/g, (_m, hex: string) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;|&#x27;/g, "'")
        .replace(/&#8217;|&rsquo;/g, '’')
        .replace(/&#8216;|&lsquo;/g, '‘')
        .replace(/&#8220;|&ldquo;/g, '“')
        .replace(/&#8221;|&rdquo;/g, '”')
        .replace(/&#8211;|&ndash;/g, '–')
        .replace(/&#8212;|&mdash;/g, '—')
        .replace(/&hellip;|&#8230;/g, '…')
        .replace(/&nbsp;|&#160;/g, ' ')
        .replace(/&amp;/g, '&')
}

export function stripTags(value: string): string {
    return decodeEntities(String(value || '').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,;:!?)])/g, '$1')
        .trim()
}

export function clipText(value: string | undefined, max: number): string | undefined {
    if (!value) return undefined
    const text = value.replace(/\s+/g, ' ').trim()
    if (!text) return undefined
    return text.length > max ? `${text.slice(0, max)}…` : text
}

/** Clip at a word boundary; result (including the ellipsis) is ≤ max chars. */
export function truncateAtWord(text: string, max: number): string {
    const clean = String(text || '').replace(/\s+/g, ' ').trim()
    if (clean.length <= max) return clean
    const cut = clean.slice(0, Math.max(1, max - 1))
    const lastSpace = cut.lastIndexOf(' ')
    return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, '')}…`
}

/** Bare lowercase DOI ("10.x/y") from a DOI or doi.org URL; '' when not a DOI. */
export function cleanDoi(value?: string): string {
    const raw = String(value || '').trim()
    if (!raw) return ''
    const stripped = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim()
    return /^10\.\d{4,9}\/\S+$/.test(stripped) ? stripped.toLowerCase() : ''
}

export function doiUrl(value?: string): string | undefined {
    const doi = cleanDoi(value)
    return doi ? `https://doi.org/${doi}` : undefined
}

export function isPdfLike(url: string): boolean {
    return /\.pdf(\?|$)/i.test(url) || /arxiv\.org\/pdf|pmc\.ncbi|europepmc\.org\/articles|\/pdf\/?$/i.test(url)
}

export function pickOaPdfUrl(...candidates: Array<string | undefined | null>): string | undefined {
    const urls = candidates.filter((url): url is string => typeof url === 'string' && url.startsWith('http'))
    return urls.find(isPdfLike) || urls[0]
}

export async function mapWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
    let next = 0
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (next < items.length) {
            const item = items[next++]
            await fn(item)
        }
    })
    await Promise.all(workers)
}

const TURKISH_CHARS_RE = /[çğıöşüÇĞİÖŞÜ]/
const TURKISH_WORDS_RE =
    /(^|\s)(ve|bir|ile|icin|için|nedir|nasil|nasıl|uzerine|üzerine|hakkinda|hakkında|kavrami|kavramı|felsefesi|felsefe|sorunu|elestirisi|eleştirisi|dusuncesi|düşüncesi|toplum|tarihi|ahlak|varlik|varlık|bilgi|devlet|modernlesme|modernleşme)(?=\s|$)/i

// Turkish-only word endings (teknoloji, ontoloji, modernlesme, yabancilasma, gelismesi).
const TURKISH_SUFFIX_RE = /[a-z](oji|lesme|lasma|lesmesi|lasmasi|mesi|masi)(?=\s|$)/

/** Heuristic: Turkish letters or common Turkish function/topic words. */
export function looksTurkish(text: string): boolean {
    const t = String(text || '')
    if (!t.trim()) return false
    return TURKISH_CHARS_RE.test(t) || TURKISH_WORDS_RE.test(t.toLowerCase()) || TURKISH_SUFFIX_RE.test(t.toLowerCase())
}
