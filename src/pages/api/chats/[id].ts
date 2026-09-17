/**
 * GET    /api/chats/:id?owner_key=...
 * PATCH  /api/chats/:id  { owner_key, title?, starred?, share?, messageFeedback? }
 * DELETE /api/chats/:id?owner_key=...
 */
export const runtime = 'edge'

import { resolveNotebookOwner } from '../../../../lib/api-authz'
import {
    deleteChatForOwner,
    getChatForOwner,
    isChatStoreUnavailable,
    patchChatForOwner,
    setChatShare,
    setMessageLiked,
} from '../../../lib/chat-store'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function idFromUrl(url: URL): string {
    const parts = url.pathname.replace(/\/+$/, '').split('/')
    const id = parts[parts.length - 1] || ''
    if (!id || id === 'chats') return ''
    return decodeURIComponent(id)
}

function storeError(err: unknown) {
    if (isChatStoreUnavailable(err)) {
        return json(
            {
                error: 'Chat tables not ready',
                code: 'MIGRATION_REQUIRED',
                hint: 'Run supabase/migrations/20260813_workspace_chats.sql',
            },
            503
        )
    }
    const message = err && typeof err === 'object' && 'message' in err ? String((err as { message?: string }).message) : 'Chat store failed'
    const status = err && typeof err === 'object' && 'status' in err ? Number((err as { status?: number }).status) : 500
    return json({ error: message }, status >= 400 && status < 600 ? status : 500)
}

export default async function handler(req: Request) {
    try {
        const url = new URL(req.url)
        const id = idFromUrl(url)
        if (!id) return json({ error: 'chat id required' }, 400)

        if (req.method === 'GET') {
            const auth = await resolveNotebookOwner(req, url.searchParams.get('owner_key'))
            if (!auth.ok) return json({ error: auth.error }, auth.status)
            const chat = await getChatForOwner(id, auth.ownerKey)
            if (!chat) return json({ error: 'Not found' }, 404)
            return json({ chat, auth: { via: auth.via } })
        }

        if (req.method === 'PATCH') {
            const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
            const auth = await resolveNotebookOwner(req, body.owner_key as string | undefined)
            if (!auth.ok) return json({ error: auth.error }, auth.status)

            if (typeof body.share === 'boolean') {
                const chat = await setChatShare(id, auth.ownerKey, body.share)
                if (!chat) return json({ error: 'Not found' }, 404)
                return json({ chat, auth: { via: auth.via } })
            }

            const feedback = body.messageFeedback
            if (feedback && typeof feedback === 'object') {
                const messageId = (feedback as { messageId?: unknown }).messageId
                const liked = (feedback as { liked?: unknown }).liked
                if (typeof messageId !== 'string' || !messageId) return json({ error: 'messageFeedback.messageId required' }, 400)
                if (liked !== true && liked !== false && liked !== null) {
                    return json({ error: 'messageFeedback.liked must be boolean or null' }, 400)
                }
                await setMessageLiked(id, auth.ownerKey, messageId, liked)
            }

            const chat = await patchChatForOwner(id, auth.ownerKey, {
                title: typeof body.title === 'string' ? body.title : undefined,
                starred: typeof body.starred === 'boolean' ? body.starred : undefined,
                modelId: typeof body.modelId === 'string' ? body.modelId : undefined,
                thinkingBudget:
                    body.thinkingBudget === 'minimal' || body.thinkingBudget === 'balanced' || body.thinkingBudget === 'extended'
                        ? body.thinkingBudget
                        : undefined,
                webSearchEnabled: typeof body.webSearchEnabled === 'boolean' ? body.webSearchEnabled : undefined,
                projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
            })
            if (!chat) return json({ error: 'Not found' }, 404)
            return json({ chat, auth: { via: auth.via } })
        }

        if (req.method === 'DELETE') {
            const auth = await resolveNotebookOwner(req, url.searchParams.get('owner_key'))
            if (!auth.ok) return json({ error: auth.error }, auth.status)
            const deleted = await deleteChatForOwner(id, auth.ownerKey)
            if (!deleted) return json({ error: 'Not found' }, 404)
            return json({ ok: true })
        }

        return json({ error: 'Method not allowed' }, 405)
    } catch (err) {
        return storeError(err)
    }
}
