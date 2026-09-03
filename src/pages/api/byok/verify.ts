/**
 * Real-time BYOK API Key Verification Endpoint.
 * Tests client-provided private API keys with a minimal 1-token probe.
 * Edge runtime.
 *
 * Hardened: durable fail-closed rate limits; never echo provider err bodies
 * or exception messages (keys / upstream HTML can ride in those strings).
 */
export const runtime = 'edge'

import { checkRateLimitDurable, buildRateLimitHeaders } from 'lib/bots/rate-limit'
import { getRuntimeEnv } from 'lib/bots/runtime-env'
import { getClientIp, readJsonObject } from 'lib/bots/request-validation'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    })
}

const SUPPORTED = new Set(['gemini', 'groq', 'openai', 'anthropic', 'deepseek'])

function invalidKeyMessage(provider: string): string {
    switch (provider) {
        case 'gemini':
            return 'Geçersiz Gemini API Anahtarı'
        case 'groq':
            return 'Geçersiz Groq API Anahtarı'
        case 'openai':
            return 'Geçersiz OpenAI API Anahtarı'
        case 'anthropic':
            return 'Geçersiz Anthropic API Anahtarı'
        case 'deepseek':
            return 'Geçersiz DeepSeek API Anahtarı'
        default:
            return 'Geçersiz API anahtarı'
    }
}

function providerUnavailableMessage(provider: string, status: number): string {
    const label =
        provider === 'gemini'
            ? 'Gemini'
            : provider === 'groq'
              ? 'Groq'
              : provider === 'openai'
                ? 'OpenAI'
                : provider === 'anthropic'
                  ? 'Anthropic'
                  : provider === 'deepseek'
                    ? 'DeepSeek'
                    : 'Sağlayıcı'
    return `${label} doğrulaması başarısız (${status})`
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405)

    const env = getRuntimeEnv()
    const clientIp = getClientIp(req)
    // Probe endpoint accepts raw secrets — keep tight durable caps and fail closed.
    const aggregate = await checkRateLimitDurable(`llm:${clientIp}`, 60, 60 * 60 * 1000, env, { failClosed: true })
    const rl = await checkRateLimitDurable(`byok-verify:${clientIp}`, 20, 60 * 60 * 1000, env, { failClosed: true })
    if (aggregate.source === 'unavailable' || rl.source === 'unavailable') {
        const blocked = aggregate.source === 'unavailable' ? aggregate : rl
        return json(
            {
                success: false,
                valid: false,
                code: 'RATE_LIMIT_UNAVAILABLE',
                error: 'Rate limit store temporarily unavailable. Please try again.',
                retryAfterSec: blocked.retryAfterSec,
            },
            503,
            buildRateLimitHeaders(blocked)
        )
    }
    if (!aggregate.allowed || !rl.allowed) {
        const blocked = !aggregate.allowed ? aggregate : rl
        return json(
            {
                success: false,
                valid: false,
                code: 'RATE_LIMITED',
                error: `Rate limit exceeded. Retry in ${blocked.retryAfterSec}s`,
                retryAfterSec: blocked.retryAfterSec,
            },
            429,
            buildRateLimitHeaders(blocked)
        )
    }
    const rlHeaders = buildRateLimitHeaders(rl)

    const parsed = await readJsonObject(req, 1024 * 64)
    if (!parsed.ok) return json({ success: false, valid: false, error: parsed.error, code: 'INVALID_JSON' }, parsed.status, rlHeaders)
    const { provider, apiKey } = parsed.body as { provider?: string; apiKey?: string }

    if (!provider || typeof provider !== 'string' || !SUPPORTED.has(provider)) {
        return json(
            { success: false, valid: false, code: 'UNSUPPORTED_PROVIDER', error: 'Desteklenmeyen sağlayıcı' },
            400,
            rlHeaders
        )
    }

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        return json(
            { success: false, valid: false, code: 'MISSING_KEY', error: 'Provider and apiKey are required' },
            400,
            rlHeaders
        )
    }

    const key = apiKey.trim()
    if (key.length > 200) {
        return json(
            { success: false, valid: false, code: 'KEY_TOO_LONG', error: 'API key too long' },
            400,
            rlHeaders
        )
    }

    try {
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'ping' }] }],
                    generationConfig: { maxOutputTokens: 2 },
                }),
            })
            if (res.ok) return json({ success: true, valid: true }, 200, rlHeaders)
            // Drain body for connection reuse; never return it to the client.
            await res.text().catch(() => '')
            const authFail = res.status === 400 || res.status === 403
            return json(
                {
                    success: false,
                    valid: false,
                    code: authFail ? 'INVALID_KEY' : 'PROVIDER_ERROR',
                    error: authFail ? invalidKeyMessage(provider) : providerUnavailableMessage(provider, res.status),
                },
                200,
                rlHeaders
            )
        }

        if (provider === 'groq') {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: 'ping' }],
                    max_tokens: 2,
                }),
            })
            if (res.ok) return json({ success: true, valid: true }, 200, rlHeaders)
            await res.text().catch(() => '')
            const authFail = res.status === 401
            return json(
                {
                    success: false,
                    valid: false,
                    code: authFail ? 'INVALID_KEY' : 'PROVIDER_ERROR',
                    error: authFail ? invalidKeyMessage(provider) : providerUnavailableMessage(provider, res.status),
                },
                200,
                rlHeaders
            )
        }

        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: 'ping' }],
                    max_tokens: 2,
                }),
            })
            if (res.ok) return json({ success: true, valid: true }, 200, rlHeaders)
            await res.text().catch(() => '')
            const authFail = res.status === 401
            return json(
                {
                    success: false,
                    valid: false,
                    code: authFail ? 'INVALID_KEY' : 'PROVIDER_ERROR',
                    error: authFail ? invalidKeyMessage(provider) : providerUnavailableMessage(provider, res.status),
                },
                200,
                rlHeaders
            )
        }

        if (provider === 'deepseek') {
            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: 'ping' }],
                    max_tokens: 2,
                }),
            })
            if (res.ok) return json({ success: true, valid: true }, 200, rlHeaders)
            await res.text().catch(() => '')
            const authFail = res.status === 401
            return json(
                {
                    success: false,
                    valid: false,
                    code: authFail ? 'INVALID_KEY' : 'PROVIDER_ERROR',
                    error: authFail ? invalidKeyMessage(provider) : providerUnavailableMessage(provider, res.status),
                },
                200,
                rlHeaders
            )
        }

        // anthropic
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 2,
                messages: [{ role: 'user', content: 'ping' }],
            }),
        })
        if (res.ok) return json({ success: true, valid: true }, 200, rlHeaders)
        await res.text().catch(() => '')
        const authFail = res.status === 401
        return json(
            {
                success: false,
                valid: false,
                code: authFail ? 'INVALID_KEY' : 'PROVIDER_ERROR',
                error: authFail ? invalidKeyMessage(provider) : providerUnavailableMessage(provider, res.status),
            },
            200,
            rlHeaders
        )
    } catch {
        return json(
            {
                success: false,
                valid: false,
                code: 'VERIFY_FAILED',
                error: 'Bağlantı hatası',
            },
            503,
            rlHeaders
        )
    }
}