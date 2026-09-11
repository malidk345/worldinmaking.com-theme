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

/** Images from paste/drop live on `files` and/or `items` (screenshots often only on items). */
export function collectClipboardImageFiles(data: DataTransfer | null | undefined): File[] {
    if (!data) return []
    const out: File[] = []
    const seen = new Set<string>()
    const add = (file: File | null | undefined): void => {
        if (!file || !isNotebookImageFile(file)) return
        const key = `${file.name}:${file.size}:${file.lastModified}:${file.type}`
        if (seen.has(key)) return
        seen.add(key)
        out.push(file)
    }
    if (data.files?.length) {
        Array.from(data.files).forEach(add)
    }
    if (data.items?.length) {
        Array.from(data.items).forEach((item) => {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                add(item.getAsFile())
            }
        })
    }
    return out
}
