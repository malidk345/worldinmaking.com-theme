import { isSqueakEnabled, squeakApiUrl } from 'lib/squeak'

/**
 * Legacy Strapi/Squeak media upload.
 * On WIM (Supabase-only) this is disabled — use data URLs or a future Storage bucket.
 */
export default async function uploadImage(
    image: string | Blob,
    jwt: string,
    ref?: { id: number; type: string; field: string; folderId?: number }
) {
    if (!isSqueakEnabled()) {
        throw new Error('Image upload via Squeak is not available on WorldInMaking')
    }

    const uploadUrl = squeakApiUrl('/api/upload')
    if (!uploadUrl) {
        throw new Error('Squeak host not configured')
    }

    const formData = new FormData()
    formData.append('files', image)
    if (ref && ref.field && ref.id && ref.type) {
        formData.append('refId', String(ref.id))
        formData.append('ref', ref.type)
        formData.append('field', ref.field)
    }

    const imageRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
            Authorization: `Bearer ${jwt}`,
        },
    })

    const imageData = await imageRes.json()
    if (ref?.folderId) {
        const folderUrl = squeakApiUrl('/api/media-folders/add-media')
        if (folderUrl) {
            await fetch(folderUrl, {
                method: 'POST',
                body: JSON.stringify({ mediaId: imageData?.[0]?.id, folderId: ref.folderId }),
                headers: {
                    Authorization: `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                },
            })
        }
    }

    if (!imageRes?.ok) {
        throw new Error(imageData?.error?.message)
    }

    return imageData?.[0]
}
