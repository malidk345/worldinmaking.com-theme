import { DEVICE_NOTEBOOK_OWNER_KEY, getActiveOwnerKey } from './wim-identity'
import { supabase, isSupabaseConfigured } from './supabase'
import { NOTEBOOK_IMAGE_MAX_BYTES, isNotebookImageFile } from './notebook-upload-shared'

export { NOTEBOOK_IMAGE_MAX_BYTES, NOTEBOOK_IMAGE_TYPES, isNotebookImageFile, notebookImageExtension } from './notebook-upload-shared'

export async function uploadNotebookImage(file: File): Promise<{ url: string; name: string }> {
    if (!isNotebookImageFile(file)) {
        throw new Error('Use a PNG, JPEG, WebP, or GIF image.')
    }
    if (file.size > NOTEBOOK_IMAGE_MAX_BYTES) {
        throw new Error('Image is larger than 6 MB.')
    }

    const ownerKey = getActiveOwnerKey(DEVICE_NOTEBOOK_OWNER_KEY)
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-WIM-Owner-Key': ownerKey,
    }
    try {
        if (isSupabaseConfigured) {
            const { data } = await supabase.auth.getSession()
            if (data.session?.access_token) {
                headers.Authorization = `Bearer ${data.session.access_token}`
                localStorage.setItem('jwt', data.session.access_token)
            }
        }
    } catch {
        /* cached jwt if any */
    }

    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`/api/notebooks/upload?owner_key=${encodeURIComponent(ownerKey)}`, {
        method: 'POST',
        headers,
        body,
    })
    const payload = (await res.json().catch(() => null)) as { url?: string; name?: string; error?: string } | null
    if (!res.ok || !payload?.url) {
        throw new Error(payload?.error || `Upload failed (${res.status}).`)
    }
    return { url: payload.url, name: payload.name || file.name }
}
