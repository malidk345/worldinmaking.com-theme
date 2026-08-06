import { useMemo } from 'react'
import useSWR from 'swr'
import { ProfileData, StrapiRecord } from 'lib/strapi'
import { useUser } from 'hooks/useUser'
import { supabase } from 'lib/supabase'

function mapDbProfileToStrapi(dbProfile: any): StrapiRecord<ProfileData> {
    const username = dbProfile.username || 'user'
    const display = username
        .split(/[-_]/)
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

    return {
        id: dbProfile.id as any,
        attributes: {
            username,
            firstName: display,
            lastName: '',
            biography: dbProfile.bio || '',
            location: dbProfile.location || null,
            website: dbProfile.website || null,
            twitter: dbProfile.twitter || null,
            github: dbProfile.github || null,
            linkedin: dbProfile.linkedin || null,
            pronouns: dbProfile.pronouns || null,
            reputation: 0,
            company: null,
            companyRole: dbProfile.role || 'member',
            country: null,
            amaEnabled: false,
            height: null,
            bookmarks: [],
            gravatarURL: null,
            createdAt: dbProfile.created_at || new Date().toISOString(),
            updatedAt: dbProfile.updated_at || null,
            publishedAt: dbProfile.created_at || null,
            questionSubscriptions: { data: [] } as any,
            topicSubscriptions: { data: [] } as any,
            avatar: dbProfile.avatar_url
                ? ({
                      data: {
                          id: 0,
                          attributes: { url: dbProfile.avatar_url },
                      },
                  } as any)
                : undefined,
            achievements: [] as any,
            teams: { data: [] } as any,
        } as any,
    }
}

async function fetchWimProfile(identifier: string): Promise<StrapiRecord<ProfileData> | null> {
    const rawId = identifier.trim()
    if (!rawId) return null

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)

    let query = supabase.from('profiles').select('*')
    if (isUuid) {
        query = query.eq('id', rawId)
    } else if (/^\d+$/.test(rawId)) {
        // Legacy numeric ids are not used in WIM; try username fallback only
        query = query.ilike('username', rawId)
    } else {
        query = query.ilike('username', rawId)
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
    const rawId = identifier ? String(identifier).trim() : ''
    const { user } = useUser()

    const isCurrentUser = Boolean(
        rawId &&
            (String(user?.profile?.id) === rawId ||
                user?.username?.toLowerCase() === rawId.toLowerCase() ||
                String(user?.id) === rawId)
    )
    const isModerator = user?.role?.type === 'moderator'

    const { data, error, isLoading, mutate } = useSWR<StrapiRecord<ProfileData> | null>(
        rawId ? ['wim-profile', rawId] : null,
        () => fetchWimProfile(rawId),
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    )

    // If logged-in user matches and SWR empty, use session profile instantly
    const profileData = useMemo(() => {
        if (data) return data
        if (isCurrentUser && user?.profile) {
            return {
                id: user.profile.id as any,
                attributes: {
                    ...user.profile,
                    firstName: user.profile.firstName || user.username,
                    biography: user.profile.biography || '',
                },
            } as StrapiRecord<ProfileData>
        }
        return null
    }, [data, isCurrentUser, user])

    return {
        profileData,
        error,
        isLoading: !rawId ? true : isLoading && !profileData,
        isCurrentUser,
        isModerator,
        mutate,
    }
}
