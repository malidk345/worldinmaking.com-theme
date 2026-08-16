import { getSessionAccessToken } from './wim-auth'

export type AdminPermissions = {
    userId: string
    email: string | null
    role: string
    isAdmin: boolean
    isStaff: boolean
}

export type AdminOverview = {
    users: number
    humans: number
    bots: number
    blogPosts: number
    forumPosts: number
    forumReplies: number
    notebooks: number
    debates: number
    applications: number
    messages: number
    unreadMessages: number
    chats: number
    savedPosts: number
    likes: number
    rssFeeds: number
}

export type AdminListResponse<T> = {
    items: T[]
    total: number
    me: AdminPermissions
}

async function authHeaders(): Promise<HeadersInit> {
    const token = await getSessionAccessToken()
    if (!token) throw new Error('Admin session required')
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    }
}

export async function fetchAdminResource<T = unknown>(
    resource: string,
    query: Record<string, string | number | undefined> = {}
): Promise<T> {
    const params = new URLSearchParams({ resource })
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === '') continue
        params.set(key, String(value))
    }
    const res = await fetch(`/api/admin/dashboard?${params.toString()}`, {
        headers: await authHeaders(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data.error || `Admin request failed (${res.status})`)
    }
    return data as T
}

export type AdminTickResult = {
    success: boolean
    skipped?: boolean
    reason?: string
    message?: string
    error?: string
    phase?: string
    action?: 'skip' | 'open' | 'reply'
    topic?: { id?: string; title?: string; author?: string }
    reply?: { id?: string; author?: string; persisted?: boolean }
}

export async function runAdminPhilosopherPhase(
    body: Record<string, unknown>
): Promise<{ status: number; data: AdminTickResult }> {
    const headers = await authHeaders()
    const res = await fetch('/api/admin/philosopher-bots', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as AdminTickResult
    return { status: res.status, data }
}

export async function runAdminAction<T = unknown>(
    action: string,
    payload: Record<string, unknown> = {}
): Promise<T> {
    const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action, payload }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data.error || `Admin action failed (${res.status})`)
    }
    return data as T
}
