export type NameFields = {
    first_name?: string | null
    last_name?: string | null
    firstName?: string | null
    lastName?: string | null
    username?: string | null
}

export function formatDisplayName(person: NameFields | null | undefined): {
    firstName: string
    lastName: string
    fullName: string
    username: string
} {
    const username = String(person?.username || '').trim()
    const first = String(person?.first_name || person?.firstName || '').trim()
    const last = String(person?.last_name || person?.lastName || '').trim()
    const fullName = [first, last].filter(Boolean).join(' ') || username || 'Community Member'
    return {
        firstName: first || (last ? '' : username || 'Community Member'),
        lastName: last,
        fullName,
        username,
    }
}
