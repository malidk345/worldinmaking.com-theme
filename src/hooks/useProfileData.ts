import { useState, useEffect } from 'react'
import useSWR from 'swr'
import qs from 'qs'
import { ProfileData, StrapiRecord } from 'lib/strapi'
import { useUser } from 'hooks/useUser'
import { supabase } from 'lib/supabase'

export function useProfileData(identifier?: string | number) {
    const rawId = identifier ? String(identifier).trim() : ''
    const isNumericId = Boolean(rawId && /^\d+$/.test(rawId))
    const numericId = isNumericId ? parseInt(rawId) : null
    const { user, getJwt } = useUser()

    const isCurrentUser = Boolean(
        rawId && (String(user?.profile?.id) === rawId || user?.username?.toLowerCase() === rawId.toLowerCase())
    )
    const isModerator = user?.role?.type === 'moderator'

    const profileQuery = qs.stringify(
        {
            populate: {
                avatar: true,
                role: {
                    select: ['type'],
                },
                achievements: {
                    ...(!isCurrentUser
                        ? {
                              filters: {
                                  hidden: {
                                      $ne: true,
                                  },
                              },
                          }
                        : null),
                    populate: {
                        achievement: {
                            populate: {
                                image: true,
                                icon: true,
                                achievement_group: {
                                    populate: {
                                        icon: true,
                                    },
                                },
                            },
                        },
                    },
                },
                teams: {
                    populate: {
                        leadProfiles: true,
                        profiles: {
                            populate: ['avatar', 'teams', 'pronouns'],
                        },
                        crest: true,
                    },
                },
                tShirt: true,
                ...(isModerator
                    ? {
                          user: true,
                      }
                    : null),
            },
        },
        {
            encodeValuesOnly: true,
        }
    )

    const {
        data: swrData,
        error,
        isLoading,
        mutate,
    } = useSWR<StrapiRecord<ProfileData>>(
        rawId && isNumericId
            ? `${process.env.NEXT_PUBLIC_SQUEAK_API_HOST}/api/profiles/${numericId}?${profileQuery}`
            : null,
        async (url) => {
            try {
                const jwt = user && (await getJwt())
                const res = await fetch(
                    url,
                    jwt
                        ? {
                              headers: {
                                  Authorization: `Bearer ${jwt}`,
                              },
                          }
                        : undefined
                )
                if (!res.ok) return null
                const { data } = await res.json()
                return data
            } catch {
                return null
            }
        }
    )

    const [fallbackProfile, setFallbackProfile] = useState<StrapiRecord<ProfileData> | null>(null)

    useEffect(() => {
        if (!swrData && rawId) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)
            const lowerRawId = rawId.toLowerCase()

            const fetchFallback = async () => {
                try {
                    let dbProfile: any = null
                    if (supabase) {
                        let query = supabase.from('profiles').select('*')
                        if (isUuid) {
                            query = query.eq('id', rawId)
                        } else {
                            query = query.ilike('username', lowerRawId)
                        }
                        const { data } = await query.maybeSingle()
                        if (data) dbProfile = data
                    }

                    if (dbProfile) {
                        const username = dbProfile.username || lowerRawId
                        const capitalizedUsername = username
                            .split(/[-_]/)
                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')

                        if (typeof window !== 'undefined' && username && isUuid) {
                            window.history.replaceState(null, '', `/profile/${encodeURIComponent(username)}`)
                        }

                        setFallbackProfile({
                            id: dbProfile.id,
                            attributes: {
                                username: username,
                                firstName: capitalizedUsername,
                                lastName: '',
                                biography: dbProfile.bio || 'Philosopher & Community Theorist',
                                location: dbProfile.location || '',
                                website: dbProfile.website || '',
                                twitter: dbProfile.twitter || '',
                                github: dbProfile.github || '',
                                linkedin: dbProfile.linkedin || '',
                                pronouns: dbProfile.pronouns || '',
                                reputation: 500,
                                avatar: dbProfile.avatar_url
                                    ? { data: { attributes: { url: dbProfile.avatar_url } } }
                                    : null,
                                companyRole: dbProfile.role || 'Resident Philosopher',
                                achievements: [],
                                teams: { data: [] },
                            },
                        } as any)
                    } else if (
                        user?.profile &&
                        (String(user.profile.id) === rawId || user.username?.toLowerCase() === lowerRawId)
                    ) {
                        setFallbackProfile({
                            id: user.profile.id,
                            attributes: user.profile,
                        } as any)
                    } else {
                        const cleanName = lowerRawId
                            .split(/[-_]/)
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')

                        setFallbackProfile({
                            id: rawId,
                            attributes: {
                                username: lowerRawId,
                                firstName: cleanName,
                                lastName: '',
                                biography: 'PostHog Resident Thinker & Community Member',
                                reputation: 250,
                                avatar: {
                                    data: {
                                        attributes: {
                                            url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                                lowerRawId
                                            )}`,
                                        },
                                    },
                                },
                                companyRole: 'Resident Philosopher',
                                achievements: [],
                                teams: { data: [] },
                            },
                        } as any)
                    }
                } catch {
                    setFallbackProfile({
                        id: rawId,
                        attributes: {
                            username: rawId,
                            firstName: rawId,
                            lastName: '',
                            reputation: 100,
                            achievements: [],
                            teams: { data: [] },
                        },
                    } as any)
                }
            }

            void fetchFallback()
        }
    }, [swrData, rawId, user])

    const profileData = swrData || fallbackProfile
    const finalLoading = !rawId ? true : isNumericId ? isLoading : !profileData

    return {
        profileData,
        error,
        isLoading: finalLoading,
        isCurrentUser,
        isModerator,
        mutate,
    }
}
