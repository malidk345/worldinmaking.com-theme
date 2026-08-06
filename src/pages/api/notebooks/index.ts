/**
 * GET  /api/notebooks?owner_key=...          → list owner's notebooks
 * GET  /api/notebooks?short_id=...&public=1  → published notebook by short_id
 * POST /api/notebooks                        → upsert one or many notebooks
 *
 * Body (POST):
 *   { owner_key, notebook } | { owner_key, notebooks: [] }
 *   optional: { history?: { [notebookId]: NotebookVersion[] } }
 *
 * Cloudflare Pages (next-on-pages) requires Edge Runtime.
 */
export const runtime = 'edge'

import {
    listNotebooksByOwner,
    getNotebookByIdOrShort,
    upsertNotebook,
    upsertNotebooks,
    replaceHistory,
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

export default async function handler(req: Request) {
    try {
        const url = new URL(req.url)

        if (req.method === 'GET') {
            const ownerKey = url.searchParams.get('owner_key') || ''
            const shortId = url.searchParams.get('short_id') || ''
            const asPublic = url.searchParams.get('public') === '1' || url.searchParams.get('public') === 'true'

            if (shortId && asPublic) {
                const nb = await getNotebookByIdOrShort(shortId, { publishedOnly: true })
                if (!nb) return json({ error: 'Not found' }, 404)
                return json({ notebook: nb })
            }

            if (!isOwnerKey(ownerKey)) {
                return json({ error: 'owner_key is required' }, 400)
            }

            const notebooks = await listNotebooksByOwner(ownerKey)
            return json({ notebooks })
        }

        if (req.method === 'POST') {
            const body = await req.json().catch(() => ({} as Record<string, unknown>))
            const ownerKey = (body as any).owner_key
            if (!isOwnerKey(ownerKey)) {
                return json({ error: 'owner_key is required' }, 400)
            }

            if (Array.isArray((body as any).notebooks)) {
                const notebooks = (body as any).notebooks as StoredNotebookDTO[]
                const count = await upsertNotebooks(notebooks, ownerKey)

                // Optional bulk history sync: { history: { [id]: versions[] } }
                if ((body as any).history && typeof (body as any).history === 'object') {
                    const historyMap = (body as any).history as Record<string, NotebookVersionDTO[]>
                    for (const [notebookId, entries] of Object.entries(historyMap)) {
                        if (Array.isArray(entries)) {
                            await replaceHistory(notebookId, entries)
                        }
                    }
                }

                return json({ ok: true, count })
            }

            if ((body as any).notebook) {
                const notebook = (body as any).notebook as StoredNotebookDTO
                if (!notebook?.id) return json({ error: 'notebook.id is required' }, 400)
                const saved = await upsertNotebook(notebook, ownerKey)

                if (Array.isArray((body as any).history_entries)) {
                    await replaceHistory(notebook.id, (body as any).history_entries as NotebookVersionDTO[])
                }

                return json({ notebook: saved })
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
        // Table missing → clear signal for migration
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
        console.error('[api/notebooks]', err)
        return json({ error: message }, 500)
    }
}
