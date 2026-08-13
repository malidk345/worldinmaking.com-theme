/**
 * GET  /api/notebooks?owner_key=...          → list owner's notebooks
 * GET  /api/notebooks?short_id=...&public=1  → published notebook by short_id
 * POST /api/notebooks                        → upsert one or many notebooks
 *
 * Authz (TSK-19):
 *   - Bearer Supabase JWT → owner forced to auth user id
 *   - Else device owner_key + matching X-WIM-Owner-Key header
 *   - History writes require ownership of the notebook id
 *
 * Cloudflare Pages (next-on-pages) requires Edge Runtime.
 */


import {
    listNotebooksByOwner,
    getNotebookByIdOrShort,
    upsertNotebook,
    upsertNotebooks,
    replaceHistoryForOwner,
    type StoredNotebookDTO,
    type NotebookVersionDTO,
} from '../../../../lib/notebooks-repo'
import { resolveNotebookOwner } from '../../../../lib/api-authz'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    try {
        const url = new URL(req.url)

        if (req.method === 'GET') {
            const claimedOwner = url.searchParams.get('owner_key') || ''
            const shortId = url.searchParams.get('short_id') || ''
            const asPublic = url.searchParams.get('public') === '1' || url.searchParams.get('public') === 'true'

            if (shortId && asPublic) {
                const nb = await getNotebookByIdOrShort(shortId, { publishedOnly: true })
                if (!nb) return json({ error: 'Not found' }, 404)
                return json({ notebook: nb })
            }

            const auth = await resolveNotebookOwner(req, claimedOwner)
            if (!auth.ok) return json({ error: auth.error }, auth.status)

            const notebooks = await listNotebooksByOwner(auth.ownerKey)
            return json({ notebooks, auth: { via: auth.via } })
        }

        if (req.method === 'POST') {
            const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
            const auth = await resolveNotebookOwner(req, body.owner_key as string | undefined)
            if (!auth.ok) return json({ error: auth.error }, auth.status)
            const ownerKey = auth.ownerKey

            if (Array.isArray(body.notebooks)) {
                const notebooks = body.notebooks as StoredNotebookDTO[]
                // Tag every notebook with auth_user_id when the user is JWT-authenticated
                const tagged = auth.userId
                    ? notebooks.map((nb) => ({ ...nb, auth_user_id: auth.userId }))
                    : notebooks
                const count = await upsertNotebooks(tagged, ownerKey)

                if (body.history && typeof body.history === 'object') {
                    const historyMap = body.history as Record<string, NotebookVersionDTO[]>
                    for (const [notebookId, entries] of Object.entries(historyMap)) {
                        if (Array.isArray(entries)) {
                            await replaceHistoryForOwner(notebookId, ownerKey, entries)
                        }
                    }
                }

                return json({ ok: true, count, auth: { via: auth.via } })
            }

            if (body.notebook) {
                const notebook = body.notebook as StoredNotebookDTO
                if (!notebook?.id) return json({ error: 'notebook.id is required' }, 400)
                // Tag with auth_user_id when JWT-authenticated
                const tagged = auth.userId ? { ...notebook, auth_user_id: auth.userId } : notebook
                const saved = await upsertNotebook(tagged, ownerKey)

                if (Array.isArray(body.history_entries)) {
                    await replaceHistoryForOwner(
                        notebook.id,
                        ownerKey,
                        body.history_entries as NotebookVersionDTO[]
                    )
                }

                return json({ notebook: saved, auth: { via: auth.via } })
            }

            return json({ error: 'notebook or notebooks required' }, 400)
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                Allow: 'GET, POST',
            },
        })
    } catch (err: any) {
        const message = err?.message || String(err)
        const status = typeof err?.status === 'number' ? err.status : 500
        if (message.includes('wim_notebooks') || message.includes('schema cache') || err?.code === 'PGRST205') {
            return json(
                {
                    error: 'Notebooks table not ready',
                    code: 'MIGRATION_REQUIRED',
                    hint: 'Run supabase/migrations/20260806_wim_notebooks.sql',
                },
                503
            )
        }
        if (status === 403) return json({ error: message }, 403)
        console.error('[api/notebooks]', err)
        return json({ error: message }, status >= 400 && status < 600 ? status : 500)
    }
}
