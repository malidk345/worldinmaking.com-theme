import { supabase, isSupabaseConfigured } from './supabase'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_INPUT_BYTES = 8 * 1024 * 1024
const MAX_EDGE = { avatar: 512, cover: 1600 } as const

export type ProfileImageKind = keyof typeof MAX_EDGE

export function isProfileImageFile(file: File): boolean {
    return ALLOWED.has(file.type) && file.size > 0 && file.size <= MAX_INPUT_BYTES
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(url)
            resolve(img)
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Could not read that image'))
        }
        img.src = url
    })
}

export async function compressProfileImage(file: File, kind: ProfileImageKind): Promise<Blob> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return file
    }
    const img = await loadImage(file)
    const max = MAX_EDGE[kind]
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
    if (!blob) return file
    return blob
}

export async function uploadProfileImage(
    userId: string,
    file: File,
    kind: ProfileImageKind
): Promise<string> {
    if (!isSupabaseConfigured) throw new Error('Storage is not configured')
    if (!userId) throw new Error('Sign in to upload a photo')
    if (!isProfileImageFile(file)) throw new Error('Use a JPG, PNG, WebP, or GIF under 8 MB')

    const blob = await compressProfileImage(file, kind)
    const path = `${userId}/${kind}-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600',
    })
    if (error) throw new Error(error.message || 'Upload failed')
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    if (!data?.publicUrl) throw new Error('Upload succeeded but no public URL was returned')
    return data.publicUrl
}

export async function resolveProfileFileField(
    userId: string,
    value: unknown,
    kind: ProfileImageKind
): Promise<string | undefined> {
    if (value instanceof File) {
        return uploadProfileImage(userId, value, kind)
    }
    if (value === null) return ''
    if (typeof value === 'string') {
        if (value.startsWith('data:')) throw new Error('Choose an image file instead of pasting data')
        return undefined
    }
    if (value && typeof value === 'object' && 'url' in (value as { url?: string }) && typeof (value as { url?: string }).url === 'string') {
        return undefined
    }
    return undefined
}
