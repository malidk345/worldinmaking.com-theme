/**
 * GET    /api/notebooks/:id?owner_key=...
 * PUT    /api/notebooks/:id  { owner_key, notebook, history_entries? }
 * DELETE /api/notebooks/:id?owner_key=...
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import {
    getNotebookByIdOrShort,
    upsertNotebook,
    deleteNotebook,
    replaceHistory,
    listHistory,
    type StoredNotebookDTO,
    type NotebookVersionDTO,
} from '../../../../lib/notebooks-repo'

function isOwnerKey(v: unknown): v is string {
    return typeof v === 'string' && v.length >= 8 && v.length <= 128
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const id = String(req.query.id || '')
    if (!id) return res.status(400).json({ error: 'id required' })

    try {
        if (req.method === 'GET') {
            const ownerKey = typeof req.query.owner_key === 'string' ? req.query.owner_key : ''
            const asPublic = req.query.public === '1' || req.query.public === 'true'

            if (asPublic) {
                const nb = await getNotebookByIdOrShort(id, { publishedOnly: true })
                if (!nb) return res.status(404).json({ error: 'Not found' })
                return res.status(200).json({ notebook: nb })
            }

            if (!isOwnerKey(ownerKey)) {
                return res.status(400).json({ error: 'owner_key is required' })
            }

            const nb = await getNotebookByIdOrShort(id, { ownerKey })
            if (!nb) return res.status(404).json({ error: 'Not found' })

            const includeHistory = req.query.history === '1' || req.query.history === 'true'
            if (includeHistory) {
                const history = await listHistory(nb.id)
                return res.status(200).json({ notebook: nb, history })
            }
            return res.status(200).json({ notebook: nb })
        }

        if (req.method === 'PUT') {
            const body = req.body || {}
            if (!isOwnerKey(body.owner_key)) {
                return res.status(400).json({ error: 'owner_key is required' })
            }
            const notebook = (body.notebook || { ...body, id }) as StoredNotebookDTO
            notebook.id = notebook.id || id
            const saved = await upsertNotebook(notebook, body.owner_key)

            if (Array.isArray(body.history_entries)) {
                await replaceHistory(saved.id, body.history_entries as NotebookVersionDTO[])
            } else if (Array.isArray(body.history_append)) {
                // append handled as replace of local full list if client sends full list preferred
                await replaceHistory(saved.id, body.history_append as NotebookVersionDTO[])
            }

            return res.status(200).json({ notebook: saved })
        }

        if (req.method === 'DELETE') {
            const ownerKey =
                (typeof req.query.owner_key === 'string' && req.query.owner_key) ||
                (req.body && req.body.owner_key) ||
                ''
            if (!isOwnerKey(ownerKey)) {
                return res.status(400).json({ error: 'owner_key is required' })
            }
            const ok = await deleteNotebook(id, ownerKey)
            if (!ok) return res.status(404).json({ error: 'Not found' })
            return res.status(200).json({ ok: true })
        }

        res.setHeader('Allow', 'GET, PUT, DELETE')
        return res.status(405).json({ error: 'Method not allowed' })
    } catch (err: any) {
        const message = err?.message || String(err)
        if (message.includes('wim_notebooks') || message.includes('schema cache') || err?.code === 'PGRST205') {
            return res.status(503).json({
                error: 'Notebooks table not ready',
                code: 'MIGRATION_REQUIRED',
            })
        }
        console.error('[api/notebooks/[id]]', err)
        return res.status(500).json({ error: message })
    }
}
