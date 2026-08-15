import { useMemo } from 'react'
import useSWR from 'swr'
import { ProfileData, StrapiRecord } from 'lib/strapi'
import { useUser } from 'hooks/useUser'
import { supabase } from 'lib/supabase'
import { resolvePhilosopherAvatar } from 'lib/philosopher-avatar'

function mapDbProfileToStrapi(dbProfile: any): StrapiRecord<ProfileData> {
    const username = dbProfile.username || 'user'

    return {
        id: dbProfile.id as any,
        attributes: {
            username,
            firstName: dbProfile.first_name || '',
            lastName: dbProfile.last_name || '',
            biography: dbProfile.bio || '',
            location: dbProfile.location || null,
            website: dbProfile.website || null,
            twitter: dbProfile.twitter || null,
            github: dbProfile.github || null,
            linkedin: dbProfile.linkedin || null,
            pronouns: dbProfile.pronouns || null,
            birthDate: dbProfile.birth_date || null,
            companyRole: dbProfile.role || 'member',
            bookmarks: [],
            gravatarURL: null,
            createdAt: dbProfile.created_at || new Date().toISOString(),
            updatedAt: dbProfile.updated_at || null,
            publishedAt: dbProfile.created_at || null,
            questionSubscriptions: { data: [] } as any,
            topicSubscriptions: { data: [] } as any,
            avatar: (() => {
                const url = resolvePhilosopherAvatar(username, dbProfile.avatar_url)
                return url
                    ? ({
                          data: {
                              id: 0,
                              attributes: { url },
                          },
                      } as any)
                    : undefined
            })(),
            achievements: [] as any,
            teams: { data: [] } as any,
        } as any,
    }
}

async function fetchWimProfile(identifier: string): Promise<StrapiRecord<ProfileData> | null> {
    if (!identifier) return null
    let cleanId = decodeURIComponent(identifier.trim()).replace(/^@/, '')
    if (!cleanId) return null

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)

    let query = supabase.from('profiles').select('*')
    if (isUuid) {
        query = query.eq('id', cleanId)
    } else {
        query = query.ilike('username', cleanId)
    }

    const { data, error } = await query.maybeSingle()
    if (error) {
        console.warn('[useProfileData]', error.message)
        return null
    }
    if (!data) return null
    return mapDbProfileToStrapi(data)
}

export function useProfileData(identifier?: string | number) {
    const { user, isValidating: userValidating } = useUser()

    const rawId = useMemo(() => {
        const given = identifier == null ? '' : String(identifier).trim()
        // Only the explicit "me" / empty /profile route is the signed-in user.
        // A real handle must never fall back to whoever is logged in.
        if (given && given.toLowerCase() !== 'me') {
            return given
        }
        return user?.username || (user?.profile?.id ? String(user.profile.id) : user?.id ? String(user.id) : '')
    }, [identifier, user])

    const cleanSearchId = useMemo(() => {
        if (!rawId) return ''
        return decodeURIComponent(rawId).replace(/^@/, '')
    }, [rawId])

    const isCurrentUser = Boolean(
        user &&
            cleanSearchId &&
            (String(user?.profile?.id) === cleanSearchId ||
                user?.username?.toLowerCase() === cleanSearchId.toLowerCase() ||
                String(user?.id) === cleanSearchId)
    )
    const isModerator = user?.role?.type === 'moderator'

    const { data, error, isLoading, mutate } = useSWR<StrapiRecord<ProfileData> | null>(
        cleanSearchId ? ['wim-profile', cleanSearchId] : null,
        () => fetchWimProfile(cleanSearchId),
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    )

    // Fallback: If logged-in user matches or data query is pending/empty, populate from session immediately
    const profileData = useMemo(() => {
        if (data) return data
        if (isCurrentUser && user) {
            const username = user.username || 'user'
            return {
                id: (user.profile?.id || user.id) as any,
                attributes: {
                    username,
                    firstName: user.profile?.firstName || '',
                    lastName: user.profile?.lastName || '',
                    biography: user.profile?.biography || '',
                    location: user.profile?.location || null,
                    birthDate: user.profile?.birthDate || null,
                    website: user.profile?.website || null,
                    twitter: user.profile?.twitter || null,
                    github: user.profile?.github || null,
                    linkedin: user.profile?.linkedin || null,
                    avatar: user.profile?.avatar,
                    reputation: user.profile?.reputation || 0,
                    companyRole: user.role?.type || 'member',
                    createdAt: user.createdAt || new Date().toISOString(),
                    teams: { data: [] } as any,
                },
            } as StrapiRecord<ProfileData>
        }
        return null
    }, [data, isCurrentUser, user])

    return {
        profileData,
        error,
        isLoading: userValidating ? true : !cleanSearchId ? false : isLoading && !profileData,
        isCurrentUser,
        isModerator,
        mutate,
    }
}
