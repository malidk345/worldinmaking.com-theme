import { getOrCreateOwnerKey } from '../notebook-app/scenes/notebooks/notebookRemote'
import { getStoredJwt } from './chat-remote'
import { supabase, isSupabaseConfigured } from './supabase'
import type { NotebookAccessRole, NotebookShareRole } from './notebook-sharing'

export type NotebookCollaboratorPerson = {
    id: string
    username?: string
    first_name?: string
    last_name?: string
    avatar_url?: string
    email?: string
}

export type NotebookCollaborator = {
    user_id: string
    role: NotebookShareRole | 'owner'
    invited_by?: string
    created_at: string
    person?: NotebookCollaboratorPerson
}

export type NotebookPendingInvite = {
    id: string
    token: string
    role: NotebookShareRole
    email?: string
    username?: string
    expires_at: string
    created_at: string
    pending: boolean
}

export type NotebookInvitePreview = {
    token: string
    notebook_id: string
    notebook_title: string
    role: NotebookShareRole
    expires_at: string
    inviter?: NotebookCollaboratorPerson
}

async function authHeaders(jsonBody = false): Promise<HeadersInit> {
    const ownerKey = getOrCreateOwnerKey()
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-WIM-Owner-Key': ownerKey,
    }
    if (jsonBody) headers['Content-Type'] = 'application/json'
    let token = ''
    try {
        token = getStoredJwt() || ''
        if (isSupabaseConfigured) {
            const { data } = await supabase.auth.getSession()
            if (data?.session?.access_token) token = data.session.access_token
        }
    } catch {
        /* keep cached token */
    }
    if (token && token.length >= 20) headers.Authorization = `Bearer ${token}`
    return headers
}

async function parseJson<T>(res: Response): Promise<T | null> {
    try {
        return (await res.json()) as T
    } catch {
        return null
    }
}

export async function fetchNotebookPeople(notebookId: string): Promise<{
    access_role: NotebookAccessRole
    collaborators: NotebookCollaborator[]
    invites: NotebookPendingInvite[]
} | null> {
    try {
        const res = await fetch(
            `/api/notebook/collaborators?notebook_id=${encodeURIComponent(notebookId)}`,
            { method: 'GET', headers: await authHeaders(), cache: 'no-store' }
        )
        if (!res.ok) return null
        const body = await parseJson<{
            access_role?: NotebookAccessRole
            collaborators?: NotebookCollaborator[]
            invites?: NotebookPendingInvite[]
        }>(res)
        if (!body) return null
        return {
            access_role: body.access_role || 'owner',
            collaborators: Array.isArray(body.collaborators) ? body.collaborators : [],
            invites: Array.isArray(body.invites) ? body.invites : [],
        }
    } catch {
        return null
    }
}

export async function inviteNotebookPerson(
    notebookId: string,
    input: { handle?: string; role?: NotebookShareRole; link?: boolean }
): Promise<{ ok: boolean; url?: string; added?: boolean; error?: string }> {
    try {
        const res = await fetch('/api/notebook/collaborators', {
            method: 'POST',
            headers: await authHeaders(true),
            body: JSON.stringify({
                notebook_id: notebookId,
                handle: input.handle,
                role: input.role,
                link: input.link === true,
            }),
        })
        const body = await parseJson<{ ok?: boolean; url?: string; added?: boolean; error?: string }>(res)
        if (!res.ok) return { ok: false, error: body?.error || 'Could not invite' }
        return { ok: true, url: body?.url, added: body?.added }
    } catch {
        return { ok: false, error: 'Could not invite' }
    }
}

export async function removeNotebookPerson(
    notebookId: string,
    input: { userId?: string; inviteId?: string }
): Promise<boolean> {
    try {
        const res = await fetch('/api/notebook/collaborators', {
            method: 'DELETE',
            headers: await authHeaders(true),
            body: JSON.stringify({
                notebook_id: notebookId,
                user_id: input.userId,
                invite_id: input.inviteId,
            }),
        })
        return res.ok
    } catch {
        return false
    }
}

export async function fetchNotebookInvitePreview(token: string): Promise<NotebookInvitePreview | null> {
    try {
        const res = await fetch(`/api/notebook/invite?token=${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        })
        if (!res.ok) return null
        const body = await parseJson<{ invite?: NotebookInvitePreview }>(res)
        return body?.invite || null
    } catch {
        return null
    }
}

export async function acceptNotebookInviteClient(token: string): Promise<{
    ok: boolean
    notebook_id?: string
    role?: NotebookShareRole
    notebook?: { id: string; title: string; content: string; access_role?: NotebookAccessRole }
    error?: string
    needsAuth?: boolean
}> {
    try {
        const res = await fetch('/api/notebook/invite', {
            method: 'POST',
            headers: await authHeaders(true),
            body: JSON.stringify({ token }),
        })
        const body = await parseJson<{
            ok?: boolean
            notebook_id?: string
            role?: NotebookShareRole
            notebook?: { id: string; title: string; content: string; access_role?: NotebookAccessRole }
            error?: string
        }>(res)
        if (res.status === 401) return { ok: false, needsAuth: true, error: body?.error || 'Sign in to join' }
        if (!res.ok) return { ok: false, error: body?.error || 'Could not join notebook' }
        return {
            ok: true,
            notebook_id: body?.notebook_id,
            role: body?.role,
            notebook: body?.notebook,
        }
    } catch {
        return { ok: false, error: 'Could not join notebook' }
    }
}
