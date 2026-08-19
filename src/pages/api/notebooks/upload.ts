/**
 * POST /api/notebooks/upload
 * multipart field `file` — stores an image in the notebook-media bucket.
 */
export const runtime = 'edge'

import { supabaseAdmin } from '../../../../lib/supabase-admin'
import { resolveNotebookOwner } from '../../../../lib/api-authz'
import { NOTEBOOK_IMAGE_MAX_BYTES, isNotebookImageFile, notebookImageExtension } from '../../../lib/notebook-upload-shared'

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const url = new URL(req.url)
    const auth = await resolveNotebookOwner(req, url.searchParams.get('owner_key'))
    if (!auth.ok) return json({ error: auth.error }, auth.status)

    let form: FormData
    try {
        form = await req.formData()
    } catch {
        return json({ error: 'Expected multipart form data' }, 400)
    }

    const file = form.get('file')
    if (!(file instanceof File)) return json({ error: 'Missing file' }, 400)
    if (!isNotebookImageFile(file)) return json({ error: 'Use a PNG, JPEG, WebP, or GIF image.' }, 400)
    if (file.size > NOTEBOOK_IMAGE_MAX_BYTES) return json({ error: 'Image is larger than 6 MB.' }, 413)

    const ext = notebookImageExtension(file.type)
    const id = crypto.randomUUID()
    const path = `${auth.ownerKey}/${id}.${ext}`

    let uploadRes = await supabaseAdmin.storage.from('notebook-media').upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
    })
    if (
        uploadRes.error &&
        (uploadRes.error.message?.toLowerCase().includes('not found') ||
            uploadRes.error.message?.toLowerCase().includes('bucket'))
    ) {
        try {
            await supabaseAdmin.storage.createBucket('notebook-media', { public: true })
            uploadRes = await supabaseAdmin.storage.from('notebook-media').upload(path, await file.arrayBuffer(), {
                contentType: file.type,
                upsert: false,
            })
        } catch {
            /* ignore bucket create error */
        }
    }
    if (uploadRes.error) {
        return json({ error: uploadRes.error.message || 'Storage is not available.' }, 503)
    }

    const { data } = supabaseAdmin.storage.from('notebook-media').getPublicUrl(path)
    return json({ url: data.publicUrl, name: file.name })
}
