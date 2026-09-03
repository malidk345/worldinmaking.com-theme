export const NOTEBOOK_SHARE_ROLES = ['editor', 'viewer'] as const
export type NotebookShareRole = (typeof NOTEBOOK_SHARE_ROLES)[number]
export type NotebookAccessRole = 'owner' | NotebookShareRole

export const NOTEBOOK_INVITE_TOKEN_MIN = 16
export const NOTEBOOK_INVITE_TOKEN_MAX = 80
export const NOTEBOOK_COLLABORATOR_LIMIT = 40

export function normalizeShareRole(value: unknown): NotebookShareRole {
    return value === 'viewer' ? 'viewer' : 'editor'
}

export function canWriteNotebook(role: NotebookAccessRole | undefined | null): boolean {
    return role === 'owner' || role === 'editor' || role == null
}

export function canManageNotebookPeople(role: NotebookAccessRole | undefined | null): boolean {
    return role === 'owner' || role === 'editor'
}

export function canDeleteNotebookRecord(role: NotebookAccessRole | undefined | null): boolean {
    return role === 'owner' || role == null
}

export function isNotebookInviteToken(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.length >= NOTEBOOK_INVITE_TOKEN_MIN &&
        value.length <= NOTEBOOK_INVITE_TOKEN_MAX &&
        /^[a-zA-Z0-9_-]+$/.test(value)
    )
}

export function parseInviteHandle(raw: unknown): { kind: 'email' | 'username'; value: string } | null {
    if (typeof raw !== 'string') return null
    const value = raw.trim().replace(/^@+/, '')
    if (!value || value.length > 120) return null
    if (value.includes('@')) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null
        return { kind: 'email', value: value.toLowerCase() }
    }
    if (!/^[a-zA-Z0-9._-]{2,64}$/.test(value)) return null
    return { kind: 'username', value }
}

export function notebookInvitePath(token: string): string {
    return `/notebooks/invite/${encodeURIComponent(token)}`
}

export function notebookInviteUrl(token: string, origin?: string): string {
    const base = (origin || (typeof window !== 'undefined' ? window.location.origin : 'https://worldinmaking.com')).replace(
        /\/+$/,
        ''
    )
    return `${base}${notebookInvitePath(token)}`
}

export function createNotebookInviteToken(): string {
    const bytes = new Uint8Array(18)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
