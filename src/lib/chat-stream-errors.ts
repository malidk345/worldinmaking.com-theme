/**
 * Classify WIM AI /api/chat stream failures for InquiryStatusCard + telemetry.
 * Abort/stop must never become a connection error.
 */

export type ChatStreamErrorKind =
  | 'abort'
  | 'quota'
  | 'auth'
  | 'timeout'
  | 'server'
  | 'provider'
  | 'network'

/** Kinds that render InquiryStatusCard (abort never does). */
export type ChatStreamUiErrorKind = Exclude<ChatStreamErrorKind, 'abort'>

export type ClassifiedChatStreamError = {
  kind: ChatStreamErrorKind
  httpStatus?: number
  code?: string
  title: string
  userMessage: string
  /** Safe for one silent pre-stream retry (Failed to fetch / TypeError network only). */
  isTransientNetwork: boolean
}

const QUOTA_CODES = new Set([
  'QUOTA_EXCEEDED',
  'QUOTA_UNAVAILABLE',
  'RATE_LIMITED',
  'RATE_LIMIT_UNAVAILABLE',
])

const PROVIDER_CODES = new Set([
  'PROVIDER_UNAVAILABLE',
  'EMPTY_REPLY',
  'TOOLS_REQUIRED',
  'CHAT_FAILED',
])

const AUTH_CODES = new Set([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'AUTH_REQUIRED',
  'AUTH_EXPIRED',
  'SESSION_EXPIRED',
])

const TITLE_BY_KIND: Record<ChatStreamUiErrorKind, string> = {
  quota: 'Inquiry limit',
  auth: 'Session',
  timeout: 'Taking too long',
  server: 'Temporary issue',
  provider: 'Philosopher network',
  network: 'Connection',
}

const MESSAGE_BY_KIND: Record<ChatStreamUiErrorKind, string> = {
  quota: 'Inquiry limit reached. Please try again shortly.',
  auth: 'Please sign in again to continue this inquiry.',
  timeout: 'The reply took too long. Please try again.',
  server: 'Something went wrong on our side. Please try again.',
  provider: 'Philosopher network unavailable.',
  network: 'The reply could not be completed because of a connection error.',
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (err === 'client-stop') return true
  if (typeof err === 'string') {
    const lower = err.toLowerCase()
    return lower.includes('abort') || lower.includes('client-stop')
  }
  if (typeof err === 'object') {
    const e = err as { name?: unknown; message?: unknown; code?: unknown }
    if (e.name === 'AbortError') return true
    if (e.code === 20) return true // DOMException.ABORT_ERR
    const msg = String(e.message || '').toLowerCase()
    if (msg.includes('aborted') || msg.includes('abort') || msg.includes('client-stop')) return true
  }
  return false
}

function normalizeCode(code: unknown): string {
  return typeof code === 'string' ? code.trim().toUpperCase() : ''
}

function looksLikeAppQuotaMessage(message: string): boolean {
  const m = message.toLowerCase()
  return (
    message.includes('[app]') &&
    (m.includes('quota') ||
      m.includes('budget') ||
      m.includes('pace limit') ||
      m.includes('token'))
  )
}

/** True for classic browser network failures before any HTTP response. */
export function isTransientNetworkError(err: unknown): boolean {
  if (!err || isAbortError(err)) return false
  if (typeof err === 'string') {
    const lower = err.toLowerCase()
    return (
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('network request failed') ||
      lower.includes('load failed')
    )
  }
  if (typeof err === 'object') {
    const e = err as { name?: unknown; message?: unknown }
    const name = String(e.name || '')
    const msg = String(e.message || '').toLowerCase()
    if (name === 'TypeError' && (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed'))) {
      return true
    }
    if (name === 'NetworkError') return true
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
      return true
    }
  }
  return false
}

function buildResult(
  kind: ChatStreamErrorKind,
  opts?: { httpStatus?: number; code?: string; userMessage?: string }
): ClassifiedChatStreamError {
  if (kind === 'abort') {
    return {
      kind: 'abort',
      httpStatus: opts?.httpStatus,
      code: opts?.code,
      title: '',
      userMessage: '',
      isTransientNetwork: false,
    }
  }
  const ui = kind as ChatStreamUiErrorKind
  return {
    kind,
    httpStatus: opts?.httpStatus,
    code: opts?.code,
    title: TITLE_BY_KIND[ui],
    userMessage: opts?.userMessage?.trim() || MESSAGE_BY_KIND[ui],
    isTransientNetwork: false,
  }
}

/**
 * Map HTTP status + known API/SSE error codes to a product-safe kind.
 * Never classifies abort; callers must short-circuit abort first.
 */
export function classifyChatStreamError(input: {
  err?: unknown
  httpStatus?: number
  code?: string
  message?: string
}): ClassifiedChatStreamError {
  if (isAbortError(input.err) || input.code === 'ABORT' || input.code === 'CLIENT_STOP') {
    return buildResult('abort', { httpStatus: input.httpStatus, code: input.code })
  }

  const status = typeof input.httpStatus === 'number' ? input.httpStatus : undefined
  const code = normalizeCode(input.code || (input.err as { code?: unknown } | undefined)?.code)
  const message = String(
    input.message ||
      (typeof input.err === 'object' && input.err && 'message' in input.err
        ? (input.err as { message?: unknown }).message
        : typeof input.err === 'string'
          ? input.err
          : '') ||
      ''
  ).trim()

  if (
    status === 429 ||
    QUOTA_CODES.has(code) ||
    looksLikeAppQuotaMessage(message) ||
    (status === 503 && (QUOTA_CODES.has(code) || looksLikeAppQuotaMessage(message)))
  ) {
    const quotaMsg = message.startsWith('[app]')
      ? message.replace(/^\[app\]\s*/, '').slice(0, 220)
      : undefined
    return buildResult('quota', { httpStatus: status, code: code || undefined, userMessage: quotaMsg })
  }

  if (status === 401 || status === 403 || AUTH_CODES.has(code)) {
    return buildResult('auth', { httpStatus: status, code: code || undefined })
  }

  if (status === 504 || code === 'GATEWAY_TIMEOUT' || code === 'TIMEOUT') {
    return buildResult('timeout', { httpStatus: status, code: code || undefined })
  }

  if (
    status === 502 ||
    status === 500 ||
    status === 503 ||
    code === 'BAD_GATEWAY' ||
    code === 'CHAT_HANDLER_ERROR' ||
    code === 'INTERNAL_ERROR'
  ) {
    return buildResult('server', { httpStatus: status, code: code || undefined })
  }

  if (PROVIDER_CODES.has(code)) {
    // Prefer product copy; keep short scrubbed provider message when it is already product-safe.
    const providerMsg =
      message &&
      !message.toLowerCase().includes('failed to fetch') &&
      !/^chat api \d+/i.test(message)
        ? message.slice(0, 220)
        : undefined
    return buildResult('provider', {
      httpStatus: status,
      code: code || undefined,
      userMessage: providerMsg,
    })
  }

  if (isTransientNetworkError(input.err) || isTransientNetworkError(message)) {
    return {
      ...buildResult('network', { httpStatus: status, code: code || undefined }),
      isTransientNetwork: true,
    }
  }

  // HTTP-ish leftovers (e.g. 400 validation) — avoid "Connection" when we have a status.
  if (typeof status === 'number' && status >= 400) {
    if (status >= 500) return buildResult('server', { httpStatus: status, code: code || undefined })
    return buildResult('provider', { httpStatus: status, code: code || undefined })
  }

  return buildResult('network', { httpStatus: status, code: code || undefined })
}

/** Whether one silent retry is allowed (pre-stream network only). */
export function shouldSilentRetryChatStream(opts: {
  classified: ClassifiedChatStreamError
  hadPublicText: boolean
  attempt: number
  maxAttempts?: number
}): boolean {
  const max = opts.maxAttempts ?? 1
  if (opts.attempt >= max) return false
  if (opts.hadPublicText) return false
  if (opts.classified.kind === 'abort') return false
  if (opts.classified.kind === 'quota' || opts.classified.kind === 'auth') return false
  return opts.classified.isTransientNetwork === true
}

export function userFacingChatStreamMessage(
  kind: ChatStreamUiErrorKind,
  opts?: { message?: string }
): string {
  const message = String(opts?.message || '').trim()
  if (kind === 'quota' && message.startsWith('[app]')) {
    return message.replace(/^\[app\]\s*/, '').slice(0, 220)
  }
  return MESSAGE_BY_KIND[kind]
}

export function chatStreamErrorTelemetryProps(opts: {
  kind: ChatStreamErrorKind
  httpStatus?: number
  hadPublicText: boolean
  durationMs: number
  chunkCount?: number
  byteLength?: number
  agentMode?: string
  retried?: boolean
}): Record<string, string | number | boolean | undefined> {
  return {
    kind: opts.kind,
    httpStatus: opts.httpStatus,
    hadPublicText: opts.hadPublicText,
    durationMs: Math.max(0, Math.round(opts.durationMs)),
    chunkCount: opts.chunkCount,
    byteLength: opts.byteLength,
    agentMode: opts.agentMode,
    retried: opts.retried,
  }
}
