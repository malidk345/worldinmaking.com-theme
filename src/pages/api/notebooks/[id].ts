export const config = { runtime: 'edge' }
/**
 * GET    /api/notebooks/:id?owner_key=...
 * PUT    /api/notebooks/:id  { owner_key, notebook, history_entries? }
 * DELETE /api/notebooks/:id?owner_key=...
 *
 * Authz (TSK-19): JWT or device key + X-WIM-Owner-Key; ownership enforced on write/history.
 *
 * Cloudflare Pages (next-on-pages) requires Edge Runtime.
 */


import {
    getNotebookByIdOrShort,
    upsertNotebook,
    deleteNotebook,
    replaceHistoryForOwner,
    listHistory,
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

/** Extract dynamic [id] from /api/notebooks/:id (edge Request has no req.query). */
function idFromUrl(url: URL): string {
    const parts = url.pathname.replace(/\/+$/, '').split('/')
    const id = parts[parts.length - 1] || ''
    if (!id || id === 'notebooks') return ''
    return decodeURIComponent(id)
}

export default async function handler(req: Request) {
    const url = new URL(req.url)
    const id = idFromUrl(url)
    if (!id) return json({ error: 'id required' }, 400)

    try {
        if (req.method === 'GET') {
            const claimedOwner = url.searchParams.get('owner_key') || ''
            const asPublic = url.searchParams.get('public') === '1' || url.searchParams.get('public') === 'true'

            if (asPublic) {
                const nb = await getNotebookByIdOrShort(id, { publishedOnly: true })
                if (!nb) return json({ error: 'Not found' }, 404)
                return json({ notebook: nb })
            }

            const auth = await resolveNotebookOwner(req, claimedOwner)
            if (!auth.ok) return json({ error: auth.error }, auth.status)

            const nb = await getNotebookByIdOrShort(id, { ownerKey: auth.ownerKey })
            if (!nb) return json({ error: 'Not found' }, 404)

            const includeHistory =
                url.searchParams.get('history') === '1' || url.searchParams.get('history') === 'true'
            if (includeHistory) {
                const history = await listHistory(nb.id)
                return json({ notebook: nb, history, auth: { via: auth.via } })
            }
            return json({ notebook: nb, auth: { via: auth.via } })
        }

        if (req.method === 'PUT') {
            const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
            const auth = await resolveNotebookOwner(req, body.owner_key as string | undefined)
            if (!auth.ok) return json({ error: auth.error }, auth.status)

            const notebook = (body.notebook || { ...body, id }) as StoredNotebookDTO
            notebook.id = notebook.id || id
            const saved = await upsertNotebook(notebook, auth.ownerKey)

            if (Array.isArray(body.history_entries)) {
                await replaceHistoryForOwner(saved.id, auth.ownerKey, body.history_entries as NotebookVersionDTO[])
            } else if (Array.isArray(body.history_append)) {
                await replaceHistoryForOwner(saved.id, auth.ownerKey, body.history_append as NotebookVersionDTO[])
            }

            return json({ notebook: saved, auth: { via: auth.via } })
        }

        if (req.method === 'DELETE') {
            let claimed = url.searchParams.get('owner_key') || ''
            if (!claimed) {
                const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
                claimed = (body.owner_key as string) || ''
            }
            const auth = await resolveNotebookOwner(req, claimed)
            if (!auth.ok) return json({ error: auth.error }, auth.status)

            const ok = await deleteNotebook(id, auth.ownerKey)
            if (!ok) return json({ error: 'Not found' }, 404)
            return json({ ok: true, auth: { via: auth.via } })
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                Allow: 'GET, PUT, DELETE',
            },
        })
    } catch (err: any) {
        const message = err?.message || String(err)
        const status = typeof err?.status === 'number' ? err.status : 500
        if (message.includes('wim_notebooks') || message.includes('schema cache') || err?.code === 'PGRST205') {
            return json({ error: 'Notebooks table not ready', code: 'MIGRATION_REQUIRED' }, 503)
        }
        if (status === 403) return json({ error: message }, 403)
        console.error('[api/notebooks/[id]]', err)
        return json({ error: message }, status >= 400 && status < 600 ? status : 500)
    }
}
