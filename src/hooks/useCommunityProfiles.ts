import React, { useEffect } from 'react'
import useSWR from 'swr'
import { supabase } from 'lib/supabase'
import { resolveUserOrPhilosopherAvatar } from 'lib/user-portraits'

const PROFILES_PER_PAGE = 25

export type CommunityProfile = {
    id: string | number
    firstName: string | null
    lastName: string | null
    email: string | null
    createdAt: string | null
    reputation: number | null
    avatarUrl: string | null
    color: string | null
    isTeamMember: boolean
    username?: string | null
}

export type CommunityProfilesFilters = {
    minReputation?: number | null
    search?: string
    teamMember?: 'any' | 'yes' | 'no'
    sort?: string
}

function mapRow(row: any): CommunityProfile {
    const username = row.username || null
    const display = username
        ? username
              .split(/[-_]/)
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
        : null
    return {
        id: row.id,
        firstName: display,
        lastName: null,
        email: null,
        createdAt: row.created_at || null,
        reputation: null,
        avatarUrl: resolveUserOrPhilosopherAvatar(username, row.avatar_url) || null,
        color: null,
        isTeamMember: row.role === 'admin' || row.role === 'moderator',
        username,
    }
}

function applyFilters(q: any, filters: CommunityProfilesFilters) {
    let query = q
    if (filters.search?.trim()) {
        query = query.ilike('username', `%${filters.search.trim()}%`)
    }
    if (filters.teamMember === 'yes') {
        query = query.in('role', ['admin', 'moderator'])
    } else if (filters.teamMember === 'no') {
        query = query.not('role', 'in', '("admin","moderator")')
    }
    // Hide bots when column exists
    query = query.or('is_bot.is.null,is_bot.eq.false')
    return query
}

export async function fetchAllCommunityProfiles(
    filters: CommunityProfilesFilters,
    _getJwt?: () => Promise<string | null>,
    pageSize = 100
): Promise<CommunityProfile[]> {
    const all: CommunityProfile[] = []
    let from = 0
    for (let page = 0; page < 30; page++) {
        let q = supabase
            .from('profiles')
            .select('id, username, avatar_url, role, created_at, is_bot')
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1)
        q = applyFilters(q, filters)
        const { data, error } = await q
        if (error) {
            console.warn('[useCommunityProfiles] export', error.message)
            break
        }
        if (!data?.length) break
        all.push(...data.map(mapRow))
        if (data.length < pageSize) break
        from += pageSize
    }
    return all
}

export function useCommunityProfiles({
    filters = {},
    pageSize = PROFILES_PER_PAGE,
    enabled = true,
}: {
    filters?: CommunityProfilesFilters
    pageSize?: number
    enabled?: boolean
} = {}) {
    const [currentPage, setCurrentPage] = React.useState(0)

    const key = enabled ? ['wim-community-profiles', JSON.stringify(filters), currentPage, pageSize] : null

    const { data, isLoading, error, isValidating, mutate } = useSWR(
        key,
        async () => {
            const from = currentPage * pageSize
            const to = from + pageSize - 1

            // Count
            let countQ = supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
            countQ = applyFilters(countQ, filters)
            const { count } = await countQ

            let q = supabase
                .from('profiles')
                .select('id, username, avatar_url, role, created_at, is_bot')
                .order('created_at', { ascending: false })
                .range(from, to)
            q = applyFilters(q, filters)

            const { data: rows, error: err } = await q
            if (err) throw err
            return {
                profiles: (rows || []).map(mapRow),
                total: count ?? 0,
            }
        },
        { revalidateOnFocus: false }
    )

    const profiles = data?.profiles || []
    const total = data?.total ?? 0
    const totalPages = total ? Math.ceil(total / pageSize) : 0
    const hasNextPage = currentPage < totalPages - 1
    const hasPrevPage = currentPage > 0

    useEffect(() => {
        setCurrentPage(0)
    }, [filters.minReputation, filters.search, filters.teamMember, filters.sort, pageSize])

    const goToPage = React.useCallback(
        (page: number) => {
            if (page < 0 || page >= totalPages) return
            setCurrentPage(page)
        },
        [totalPages]
    )

    const nextPage = React.useCallback(() => {
        if (hasNextPage) setCurrentPage((page) => page + 1)
    }, [hasNextPage])

    const prevPage = React.useCallback(() => {
        if (hasPrevPage) setCurrentPage((page) => page - 1)
    }, [hasPrevPage])

    return {
        profiles,
        isLoading,
        isValidating,
        error,
        total,
        currentPage,
        totalPages,
        pageSize,
        hasNextPage,
        hasPrevPage,
        nextPage,
        prevPage,
        goToPage,
        mutate,
    }
}
