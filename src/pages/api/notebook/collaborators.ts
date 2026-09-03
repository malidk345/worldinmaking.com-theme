/**
 * GET    /api/notebook/collaborators?notebook_id=...
 * POST   /api/notebook/collaborators  { notebook_id, handle?, role?, link? }
 * DELETE /api/notebook/collaborators  { notebook_id, user_id? | invite_id? }
 *
 * Invite people to write on a notebook. JWT required.
 */
export const runtime = 'edge'

import { isOwnerKey, resolveNotebookOwner } from '../../../../lib/api-authz'
import {
    createNotebookInvite,
    listNotebookPeople,
    removeNotebookCollaborator,
    revokeNotebookInvite,
} from '../../../../lib/notebook-collaborators'
import { getNotebookByIdOrShort, upsertNotebook, type StoredNotebookDTO } from '../../../../lib/notebooks-repo'
import { canManageNotebookPeople, notebookInviteUrl, parseInviteHandle } from '../../../lib/notebook-sharing'
import { checkRateLimitDurable, buildRateLimitHeaders } from '../../../lib/bots/rate-limit'
import { getRuntimeEnv } from '../../../lib/bots/runtime-env'

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    })
}

function originFromRequest(req: Request): string {
    try {
        const url = new URL(req.url)
        const forwarded = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host
        const proto = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'https'
        return `${proto}://${forwarded}`
    } catch {
        return 'https://worldinmaking.com'
    }
}

export default async function handler(req: Request) {
    try {
        const url = new URL(req.url)
        const claimed =
            url.searchParams.get('owner_key') ||
            (req.method === 'GET' ? '' : '')
        let body: Record<string, unknown> = {}
        if (req.method !== 'GET') {
            body = (await req.json().catch(() => ({}))) as Record<string, unknown>
        }

        const auth = await resolveNotebookOwner(req, (body.owner_key as string) || claimed)
        if (!auth.ok) return json({ error: auth.error }, auth.status)
        if (auth.via !== 'jwt' || !auth.userId) {
            return json({ error: 'Sign in to invite people to a notebook' }, 401)
        }

        const notebookId = String(
            url.searchParams.get('notebook_id') || body.notebook_id || body.notebookId || ''
        ).trim()
        if (!notebookId) return json({ error: 'notebook_id required' }, 400)

        const deviceKey = (req.headers.get('x-wim-device-key') || '').trim()
        const extraOwnerKeys = isOwnerKey(deviceKey) && deviceKey !== auth.ownerKey ? [deviceKey] : []

        let notebook = await getNotebookByIdOrShort(notebookId, {
            ownerKey: auth.ownerKey,
            userId: auth.userId,
            extraOwnerKeys,
        })
        if (!notebook && req.method === 'POST' && body.notebook && typeof body.notebook === 'object') {
            const payload = body.notebook as StoredNotebookDTO
            payload.id = payload.id || notebookId
            notebook = await upsertNotebook(payload, auth.ownerKey, auth.userId, extraOwnerKeys)
        }
        if (!notebook) {
            return json(
                { error: 'This notebook is not saved to your account yet. Save it, then invite.' },
                404
            )
        }
        const role = notebook.access_role || 'owner'

        if (req.method === 'GET') {
            const people = await listNotebookPeople(notebook.id, {
                userId: notebook.auth_user_id || (role === 'owner' ? auth.userId : null),
                createdBy: notebook.created_by,
            })
            return json({
                notebook_id: notebook.id,
                access_role: role,
                ...people,
            })
        }

        if (req.method === 'POST') {
            if (!canManageNotebookPeople(role)) {
                return json({ error: 'You can view this notebook, but you cannot invite people' }, 403)
            }
            const env = getRuntimeEnv()
            const rl = await checkRateLimitDurable(
                `nb-invite:${auth.userId}`,
                40,
                60 * 60 * 1000,
                env
            )
            if (rl.source === 'unavailable') {
                return json(
                    { error: 'Rate limit store temporarily unavailable. Please try again.' },
                    503,
                    buildRateLimitHeaders(rl)
                )
            }
            if (!rl.allowed) {
                return json({ error: 'Too many invites. Try again later.' }, 429, buildRateLimitHeaders(rl))
            }

            const handleRaw = typeof body.handle === 'string' ? body.handle : typeof body.email === 'string' ? body.email : ''
            const linkOnly = body.link === true || body.linkOnly === true || !handleRaw.trim()
            if (!linkOnly && !parseInviteHandle(handleRaw)) {
                return json({ error: 'Enter a username (@name) or email' }, 400)
            }

            const created = await createNotebookInvite({
                notebookId: notebook.id,
                invitedBy: auth.userId,
                ownerUserId: notebook.auth_user_id,
                handle: handleRaw,
                role: body.role,
                linkOnly,
            })
            return json({
                ok: true,
                added: created.added,
                invite: created.invite,
                collaborator: created.collaborator || null,
                url: notebookInviteUrl(created.invite.token, originFromRequest(req)),
                path: created.urlPath,
            })
        }

        if (req.method === 'DELETE') {
            const targetUserId = String(body.user_id || body.userId || url.searchParams.get('user_id') || '').trim()
            const inviteId = String(body.invite_id || body.inviteId || url.searchParams.get('invite_id') || '').trim()
            const token = String(body.token || url.searchParams.get('token') || '').trim()

            if (inviteId || token) {
                if (!canManageNotebookPeople(role)) return json({ error: 'Forbidden' }, 403)
                const ok = await revokeNotebookInvite({
                    notebookId: notebook.id,
                    inviteId: inviteId || undefined,
                    token: token || undefined,
                })
                return json({ ok })
            }

            if (!targetUserId) return json({ error: 'user_id required' }, 400)
            if (targetUserId !== auth.userId && !canManageNotebookPeople(role)) {
                return json({ error: 'Forbidden' }, 403)
            }
            if (targetUserId === (notebook.auth_user_id || '') && targetUserId !== auth.userId) {
                return json({ error: 'The owner cannot be removed' }, 400)
            }
            const ok = await removeNotebookCollaborator({
                notebookId: notebook.id,
                targetUserId,
                actorUserId: auth.userId,
                actorRole: role,
            })
            return json({ ok })
        }

        return json({ error: 'Method not allowed' }, 405)
    } catch (err: any) {
        const message = err?.message || String(err)
        const status = typeof err?.status === 'number' ? err.status : 500
        if (message.includes('wim_notebook_collaborators') || message.includes('schema cache') || err?.code === 'PGRST205') {
            return json(
                {
                    error: 'Collaborators table not ready',
                    code: 'MIGRATION_REQUIRED',
                    hint: 'Run supabase/migrations/20260903_notebook_collaborators.sql',
                },
                503
            )
        }
        console.error('[api/notebook/collaborators]', err)
        return json({ error: message }, status >= 400 && status < 600 ? status : 500)
    }
}
