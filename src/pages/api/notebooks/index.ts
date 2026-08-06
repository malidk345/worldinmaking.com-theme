/**
 * GET  /api/notebooks?owner_key=...          → list owner's notebooks
 * GET  /api/notebooks?short_id=...&public=1  → published notebook by short_id
 * POST /api/notebooks                        → upsert one or many notebooks
 *
 * Body (POST):
 *   { owner_key, notebook } | { owner_key, notebooks: [] }
 *   optional: { history?: { [notebookId]: NotebookVersion[] } }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import {
    listNotebooksByOwner,
    getNotebookByIdOrShort,
    upsertNotebook,
    upsertNotebooks,
    replaceHistory,
    type StoredNotebookDTO,
    type NotebookVersionDTO,
} from '../../../../lib/notebooks-repo'

function badRequest(res: NextApiResponse, message: string) {
    return res.status(400).json({ error: message })
}

function isOwnerKey(v: unknown): v is string {
    return typeof v === 'string' && v.length >= 8 && v.length <= 128
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === 'GET') {
            const ownerKey = typeof req.query.owner_key === 'string' ? req.query.owner_key : ''
            const shortId = typeof req.query.short_id === 'string' ? req.query.short_id : ''
            const asPublic = req.query.public === '1' || req.query.public === 'true'

            if (shortId && asPublic) {
                const nb = await getNotebookByIdOrShort(shortId, { publishedOnly: true })
                if (!nb) return res.status(404).json({ error: 'Not found' })
                return res.status(200).json({ notebook: nb })
            }

            if (!isOwnerKey(ownerKey)) {
                return badRequest(res, 'owner_key is required')
            }

            const notebooks = await listNotebooksByOwner(ownerKey)
            return res.status(200).json({ notebooks })
        }

        if (req.method === 'POST') {
            const body = req.body || {}
            const ownerKey = body.owner_key
            if (!isOwnerKey(ownerKey)) {
                return badRequest(res, 'owner_key is required')
            }

            if (Array.isArray(body.notebooks)) {
                const notebooks = body.notebooks as StoredNotebookDTO[]
                const count = await upsertNotebooks(notebooks, ownerKey)

                // Optional bulk history sync: { history: { [id]: versions[] } }
                if (body.history && typeof body.history === 'object') {
                    const historyMap = body.history as Record<string, NotebookVersionDTO[]>
                    for (const [notebookId, entries] of Object.entries(historyMap)) {
                        if (Array.isArray(entries)) {
                            await replaceHistory(notebookId, entries)
                        }
                    }
                }

                return res.status(200).json({ ok: true, count })
            }

            if (body.notebook) {
                const notebook = body.notebook as StoredNotebookDTO
                if (!notebook?.id) return badRequest(res, 'notebook.id is required')
                const saved = await upsertNotebook(notebook, ownerKey)

                if (Array.isArray(body.history_entries)) {
                    await replaceHistory(notebook.id, body.history_entries as NotebookVersionDTO[])
                }

                return res.status(200).json({ notebook: saved })
            }

            return badRequest(res, 'notebook or notebooks required')
        }

        res.setHeader('Allow', 'GET, POST')
        return res.status(405).json({ error: 'Method not allowed' })
    } catch (err: any) {
        const message = err?.message || String(err)
        // Table missing → clear signal for migration
        if (message.includes('wim_notebooks') || message.includes('schema cache') || err?.code === 'PGRST205') {
            return res.status(503).json({
                error: 'Notebooks table not ready',
                code: 'MIGRATION_REQUIRED',
                hint: 'Run supabase/migrations/20260806_wim_notebooks.sql',
            })
        }
        console.error('[api/notebooks]', err)
        return res.status(500).json({ error: message })
    }
}
