/**
 * GET /api/share/:token — public unlisted workspace chat.
 */
export const runtime = 'edge'

import { getSharedChatByToken, isChatStoreUnavailable } from '../../../lib/chat-store'
import { checkRateLimitDurable, buildRateLimitHeaders } from '../../../lib/bots/rate-limit'
import { getRuntimeEnv } from '../../../lib/bots/runtime-env'
import { getClientIp } from '../../../lib/bots/request-validation'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=60, stale-while-revalidate=300', ...headers },
    })
}

function tokenFromUrl(url: URL): string {
    const parts = url.pathname.replace(/\/+$/, '').split('/')
    const token = parts[parts.length - 1] || ''
    if (!token || token === 'share') return ''
    return decodeURIComponent(token)
}

export default async function handler(req: Request) {
    if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    const token = tokenFromUrl(new URL(req.url))
    if (!token) return json({ error: 'Share token required' }, 400)

    const env = getRuntimeEnv()
    const ip = getClientIp(req)
    const rate = await checkRateLimitDurable(`share:${ip}`, 60, 60 * 60 * 1000, env, { failClosed: false })
    if (!rate.allowed) {
        return json({ error: 'Rate limited' }, 429, buildRateLimitHeaders(rate))
    }

    try {
        const chat = await getSharedChatByToken(token)
        if (!chat) return json({ error: 'Not found' }, 404)
        return json({
            chat: {
                id: chat.id,
                title: chat.title,
                modelId: chat.modelId,
                createdAt: chat.createdAt,
                updatedAt: chat.updatedAt,
                messages: chat.messages.map((message) => ({
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    timestamp: message.timestamp,
                    modelUsed: message.modelUsed,
                    artifacts: message.artifacts,
                    citations: message.citations,
                })),
            },
        })
    } catch (err) {
        if (isChatStoreUnavailable(err)) {
            return json({ error: 'Chat tables not ready', code: 'MIGRATION_REQUIRED' }, 503)
        }
        return json({ error: 'Share lookup failed' }, 500)
    }
}
