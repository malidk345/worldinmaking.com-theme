/**
 * Server-side notebook collaborators + invites (service role).
 * Used only by API routes.
 */
import { supabaseAdmin } from './supabase-admin'
import {
    NOTEBOOK_COLLABORATOR_LIMIT,
    createNotebookInviteToken,
    isNotebookInviteToken,
    normalizeShareRole,
    parseInviteHandle,
    type NotebookAccessRole,
    type NotebookShareRole,
} from '../src/lib/notebook-sharing'

export type CollaboratorPerson = {
    id?: string
    username?: string
    first_name?: string
    last_name?: string
    avatar_url?: string
    email?: string
}

export type NotebookCollaboratorDTO = {
    user_id: string
    role: NotebookShareRole | 'owner'
    invited_by?: string
    created_at: string
    person?: CollaboratorPerson
}

export type NotebookInviteDTO = {
    id: string
    token: string
    role: NotebookShareRole
    email?: string
    username?: string
    invited_user_id?: string
    expires_at: string
    created_at: string
    pending: boolean
}

export type InvitePreviewDTO = {
    token: string
    notebook_id: string
    notebook_title: string
    role: NotebookShareRole
    expires_at: string
    inviter?: CollaboratorPerson
}

type ProfileRow = {
    id: string
    username: string | null
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    contact_email: string | null
}

function profileToPerson(row: ProfileRow | null | undefined): CollaboratorPerson | undefined {
    if (!row) return undefined
    return {
        id: row.id,
        username: row.username || undefined,
        first_name: row.first_name || undefined,
        last_name: row.last_name || undefined,
        avatar_url: row.avatar_url || undefined,
        email: row.contact_email || undefined,
    }
}

async function loadProfiles(ids: string[]): Promise<Map<string, CollaboratorPerson>> {
    const unique = Array.from(new Set(ids.filter(Boolean)))
    const map = new Map<string, CollaboratorPerson>()
    if (!unique.length) return map
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, contact_email')
        .in('id', unique)
    if (error) throw error
    for (const row of (data as ProfileRow[] | null) || []) {
        const person = profileToPerson(row)
        if (person?.id) map.set(person.id, person)
    }
    return map
}

export async function getCollaboratorRole(
    notebookId: string,
    userId: string | undefined | null
): Promise<NotebookShareRole | null> {
    if (!notebookId || !userId) return null
    const { data, error } = await supabaseAdmin
        .from('wim_notebook_collaborators')
        .select('role')
        .eq('notebook_id', notebookId)
        .eq('user_id', userId)
        .maybeSingle()
    if (error) throw error
    if (!data) return null
    return normalizeShareRole((data as { role?: string }).role)
}

export async function listCollaboratorRoles(
    userId: string
): Promise<Array<{ notebook_id: string; role: NotebookShareRole }>> {
    const { data, error } = await supabaseAdmin
        .from('wim_notebook_collaborators')
        .select('notebook_id, role')
        .eq('user_id', userId)
    if (error) throw error
    return ((data as { notebook_id: string; role: string }[] | null) || []).map((row) => ({
        notebook_id: row.notebook_id,
        role: normalizeShareRole(row.role),
    }))
}

async function countCollaborators(notebookId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
        .from('wim_notebook_collaborators')
        .select('user_id', { count: 'exact', head: true })
        .eq('notebook_id', notebookId)
    if (error) throw error
    return count ?? 0
}

export async function listNotebookPeople(
    notebookId: string,
    owner: { userId?: string | null; createdBy?: CollaboratorPerson }
): Promise<{ collaborators: NotebookCollaboratorDTO[]; invites: NotebookInviteDTO[] }> {
    const [{ data: collabRows, error: collabError }, { data: inviteRows, error: inviteError }] = await Promise.all([
        supabaseAdmin
            .from('wim_notebook_collaborators')
            .select('user_id, role, invited_by, created_at')
            .eq('notebook_id', notebookId)
            .order('created_at', { ascending: true }),
        supabaseAdmin
            .from('wim_notebook_invites')
            .select('id, token, role, email, username, invited_user_id, expires_at, created_at, accepted_at, revoked_at')
            .eq('notebook_id', notebookId)
            .is('accepted_at', null)
            .is('revoked_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(40),
    ])
    if (collabError) throw collabError
    if (inviteError) throw inviteError

    const collabs = (collabRows as {
        user_id: string
        role: string
        invited_by: string | null
        created_at: string
    }[] | null) || []
    const invites = (inviteRows as {
        id: string
        token: string
        role: string
        email: string | null
        username: string | null
        invited_user_id: string | null
        expires_at: string
        created_at: string
    }[] | null) || []

    const profileIds = [
        ...collabs.map((row) => row.user_id),
        ...invites.map((row) => row.invited_user_id || ''),
        owner.userId || '',
    ]
    const profiles = await loadProfiles(profileIds)

    const collaborators: NotebookCollaboratorDTO[] = []
    if (owner.userId) {
        collaborators.push({
            user_id: owner.userId,
            role: 'owner',
            created_at: '',
            person: profiles.get(owner.userId) || owner.createdBy,
        })
    }
    for (const row of collabs) {
        if (row.user_id === owner.userId) continue
        collaborators.push({
            user_id: row.user_id,
            role: normalizeShareRole(row.role),
            invited_by: row.invited_by || undefined,
            created_at: row.created_at,
            person: profiles.get(row.user_id),
        })
    }

    return {
        collaborators,
        invites: invites.map((row) => ({
            id: row.id,
            token: row.token,
            role: normalizeShareRole(row.role),
            email: row.email || undefined,
            username: row.username || undefined,
            invited_user_id: row.invited_user_id || undefined,
            expires_at: row.expires_at,
            created_at: row.created_at,
            pending: true,
        })),
    }
}

async function findProfileByHandle(handle: { kind: 'email' | 'username'; value: string }): Promise<ProfileRow | null> {
    if (handle.kind === 'username') {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id, username, first_name, last_name, avatar_url, contact_email')
            .ilike('username', handle.value)
            .maybeSingle()
        if (error) throw error
        return (data as ProfileRow | null) || null
    }

    const { data: byContact, error: contactError } = await supabaseAdmin
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, contact_email')
        .ilike('contact_email', handle.value)
        .maybeSingle()
    if (contactError) throw contactError
    if (byContact) return byContact as ProfileRow

    try {
        const lookup = supabaseAdmin.auth.admin as {
            getUserByEmail?: (email: string) => Promise<{ data: { user?: { id: string } | null }; error: { message: string } | null }>
        }
        if (typeof lookup.getUserByEmail === 'function') {
            const { data, error } = await lookup.getUserByEmail(handle.value)
            if (!error && data?.user?.id) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('id, username, first_name, last_name, avatar_url, contact_email')
                    .eq('id', data.user.id)
                    .maybeSingle()
                if (profile) return profile as ProfileRow
                return {
                    id: data.user.id,
                    username: null,
                    first_name: null,
                    last_name: null,
                    avatar_url: null,
                    contact_email: handle.value,
                }
            }
        }
    } catch {
        /* email may simply not exist yet */
    }
    return null
}

async function addCollaboratorRow(input: {
    notebookId: string
    userId: string
    role: NotebookShareRole
    invitedBy: string
}): Promise<void> {
    const { error } = await supabaseAdmin.from('wim_notebook_collaborators').upsert(
        {
            notebook_id: input.notebookId,
            user_id: input.userId,
            role: input.role,
            invited_by: input.invitedBy,
        },
        { onConflict: 'notebook_id,user_id' }
    )
    if (error) throw error
}

export async function createNotebookInvite(input: {
    notebookId: string
    invitedBy: string
    ownerUserId?: string | null
    handle?: string
    role?: unknown
    linkOnly?: boolean
}): Promise<{ invite: NotebookInviteDTO; collaborator?: NotebookCollaboratorDTO; added: boolean; urlPath: string }> {
    const role = normalizeShareRole(input.role)

    const count = await countCollaborators(input.notebookId)
    if (count >= NOTEBOOK_COLLABORATOR_LIMIT) {
        const err = new Error('This notebook already has the maximum number of people') as Error & { status?: number }
        err.status = 400
        throw err
    }

    const handle = input.linkOnly ? null : parseInviteHandle(input.handle || '')
    if (!input.linkOnly && input.handle && !handle) {
        const err = new Error('Enter a username or email') as Error & { status?: number }
        err.status = 400
        throw err
    }

    let profile: ProfileRow | null = null
    if (handle) {
        profile = await findProfileByHandle(handle)
        if (profile?.id && profile.id === input.ownerUserId) {
            const err = new Error('That person already owns this notebook') as Error & { status?: number }
            err.status = 400
            throw err
        }
        if (profile?.id && profile.id === input.invitedBy) {
            const err = new Error('You already have access') as Error & { status?: number }
            err.status = 400
            throw err
        }
    }

    let added = false
    if (profile?.id) {
        await addCollaboratorRow({
            notebookId: input.notebookId,
            userId: profile.id,
            role,
            invitedBy: input.invitedBy,
        })
        added = true
    }

    if (!profile && !handle) {
        const { data: existingLink } = await supabaseAdmin
            .from('wim_notebook_invites')
            .select('id, token, role, email, username, invited_user_id, expires_at, created_at')
            .eq('notebook_id', input.notebookId)
            .eq('invited_by', input.invitedBy)
            .eq('role', role)
            .is('email', null)
            .is('username', null)
            .is('invited_user_id', null)
            .is('accepted_at', null)
            .is('revoked_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        if (existingLink) {
            const row = existingLink as {
                id: string
                token: string
                role: string
                expires_at: string
                created_at: string
            }
            return {
                invite: {
                    id: row.id,
                    token: row.token,
                    role: normalizeShareRole(row.role),
                    expires_at: row.expires_at,
                    created_at: row.created_at,
                    pending: true,
                },
                added: false,
                urlPath: `/notebooks/invite/${row.token}`,
            }
        }
    }

    const token = createNotebookInviteToken()
    const { data, error } = await supabaseAdmin
        .from('wim_notebook_invites')
        .insert({
            notebook_id: input.notebookId,
            token,
            email: handle?.kind === 'email' ? handle.value : null,
            username: handle?.kind === 'username' ? handle.value : null,
            invited_user_id: profile?.id || null,
            role,
            invited_by: input.invitedBy,
        })
        .select('id, token, role, email, username, invited_user_id, expires_at, created_at')
        .single()
    if (error) throw error
    const row = data as {
        id: string
        token: string
        role: string
        email: string | null
        username: string | null
        invited_user_id: string | null
        expires_at: string
        created_at: string
    }

    return {
        invite: {
            id: row.id,
            token: row.token,
            role: normalizeShareRole(row.role),
            email: row.email || undefined,
            username: row.username || undefined,
            invited_user_id: row.invited_user_id || undefined,
            expires_at: row.expires_at,
            created_at: row.created_at,
            pending: true,
        },
        collaborator: profile
            ? {
                  user_id: profile.id,
                  role,
                  invited_by: input.invitedBy,
                  created_at: new Date().toISOString(),
                  person: profileToPerson(profile),
              }
            : undefined,
        added,
        urlPath: `/notebooks/invite/${row.token}`,
    }
}

export async function getInvitePreview(token: string): Promise<InvitePreviewDTO | null> {
    if (!isNotebookInviteToken(token)) return null
    const { data, error } = await supabaseAdmin
        .from('wim_notebook_invites')
        .select('token, notebook_id, role, invited_by, expires_at, accepted_at, revoked_at')
        .eq('token', token)
        .maybeSingle()
    if (error) throw error
    if (!data) return null
    const row = data as {
        token: string
        notebook_id: string
        role: string
        invited_by: string
        expires_at: string
        accepted_at: string | null
        revoked_at: string | null
    }
    if (row.revoked_at) return null
    if (Date.parse(row.expires_at) < Date.now()) return null

    const { data: notebook } = await supabaseAdmin
        .from('wim_notebooks')
        .select('id, title, deleted_at')
        .eq('id', row.notebook_id)
        .maybeSingle()
    const nb = notebook as { id: string; title: string; deleted_at: string | null } | null
    if (!nb || nb.deleted_at) return null

    const profiles = await loadProfiles([row.invited_by])
    return {
        token: row.token,
        notebook_id: nb.id,
        notebook_title: nb.title || 'Untitled Notebook',
        role: normalizeShareRole(row.role),
        expires_at: row.expires_at,
        inviter: profiles.get(row.invited_by),
    }
}

export async function acceptNotebookInvite(
    token: string,
    userId: string
): Promise<{ notebook_id: string; role: NotebookShareRole; already: boolean }> {
    if (!isNotebookInviteToken(token)) {
        const err = new Error('Invite not found') as Error & { status?: number }
        err.status = 404
        throw err
    }
    const { data, error } = await supabaseAdmin
        .from('wim_notebook_invites')
        .select('id, notebook_id, role, invited_by, invited_user_id, email, username, expires_at, accepted_at, revoked_at')
        .eq('token', token)
        .maybeSingle()
    if (error) throw error
    if (!data) {
        const err = new Error('Invite not found') as Error & { status?: number }
        err.status = 404
        throw err
    }
    const row = data as {
        id: string
        notebook_id: string
        role: string
        invited_by: string
        invited_user_id: string | null
        expires_at: string
        accepted_at: string | null
        revoked_at: string | null
    }
    if (row.revoked_at) {
        const err = new Error('This invite was revoked') as Error & { status?: number }
        err.status = 410
        throw err
    }
    if (Date.parse(row.expires_at) < Date.now()) {
        const err = new Error('This invite has expired') as Error & { status?: number }
        err.status = 410
        throw err
    }
    if (row.invited_by === userId) {
        return { notebook_id: row.notebook_id, role: normalizeShareRole(row.role), already: true }
    }

    const { data: notebook } = await supabaseAdmin
        .from('wim_notebooks')
        .select('id, auth_user_id, owner_key, deleted_at')
        .eq('id', row.notebook_id)
        .maybeSingle()
    const nb = notebook as { id: string; auth_user_id: string | null; owner_key: string; deleted_at: string | null } | null
    if (!nb || nb.deleted_at) {
        const err = new Error('Notebook not found') as Error & { status?: number }
        err.status = 404
        throw err
    }
    if (nb.auth_user_id === userId || nb.owner_key === userId) {
        return { notebook_id: nb.id, role: 'editor', already: true }
    }

    const existingRole = await getCollaboratorRole(nb.id, userId)
    const role = normalizeShareRole(row.role)
    await addCollaboratorRow({
        notebookId: nb.id,
        userId,
        role: existingRole === 'editor' ? 'editor' : role,
        invitedBy: row.invited_by,
    })
    await supabaseAdmin
        .from('wim_notebook_invites')
        .update({
            accepted_at: new Date().toISOString(),
            accepted_by: userId,
            invited_user_id: row.invited_user_id || userId,
        })
        .eq('id', row.id)

    return { notebook_id: nb.id, role: existingRole === 'editor' ? 'editor' : role, already: Boolean(existingRole) }
}

export async function removeNotebookCollaborator(input: {
    notebookId: string
    targetUserId: string
    actorUserId: string
    actorRole: NotebookAccessRole
}): Promise<boolean> {
    if (input.targetUserId === input.actorUserId) {
        const { error, count } = await supabaseAdmin
            .from('wim_notebook_collaborators')
            .delete({ count: 'exact' })
            .eq('notebook_id', input.notebookId)
            .eq('user_id', input.targetUserId)
        if (error) throw error
        return (count ?? 0) > 0
    }
    if (input.actorRole !== 'owner' && input.actorRole !== 'editor') {
        const err = new Error('Forbidden') as Error & { status?: number }
        err.status = 403
        throw err
    }
    const { error, count } = await supabaseAdmin
        .from('wim_notebook_collaborators')
        .delete({ count: 'exact' })
        .eq('notebook_id', input.notebookId)
        .eq('user_id', input.targetUserId)
    if (error) throw error
    return (count ?? 0) > 0
}

export async function revokeNotebookInvite(input: {
    notebookId: string
    inviteId?: string
    token?: string
}): Promise<boolean> {
    let query = supabaseAdmin
        .from('wim_notebook_invites')
        .update({ revoked_at: new Date().toISOString() })
        .eq('notebook_id', input.notebookId)
        .is('accepted_at', null)
        .is('revoked_at', null)
    if (input.inviteId) query = query.eq('id', input.inviteId)
    else if (input.token) query = query.eq('token', input.token)
    else return false
    const { data, error } = await query.select('id')
    if (error) throw error
    return Array.isArray(data) && data.length > 0
}
