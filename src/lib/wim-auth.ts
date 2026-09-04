/**
 * WorldInMaking auth — Supabase is the single identity system.
 * Maps auth.users + public.profiles into the site's User shape (PostHog/Squeak-compatible fields).
 */
import type { User } from 'hooks/useUser'
import type { ProfileData } from 'lib/strapi'
import { supabase, isSupabaseConfigured } from 'lib/supabase'
import { rememberAuthNextPath } from 'lib/auth-callback'

export type WimProfileRow = {
    id: string
    username: string | null
    avatar_url: string | null
    website: string | null
    contact_email: string | null
    role: string | null
    bio: string | null
    github: string | null
    linkedin: string | null
    twitter: string | null
    pronouns: string | null
    location: string | null
    cover_url: string | null
    created_at: string | null
    updated_at: string | null
    preferred_language?: string | null
    is_bot?: boolean | null
    birth_date?: string | null
    first_name?: string | null
    last_name?: string | null
}

export function isWimAuthReady(): boolean {
    return isSupabaseConfigured
}

/** Split display name into first/last for legacy form fields. */
function splitName(meta: Record<string, unknown> | undefined, username: string | null): {
    firstName: string | null
    lastName: string | null
} {
    const first = (meta?.first_name || meta?.firstName || meta?.full_name || meta?.name) as string | undefined
    const last = (meta?.last_name || meta?.lastName) as string | undefined
    if (first || last) {
        if (first && !last && first.includes(' ')) {
            const parts = first.trim().split(/\s+/)
            return { firstName: parts[0] || null, lastName: parts.slice(1).join(' ') || null }
        }
        return { firstName: first || null, lastName: last || null }
    }
    if (username) {
        return { firstName: username, lastName: null }
    }
    return { firstName: null, lastName: null }
}

function roleType(role: string | null | undefined): User['role']['type'] {
    const r = (role || 'member').toLowerCase()
    if (r === 'admin' || r === 'moderator' || r === 'staff' || r === 'webmaster') return 'moderator'
    if (r === 'public') return 'public'
    return 'authenticated'
}

/** Map Supabase profile + auth user → site User (keeps Squeak-shaped fields for UI). */
export function mapSupabaseToUser(
    authUser: {
        id: string
        email?: string | null
        created_at?: string
        user_metadata?: Record<string, unknown>
        app_metadata?: Record<string, unknown>
    },
    profile: WimProfileRow | null
): User {
    const meta = (authUser.user_metadata || {}) as Record<string, unknown>
    const appMeta = (authUser.app_metadata || {}) as Record<string, unknown>

    const adminEmailAllowlist = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    const isEmailAdmin = !!authUser.email && adminEmailAllowlist.includes(authUser.email.toLowerCase())
    const appRole = (appMeta.role || meta.role) as string | undefined
    const isMetadataAdmin =
        appRole === 'admin' ||
        appRole === 'moderator' ||
        appMeta.is_admin === true ||
        meta.is_admin === true

    const effectiveRole =
        isEmailAdmin || isMetadataAdmin
            ? 'admin'
            : (profile?.role && String(profile.role).trim()) || 'member'
    const isModerator = isEmailAdmin || isMetadataAdmin || roleType(effectiveRole) === 'moderator'
    const username =
        profile?.username ||
        (meta.username as string) ||
        (authUser.email ? authUser.email.split('@')[0] : null) ||
        'user'
    const fromProfile = {
        firstName: profile?.first_name?.trim() || null,
        lastName: profile?.last_name?.trim() || null,
    }
    const { firstName, lastName } = fromProfile.firstName || fromProfile.lastName
        ? fromProfile
        : splitName(meta, null)
    const avatarUrl =
        profile?.avatar_url ||
        (meta.avatar_url as string) ||
        (meta.picture as string) ||
        (meta.avatar as string) ||
        null
    const createdAt = profile?.created_at || authUser.created_at || new Date().toISOString()

    const profileData: ProfileData & { id: string } = {
        id: profile?.id || authUser.id,
        firstName,
        lastName,
        biography: profile?.bio ?? null,
        company: null,
        companyRole: effectiveRole && effectiveRole.toLowerCase() !== 'member' ? effectiveRole : (profile?.role || null),
        github: profile?.github ?? null,
        linkedin: profile?.linkedin ?? null,
        location: profile?.location ?? null,
        twitter: profile?.twitter ?? null,
        website: profile?.website ?? null,
        contactEmail: profile?.contact_email ?? null,
        createdAt,
        updatedAt: profile?.updated_at ?? null,
        publishedAt: createdAt,
        avatar: avatarUrl
            ? ({
                  data: {
                      id: 0,
                      attributes: { url: avatarUrl },
                  },
              } as any)
            : undefined,
        gravatarURL: null,
        questionSubscriptions: { data: [] } as any,
        topicSubscriptions: { data: [] } as any,
        pronouns: profile?.pronouns ?? null,
        country: null,
        amaEnabled: false,
        teams: [],
        height: null,
        bookmarks: [],
        reputation: 0,
        username,
        birthDate: profile?.birth_date ?? null,
        coverUrl: profile?.cover_url ?? null,
        preferredLanguage: profile?.preferred_language ?? null,
    } as ProfileData & { id: string }

    // Site User historically used numeric Strapi ids; WIM uses UUID strings throughout.
    const user = {
        id: authUser.id as unknown as number,
        email: authUser.email || '',
        isMember: true,
        isModerator,
        blocked: false,
        confirmed: true,
        createdAt,
        provider: 'local' as const,
        username,
        profile: profileData as User['profile'],
        role: { type: roleType(effectiveRole) },
        wallet: { balance: 0, transactions: [] },
        hasPosthogLogin: false,
    } satisfies User

    return user
}

export async function getSessionAccessToken(): Promise<string | null> {
    if (!isSupabaseConfigured) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
}

export async function getAuthUser() {
    if (!isSupabaseConfigured) return null
    const { data } = await supabase.auth.getUser()
    return data.user ?? null
}

export async function fetchWimProfile(userId: string): Promise<WimProfileRow | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
        console.warn('[wim-auth] fetch profile', error.message)
        return null
    }
    return data as WimProfileRow | null
}

/**
 * Ensure a profiles row exists (trigger may race; also covers pre-trigger users).
 */
export async function ensureWimProfile(
    authUser: {
        id: string
        email?: string | null
        user_metadata?: Record<string, unknown>
    },
    extras?: { firstName?: string; lastName?: string; username?: string }
): Promise<WimProfileRow | null> {
    let profile = await fetchWimProfile(authUser.id)
    if (profile) return profile

    const meta = authUser.user_metadata || {}
    const baseUsername =
        extras?.username ||
        (meta.username as string) ||
        (authUser.email ? authUser.email.split('@')[0] : null) ||
        `user_${authUser.id.slice(0, 8)}`

    const row = {
        id: authUser.id,
        username: baseUsername,
        role: 'member',
        avatar_url: (meta.avatar_url as string) || (meta.picture as string) || (meta.avatar as string) || null,
        bio: null,
        first_name: extras?.firstName || (meta.first_name as string) || (meta.firstName as string) || null,
        last_name: extras?.lastName || (meta.last_name as string) || (meta.lastName as string) || null,
    }

    const { data, error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' }).select('*').single()
    if (error) {
        // RLS or race: re-fetch
        console.warn('[wim-auth] ensure profile upsert', error.message)
        return fetchWimProfile(authUser.id)
    }
    return data as WimProfileRow
}

export async function loadCurrentWimUser(): Promise<User | null> {
    if (!isSupabaseConfigured) return null
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    if (!session?.user) return null

    const profile = await ensureWimProfile(session.user)
    return mapSupabaseToUser(session.user, profile)
}

export async function signInWithPassword(email: string, password: string): Promise<{ user: User | null; error?: string }> {
    if (!isSupabaseConfigured) return { user: null, error: 'Supabase is not configured' }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { user: null, error: error.message }
    if (!data.user) return { user: null, error: 'Sign in failed' }

    const profile = await ensureWimProfile(data.user)
    return { user: mapSupabaseToUser(data.user, profile) }
}

export async function signUpWithPassword(args: {
    email: string
    password: string
    firstName: string
    lastName: string
}): Promise<{ user: User | null; error?: string; needsEmailConfirm?: boolean }> {
    if (!isSupabaseConfigured) return { user: null, error: 'Supabase is not configured' }

    const usernameBase = [args.firstName, args.lastName].filter(Boolean).join('').toLowerCase().replace(/\s+/g, '') ||
        args.email.split('@')[0]

    const { data, error } = await supabase.auth.signUp({
        email: args.email,
        password: args.password,
        options: {
            data: {
                first_name: args.firstName,
                last_name: args.lastName,
                username: usernameBase,
                full_name: `${args.firstName} ${args.lastName}`.trim(),
            },
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
    })

    if (error) return { user: null, error: error.message }
    if (!data.user) return { user: null, error: 'Sign up failed' }

    // If email confirmation is required, session may be null
    if (!data.session) {
        return {
            user: null,
            needsEmailConfirm: true,
            error: 'Check your email to confirm your account, then sign in.',
        }
    }

    // Give trigger a moment, then ensure profile
    await new Promise((r) => setTimeout(r, 300))
    const profile = await ensureWimProfile(data.user, {
        firstName: args.firstName,
        lastName: args.lastName,
        username: usernameBase,
    })
    return { user: mapSupabaseToUser(data.user, profile) }
}

export async function signOutWim(): Promise<void> {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
}

export async function requestPasswordReset(email: string): Promise<{ error?: string }> {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured' }
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return { error: error.message }
    return {}
}

export function authRedirectUrl(path: string): string | undefined {
    if (typeof window === 'undefined') return undefined
    return `${window.location.origin}${path}`
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured' }
    rememberAuthNextPath()
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: authRedirectUrl('/auth/callback'),
            queryParams: { access_type: 'offline', prompt: 'select_account' },
        },
    })
    if (error) return { error: error.message }
    return {}
}

export async function updatePassword(password: string): Promise<{ error?: string }> {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured' }
    if (!password || password.length < 6) {
        return { error: 'Password must be at least 6 characters' }
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }
    return {}
}

export async function updateEmail(email: string): Promise<{ error?: string }> {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured' }
    const next = String(email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
        return { error: 'Enter a valid email address' }
    }
    const { error } = await supabase.auth.updateUser({ email: next })
    if (error) return { error: error.message }
    return {}
}

export async function updateWimProfile(
    userId: string,
    patch: Partial<
        Pick<
            WimProfileRow,
            | 'username'
            | 'bio'
            | 'avatar_url'
            | 'website'
            | 'contact_email'
            | 'github'
            | 'linkedin'
            | 'twitter'
            | 'location'
            | 'pronouns'
            | 'cover_url'
            | 'birth_date'
            | 'first_name'
            | 'last_name'
            | 'preferred_language'
        >
    >
): Promise<{ profile: WimProfileRow | null; error?: string }> {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single()
    if (error) {
        const taken = /duplicate|unique/i.test(error.message)
        return { profile: null, error: taken ? 'That username is already taken' : error.message }
    }
    const profile = data as WimProfileRow
    void syncOwnedNotebookPeople(userId, profile)
    return { profile }
}

async function syncOwnedNotebookPeople(userId: string, profile: WimProfileRow): Promise<void> {
    const person = {
        first_name: profile.first_name || profile.username || 'You',
        last_name: profile.last_name || undefined,
        username: profile.username || undefined,
        avatar_url: profile.avatar_url || undefined,
    }
    const { error } = await supabase
        .from('wim_notebooks')
        .update({ created_by: person })
        .or(`auth_user_id.eq.${userId},owner_key.eq.${userId}`)
    if (error) {
        console.warn('[wim-auth] notebook people sync', error.message)
    }
}
