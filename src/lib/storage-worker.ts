import { supabase, isSupabaseConfigured } from './supabase'
import type { FileMetadata, StorageCategory, StorageKey, UploadAvatarResult, UploadFileOptions } from './storage-types'

export const STORAGE_WORKER_URL = (process.env.NEXT_PUBLIC_STORAGE_WORKER_URL || '').replace(/\/+$/, '')

export function isStorageWorkerConfigured(): boolean {
    return Boolean(STORAGE_WORKER_URL && STORAGE_WORKER_URL.length > 0)
}

/**
 * Returns the direct URL to the file through the storage worker proxy.
 */
export function getFileUrl(storageKey: string): string {
    const cleanKey = storageKey.replace(/^\/+/, '')
    if (!STORAGE_WORKER_URL) {
        return `/${cleanKey}`
    }
    return `${STORAGE_WORKER_URL}/${cleanKey}`
}

/**
 * Computes SHA-256 hash of a Blob using Web Crypto API.
 */
export async function computeBlobHash(blob: Blob, length = 32): Promise<string> {
    try {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const buffer = await blob.arrayBuffer()
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
            return hashHex.slice(0, length)
        }
    } catch {
        /* fallback to random token */
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Converts any browser-compatible image file to a WebP blob with optional downscaling.
 */
export async function convertToWebP(
    file: File | Blob,
    options?: { maxEdge?: number; quality?: number; square?: boolean }
): Promise<{ blob: Blob; mimeType: 'image/webp' }> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return { blob: file, mimeType: 'image/webp' }
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(url)
            try {
                const maxEdge = options?.maxEdge || 1920
                const quality = options?.quality ?? 0.85
                const square = options?.square ?? false

                let srcX = 0
                let srcY = 0
                let srcW = img.width
                let srcH = img.height

                if (square) {
                    const minEdge = Math.min(img.width, img.height)
                    srcX = Math.max(0, Math.floor((img.width - minEdge) / 2))
                    srcY = Math.max(0, Math.floor((img.height - minEdge) / 2))
                    srcW = minEdge
                    srcH = minEdge
                }

                const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
                const destW = Math.max(1, Math.round(srcW * scale))
                const destH = Math.max(1, Math.round(srcH * scale))

                const canvas = document.createElement('canvas')
                canvas.width = destW
                canvas.height = destH
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    resolve({ blob: file, mimeType: 'image/webp' })
                    return
                }

                ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, destW, destH)
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve({ blob, mimeType: 'image/webp' })
                        } else {
                            resolve({ blob: file, mimeType: 'image/webp' })
                        }
                    },
                    'image/webp',
                    quality
                )
            } catch (err) {
                reject(err)
            }
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to decode image file'))
        }
        img.src = url
    })
}

/**
 * Builds standard storage key matching the architectural specification:
 * users/{userId}/avatars/{hash}.webp
 * users/{userId}/notebooks/{notebookId}/images/{hash}.webp
 * users/{userId}/notebooks/{notebookId}/files/{fileId}.ext
 * users/{userId}/chat/{chatId}/attachments/{fileId}.ext
 * users/{userId}/generated/{fileId}.ext
 * users/{userId}/uploads/{fileId}.ext
 */
export function buildStorageKey(params: {
    userId: string
    category: StorageCategory
    identifier: string
    ext: string
    notebookId?: string | null
    chatId?: string | null
    isImage?: boolean
}): StorageKey {
    const { userId, category, identifier, ext, notebookId, chatId, isImage } = params
    const safeExt = ext.replace(/^\./, '')

    switch (category) {
        case 'avatar':
            return `users/${userId}/avatars/${identifier}.webp` as StorageKey
        case 'notebook': {
            const nbId = notebookId || 'general'
            const sub = isImage ? 'images' : 'files'
            return `users/${userId}/notebooks/${nbId}/${sub}/${identifier}.${safeExt}` as StorageKey
        }
        case 'chat': {
            const cId = chatId || 'general'
            return `users/${userId}/chat/${cId}/attachments/${identifier}.${safeExt}` as StorageKey
        }
        case 'generated':
            return `users/${userId}/generated/${identifier}.${safeExt}` as StorageKey
        case 'upload':
        case 'attachment':
        default:
            return `users/${userId}/uploads/${identifier}.${safeExt}` as StorageKey
    }
}

/**
 * Helper to get fresh Supabase authentication session.
 */
async function getAuthSession(): Promise<{ userId: string; accessToken: string }> {
    if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.')
    }
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session?.user?.id || !data.session.access_token) {
        throw new Error('You must be signed in to perform this storage action.')
    }
    return {
        userId: data.session.user.id,
        accessToken: data.session.access_token,
    }
}

/**
 * Uploads a file to Cloudflare R2 via the Storage Worker and registers metadata in Supabase Postgres.
 * Includes rollback on metadata failure.
 */
export async function uploadFile(options: UploadFileOptions): Promise<FileMetadata> {
    const { file, category, notebookId, chatId } = options
    const { userId, accessToken } = await getAuthSession()

    if (!isStorageWorkerConfigured()) {
        throw new Error('Storage Worker URL is not configured. Please set NEXT_PUBLIC_STORAGE_WORKER_URL.')
    }

    const isImage = file.type.startsWith('image/')
    let uploadBlob: Blob = file
    let mimeType = file.type || 'application/octet-stream'
    let extension = 'bin'

    if (file instanceof File && file.name.includes('.')) {
        extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
    }

    // Convert images to WebP
    if (isImage) {
        try {
            const webpRes = await convertToWebP(file, {
                maxEdge: category === 'avatar' ? 512 : 2048,
                quality: 0.88,
                square: category === 'avatar',
            })
            uploadBlob = webpRes.blob
            mimeType = 'image/webp'
            extension = 'webp'
        } catch {
            // Passthrough if conversion fails
        }
    }

    const hash = await computeBlobHash(uploadBlob)
    const fileId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : hash
    const identifier = (category === 'avatar' || (category === 'notebook' && isImage)) ? hash : fileId

    const storageKey = buildStorageKey({
        userId,
        category,
        identifier,
        ext: extension,
        notebookId,
        chatId,
        isImage,
    })

    const uploadUrl = `${STORAGE_WORKER_URL}/${storageKey}`

    // 1. Upload to Cloudflare R2 via Storage Worker
    const r2Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': mimeType,
        },
        body: uploadBlob,
    })

    if (!r2Res.ok) {
        const errText = await r2Res.text().catch(() => '')
        throw new Error(`R2 upload failed (${r2Res.status}): ${errText || r2Res.statusText}`)
    }

    // 2. Insert metadata into Supabase Postgres
    const filename = options.filename || (file instanceof File ? file.name : `${identifier}.${extension}`)
    const { data: meta, error: metaError } = await supabase
        .from('file_metadata')
        .insert({
            owner_id: userId,
            notebook_id: notebookId || null,
            filename,
            mime_type: mimeType,
            size: uploadBlob.size,
            storage_key: storageKey,
            category,
        })
        .select()
        .single()

    // 3. Rollback cleanup if database insert fails
    if (metaError || !meta) {
        await fetch(uploadUrl, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }).catch(() => {
            /* cleanup failure logged silently */
        })
        throw new Error(`Failed to save file metadata: ${metaError?.message || 'Unknown database error'}`)
    }

    return meta as FileMetadata
}

/**
 * Downloads a private file with authorization header from the storage worker.
 */
export async function fetchFileBlob(storageKey: string): Promise<Blob> {
    const { accessToken } = await getAuthSession()
    const url = getFileUrl(storageKey)

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })

    if (!res.ok) {
        throw new Error(`Failed to fetch file (${res.status}): ${res.statusText}`)
    }

    return res.blob()
}

/**
 * Deletes a file from both Cloudflare R2 and Supabase file_metadata.
 */
export async function deleteFile(fileId: string): Promise<void> {
    const { userId, accessToken } = await getAuthSession()

    // 1. Fetch metadata to verify owner and get storage key
    const { data: meta, error: fetchErr } = await supabase
        .from('file_metadata')
        .select('file_id, owner_id, storage_key')
        .eq('file_id', fileId)
        .single()

    if (fetchErr || !meta) {
        throw new Error('File metadata not found or access denied.')
    }

    if (meta.owner_id !== userId) {
        throw new Error('Unauthorized to delete this file.')
    }

    // 2. Delete from Cloudflare R2 via Worker
    if (isStorageWorkerConfigured()) {
        const deleteUrl = `${STORAGE_WORKER_URL}/${meta.storage_key}`
        const r2Res = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })
        if (!r2Res.ok && r2Res.status !== 404) {
            const errText = await r2Res.text().catch(() => '')
            throw new Error(`Failed to delete file from R2 (${r2Res.status}): ${errText || r2Res.statusText}`)
        }
    }

    // 3. Delete metadata from Supabase
    const { error: delErr } = await supabase
        .from('file_metadata')
        .delete()
        .eq('file_id', fileId)

    if (delErr) {
        throw new Error(`Failed to delete file metadata: ${delErr.message}`)
    }
}

/**
 * Uploads user avatar to R2:
 * users/{userId}/avatars/{hash}.webp
 * updates profiles.avatar_key and profiles.avatar_url
 */
export async function uploadAvatar(file: File): Promise<UploadAvatarResult> {
    const { userId } = await getAuthSession()

    const meta = await uploadFile({
        file,
        category: 'avatar',
        filename: file.name,
    })

    const avatarUrl = getFileUrl(meta.storage_key)

    // Update profiles table
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            avatar_key: meta.storage_key,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

    if (profileError) {
        // Non-blocking warning: metadata is saved, profile update retry can occur
        console.warn('Updated avatar in R2 but failed updating profiles table:', profileError.message)
    }

    return {
        avatarUrl,
        avatarKey: meta.storage_key,
        fileMetadata: meta,
    }
}

// ── Cloudflare Workers AI Client Functions ──────────────────────────────

/**
 * Transcribes audio using Cloudflare Workers AI Whisper (multilingual / Turkish supported).
 */
export async function transcribeAudio(audio: Blob | ArrayBuffer): Promise<{ text: string }> {
    const { accessToken } = await getAuthSession()
    if (!isStorageWorkerConfigured()) {
        throw new Error('Storage Worker URL is not configured.')
    }

    const body = audio instanceof Blob ? await audio.arrayBuffer() : audio
    const res = await fetch(`${STORAGE_WORKER_URL}/transcribe`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
        },
        body,
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string })?.error || `Transcription failed (${res.status})`)
    }

    return res.json() as Promise<{ text: string }>
}

/**
 * Summarizes text using Cloudflare Workers AI Llama 3.3.
 */
export async function summarizeText(text: string): Promise<{ summary: string }> {
    const { accessToken } = await getAuthSession()
    if (!isStorageWorkerConfigured()) {
        throw new Error('Storage Worker URL is not configured.')
    }

    const res = await fetch(`${STORAGE_WORKER_URL}/summarize`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string })?.error || `Summarization failed (${res.status})`)
    }

    return res.json() as Promise<{ summary: string }>
}

/**
 * Generates an image using Stable Diffusion XL via Cloudflare Workers AI and saves it directly to R2.
 */
export async function generateAIImage(prompt: string): Promise<{ storage_key: string; url: string }> {
    const { accessToken } = await getAuthSession()
    if (!isStorageWorkerConfigured()) {
        throw new Error('Storage Worker URL is not configured.')
    }

    const res = await fetch(`${STORAGE_WORKER_URL}/image`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string })?.error || `Image generation failed (${res.status})`)
    }

    const data = await res.json() as { storage_key: string; url: string }
    return {
        storage_key: data.storage_key,
        url: getFileUrl(data.storage_key),
    }
}
