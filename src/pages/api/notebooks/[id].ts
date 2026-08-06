/**
 * GET    /api/notebooks/:id?owner_key=...
 * PUT    /api/notebooks/:id  { owner_key, notebook, history_entries? }
 * DELETE /api/notebooks/:id?owner_key=...
 *
 * Cloudflare Pages (next-on-pages) requires Edge Runtime.
 */
export const runtime = 'edge'

import {
    getNotebookByIdOrShort,
    upsertNotebook,
    deleteNotebook,
    replaceHistory,
    listHistory,
    type StoredNotebookDTO,
    type NotebookVersionDTO,
} from '../../../../lib/notebooks-repo'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function isOwnerKey(v: unknown): v is string {
    return typeof v === 'string' && v.length >= 8 && v.length <= 128
}

/** Extract dynamic [id] from /api/notebooks/:id (edge Request has no req.query). */
function idFromUrl(url: URL): string {
    const parts = url.pathname.replace(/\/+$/, '').split('/')
    const id = parts[parts.length - 1] || ''
    // Guard: path should end with a real id, not the collection segment
    if (!id || id === 'notebooks') return ''
    return decodeURIComponent(id)
}

export default async function handler(req: Request) {
    const url = new URL(req.url)
    const id = idFromUrl(url)
    if (!id) return json({ error: 'id required' }, 400)

    try {
        if (req.method === 'GET') {
            const ownerKey = url.searchParams.get('owner_key') || ''
            const asPublic = url.searchParams.get('public') === '1' || url.searchParams.get('public') === 'true'

            if (asPublic) {
                const nb = await getNotebookByIdOrShort(id, { publishedOnly: true })
                if (!nb) return json({ error: 'Not found' }, 404)
                return json({ notebook: nb })
            }

            if (!isOwnerKey(ownerKey)) {
                return json({ error: 'owner_key is required' }, 400)
            }

            const nb = await getNotebookByIdOrShort(id, { ownerKey })
            if (!nb) return json({ error: 'Not found' }, 404)

            const includeHistory =
                url.searchParams.get('history') === '1' || url.searchParams.get('history') === 'true'
            if (includeHistory) {
                const history = await listHistory(nb.id)
                return json({ notebook: nb, history })
            }
            return json({ notebook: nb })
        }

        if (req.method === 'PUT') {
            const body = await req.json().catch(() => ({} as Record<string, unknown>))
            if (!isOwnerKey((body as any).owner_key)) {
                return json({ error: 'owner_key is required' }, 400)
            }
            const notebook = ((body as any).notebook || { ...body, id }) as StoredNotebookDTO
            notebook.id = notebook.id || id
            const saved = await upsertNotebook(notebook, (body as any).owner_key)

            if (Array.isArray((body as any).history_entries)) {
                await replaceHistory(saved.id, (body as any).history_entries as NotebookVersionDTO[])
            } else if (Array.isArray((body as any).history_append)) {
                // append handled as replace of local full list if client sends full list preferred
                await replaceHistory(saved.id, (body as any).history_append as NotebookVersionDTO[])
            }

            return json({ notebook: saved })
        }

        if (req.method === 'DELETE') {
            let ownerKey = url.searchParams.get('owner_key') || ''
            if (!isOwnerKey(ownerKey)) {
                const body = await req.json().catch(() => ({} as Record<string, unknown>))
                ownerKey = ((body as any).owner_key as string) || ''
            }
            if (!isOwnerKey(ownerKey)) {
                return json({ error: 'owner_key is required' }, 400)
            }
            const ok = await deleteNotebook(id, ownerKey)
            if (!ok) return json({ error: 'Not found' }, 404)
            return json({ ok: true })
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
        if (message.includes('wim_notebooks') || message.includes('schema cache') || err?.code === 'PGRST205') {
            return json(
                {
                    error: 'Notebooks table not ready',
                    code: 'MIGRATION_REQUIRED',
                },
                503
            )
        }
        console.error('[api/notebooks/[id]]', err)
        return json({ error: message }, 500)
    }
}
