/**
 * GET  /api/chats?owner_key=...   → list owner's workspace chats
 * POST /api/chats                 → upsert one chat + messages
 *
 * Authz: Bearer Supabase JWT (preferred) or device owner_key + X-WIM-Owner-Key.
 */
export const runtime = 'edge'

import { resolveNotebookOwner } from '../../../../lib/api-authz'
import { isChatStoreUnavailable, listChatsWithMessages, upsertChatWithMessages, type StoredChatDTO } from '../../../lib/chat-store'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
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

        if (req.method === 'GET') {
            const auth = await resolveNotebookOwner(req, url.searchParams.get('owner_key'))
            if (!auth.ok) return json({ error: auth.error }, auth.status)
            const chats = await listChatsWithMessages(auth.ownerKey)
            return json({ chats, auth: { via: auth.via } })
        }

        if (req.method === 'POST') {
            const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
            const auth = await resolveNotebookOwner(req, body.owner_key as string | undefined)
            if (!auth.ok) return json({ error: auth.error }, auth.status)
            if (!body.chat || typeof body.chat !== 'object') return json({ error: 'chat is required' }, 400)
            const saved = await upsertChatWithMessages(auth.ownerKey, auth.userId, body.chat as StoredChatDTO)
            return json({ chat: saved, auth: { via: auth.via } })
        }

        return json({ error: 'Method not allowed' }, 405)
    } catch (err) {
        return storeError(err)
    }
}
