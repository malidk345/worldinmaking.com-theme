export const NOTEBOOK_IMAGE_MAX_BYTES = 6 * 1024 * 1024
export const NOTEBOOK_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

export function isNotebookImageFile(file: Pick<File, 'type'>): boolean {
    return NOTEBOOK_IMAGE_TYPES.includes(file.type as (typeof NOTEBOOK_IMAGE_TYPES)[number])
}

export function notebookImageExtension(type: string): string {
    if (type === 'image/png') return 'png'
    if (type === 'image/webp') return 'webp'
    if (type === 'image/gif') return 'gif'
    return 'jpg'
}
