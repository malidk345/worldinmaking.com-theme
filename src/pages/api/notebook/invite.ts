/**
 * GET  /api/notebook/invite?token=...  → preview (public metadata)
 * POST /api/notebook/invite { token }  → accept (JWT required)
 */
export const runtime = 'edge'

import { resolveNotebookOwner } from '../../../../lib/api-authz'
import { acceptNotebookInvite, getInvitePreview } from '../../../../lib/notebook-collaborators'
import { getNotebookByIdOrShort } from '../../../../lib/notebooks-repo'
import { isNotebookInviteToken } from '../../../lib/notebook-sharing'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    try {
        const url = new URL(req.url)
        let token = url.searchParams.get('token') || ''
        if (req.method === 'POST') {
            const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
            if (typeof body.token === 'string') token = body.token
        }
        token = token.trim()
        if (!isNotebookInviteToken(token)) return json({ error: 'Invite not found' }, 404)

        if (req.method === 'GET') {
            const preview = await getInvitePreview(token)
            if (!preview) return json({ error: 'Invite not found' }, 404)
            return json({ invite: preview })
        }

        if (req.method === 'POST') {
            const auth = await resolveNotebookOwner(req, undefined)
            if (!auth.ok) return json({ error: auth.error }, auth.status)
            if (auth.via !== 'jwt' || !auth.userId) {
                return json({ error: 'Sign in to join this notebook' }, 401)
            }
            const accepted = await acceptNotebookInvite(token, auth.userId)
            const notebook = await getNotebookByIdOrShort(accepted.notebook_id, {
                ownerKey: auth.ownerKey,
                userId: auth.userId,
            })
            return json({
                ok: true,
                already: accepted.already,
                notebook_id: accepted.notebook_id,
                role: accepted.role,
                notebook: notebook || null,
            })
        }

        return json({ error: 'Method not allowed' }, 405)
    } catch (err: any) {
        const message = err?.message || String(err)
        const status = typeof err?.status === 'number' ? err.status : 500
        if (message.includes('wim_notebook_invites') || message.includes('schema cache') || err?.code === 'PGRST205') {
            return json({ error: 'Invites table not ready', code: 'MIGRATION_REQUIRED' }, 503)
        }
        console.error('[api/notebook/invite]', err)
        return json({ error: message }, status >= 400 && status < 600 ? status : 500)
    }
}
