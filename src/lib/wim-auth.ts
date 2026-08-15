/**
 * WorldInMaking auth — Supabase is the single identity system.
 * Maps auth.users + public.profiles into the site's User shape (PostHog/Squeak-compatible fields).
 */
import type { User } from 'hooks/useUser'
import type { ProfileData } from 'lib/strapi'
import { supabase, isSupabaseConfigured } from 'lib/supabase'

export type WimProfileRow = {
    id: string
    username: string | null
    avatar_url: string | null
    website: string | null
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
    if (r === 'admin' || r === 'moderator' || r === 'staff') return 'moderator'
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
    const avatarUrl = profile?.avatar_url || (meta.avatar_url as string) || null
    const createdAt = profile?.created_at || authUser.created_at || new Date().toISOString()

    const profileData: ProfileData & { id: string } = {
        id: profile?.id || authUser.id,
        firstName,
        lastName,
        biography: profile?.bio ?? null,
        company: null,
        companyRole: null,
        github: profile?.github ?? null,
        linkedin: profile?.linkedin ?? null,
        location: profile?.location ?? null,
        twitter: profile?.twitter ?? null,
        website: profile?.website ?? null,
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
    }

    // Site User historically used numeric Strapi ids; WIM uses UUID strings throughout.
    const user = {
        id: authUser.id as unknown as number,
        email: authUser.email || '',
        isMember: true,
        isModerator: roleType(profile?.role) === 'moderator',
        blocked: false,
        confirmed: true,
        createdAt,
        provider: 'local' as const,
        username,
        profile: profileData as User['profile'],
        role: { type: roleType(profile?.role) },
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
        avatar_url: (meta.avatar_url as string) || null,
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

export async function updateWimProfile(
    userId: string,
    patch: Partial<
        Pick<
            WimProfileRow,
            | 'username'
            | 'bio'
            | 'avatar_url'
            | 'website'
            | 'github'
            | 'linkedin'
            | 'twitter'
            | 'location'
            | 'pronouns'
            | 'cover_url'
            | 'birth_date'
            | 'first_name'
            | 'last_name'
        >
    >
): Promise<{ profile: WimProfileRow | null; error?: string }> {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single()
    if (error) {
        const taken = /duplicate|unique/i.test(error.message)
        return { profile: null, error: taken ? 'That username is already taken' : error.message }
    }
    return { profile: data as WimProfileRow }
}
