/**
 * Real-time BYOK API Key Verification Endpoint.
 * Tests client-provided private API keys with a minimal 1-token probe.
 * Edge runtime.
 */
export const runtime = 'edge'

import { readJsonObject } from 'lib/bots/request-validation'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

    const parsed = await readJsonObject(req, 1024 * 64)
    if (!parsed.ok) return json({ success: false, error: parsed.error }, parsed.status)
    const { provider, apiKey } = parsed.body as { provider?: string; apiKey?: string }

    if (!provider || !apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        return json({ success: false, valid: false, error: 'Provider and apiKey are required' }, 400)
    }

    const key = apiKey.trim()

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
            if (res.ok) return json({ success: true, valid: true })
            const errText = await res.text()
            return json({
                success: false,
                valid: false,
                error: res.status === 400 || res.status === 403 ? 'Geçersiz Gemini API Anahtarı' : `Gemini Hatası (${res.status}): ${errText.slice(0, 100)}`,
            })
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
            if (res.ok) return json({ success: true, valid: true })
            return json({
                success: false,
                valid: false,
                error: res.status === 401 ? 'Geçersiz Groq API Anahtarı' : `Groq Hatası (${res.status})`,
            })
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
            if (res.ok) return json({ success: true, valid: true })
            return json({
                success: false,
                valid: false,
                error: res.status === 401 ? 'Geçersiz OpenAI API Anahtarı' : `OpenAI Hatası (${res.status})`,
            })
        }

        if (provider === 'anthropic') {
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
            if (res.ok) return json({ success: true, valid: true })
            return json({
                success: false,
                valid: false,
                error: res.status === 401 ? 'Geçersiz Anthropic API Anahtarı' : `Anthropic Hatası (${res.status})`,
            })
        }

        return json({ success: false, valid: false, error: `Desteklenmeyen sağlayıcı: ${provider}` }, 400)
    } catch (err) {
        return json({
            success: false,
            valid: false,
            error: err instanceof Error ? err.message : 'Bağlantı hatası',
        })
    }
}
