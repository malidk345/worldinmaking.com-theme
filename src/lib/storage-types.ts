export type StorageCategory = 'avatar' | 'notebook' | 'attachment' | 'chat' | 'generated' | 'upload'

export type StorageKey = `users/${string}/${string}`

export interface FileMetadata {
    file_id: string
    owner_id: string
    notebook_id?: string | null
    filename: string
    mime_type: string
    size: number
    storage_key: string
    category: StorageCategory
    created_at: string
}

export interface UploadFileOptions {
    file: File | Blob
    filename?: string
    category: StorageCategory
    notebookId?: string | null
    chatId?: string | null
    subfolder?: string
}

export interface UploadAvatarResult {
    avatarUrl: string
    avatarKey: string
    fileMetadata: FileMetadata
}
