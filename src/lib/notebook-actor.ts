import type { User } from 'hooks/useUser'
import { resolveUserOrPhilosopherAvatar } from './user-portraits'

export type NotebookPerson = {
    first_name: string
    last_name?: string
    email?: string
    username?: string
    avatar_url?: string
}

let actor: NotebookPerson | null = null

export function setNotebookActor(next: NotebookPerson | null): void {
    actor = next
}

export function getNotebookActor(): NotebookPerson {
    return actor || { first_name: 'You' }
}

export function userToNotebookActor(user: User | null | undefined): NotebookPerson | null {
    if (!user) return null
    const username = user.username || user.profile?.username || ''
    const first = user.profile?.firstName || username || 'You'
    const last = user.profile?.lastName || undefined
    const profile = user.profile as { avatar?: { url?: string; data?: { attributes?: { url?: string } } }; gravatarURL?: string } | undefined
    const raw = profile?.avatar?.url || profile?.avatar?.data?.attributes?.url || profile?.gravatarURL || ''
    const avatar = resolveUserOrPhilosopherAvatar(username, raw) || raw || undefined
    return {
        first_name: first,
        last_name: last,
        email: user.email || undefined,
        username: username || undefined,
        avatar_url: avatar,
    }
}

export function formatEditedAgo(dateStr?: string): string {
    if (!dateStr) return 'just now'
    const ms = Date.now() - new Date(dateStr).getTime()
    if (!Number.isFinite(ms) || ms < 45_000) return 'just now'
    const minutes = Math.floor(ms / 60_000)
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`
    return new Date(dateStr).toLocaleDateString()
}
