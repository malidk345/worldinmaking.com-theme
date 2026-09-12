import { parseMarkdownNotebook } from '../../lib/components/MarkdownNotebook/markdown'
import { isDiscussionCommentNode } from '../../lib/components/MarkdownNotebook/documentModel'
import { parseDiscussionReplies } from '../../lib/components/MarkdownNotebook/discussionComments'
import { resolveInviteBot } from '../../../lib/bots/notebook-invite'
import { getNotebookActor, personDisplayName, type NotebookPerson } from '../../../lib/notebook-actor'
import { getAuthUserId } from '../../../lib/wim-identity'
import type { NotebookCollaborator } from '../../../lib/notebook-collaborators-client'
import type { NotebookPresencePerson } from './notebookPresence'

export { personDisplayName }

export type NotebookFaceRole = 'author' | 'shared' | 'philosopher' | 'here'

export type NotebookFace = {
    key: string
    name: string
    avatar?: string
    role: NotebookFaceRole
}

const ROLE_LABEL: Record<NotebookFaceRole, string> = {
    author: 'Author',
    shared: 'Shared',
    philosopher: 'Philosopher',
    here: 'Here now',
}

export function notebookFaceRoleLabel(role: NotebookFaceRole): string {
    return ROLE_LABEL[role]
}

export function isWeakPerson(person?: NotebookPerson | null): boolean {
    if (!person) return true
    const name = (person.first_name || '').trim().toLowerCase()
    return (!name || name === 'you' || name === 'wim') && !person.username && !person.email && !person.avatar_url
}

export function arePersonsSame(a?: NotebookPerson | null, b?: NotebookPerson | null): boolean {
    if (!a || !b) return false
    if (a === b) return true
    const aUser = (a.username || '').trim().toLowerCase()
    const bUser = (b.username || '').trim().toLowerCase()
    if (aUser && bUser && aUser === bUser) return true
    const aEmail = (a.email || '').trim().toLowerCase()
    const bEmail = (b.email || '').trim().toLowerCase()
    if (aEmail && bEmail && aEmail === bEmail) return true
    const aName = personDisplayName(a).trim().toLowerCase()
    const bName = personDisplayName(b).trim().toLowerCase()
    if (aName && bName && aName === bName && aName !== 'you' && aName !== 'someone') return true
    if (isWeakPerson(a) && isWeakPerson(b)) return true
    return false
}

function faceKey(name: string, extra?: string): string {
    return (extra || name).trim().toLowerCase()
}

export function faceFromPerson(person: NotebookPerson | null | undefined, role: NotebookFaceRole): NotebookFace | null {
    if (!person) return null
    const name = personDisplayName(person)
    const key = faceKey(name, person.username || person.email)
    if (!key) return null
    return { key, name, avatar: person.avatar_url, role }
}

export function mergeNotebookFaces(...groups: Array<NotebookFace | null | undefined | NotebookFace[]>): NotebookFace[] {
    const seen = new Set<string>()
    const out: NotebookFace[] = []
    for (const group of groups) {
        const list = Array.isArray(group) ? group : [group]
        for (const face of list) {
            if (!face?.key || seen.has(face.key)) continue
            seen.add(face.key)
            out.push(face)
        }
    }
    return out
}

export function extractPhilosopherFaces(markdown?: string): NotebookFace[] {
    if (!markdown?.trim()) return []
    try {
        const doc = parseMarkdownNotebook(markdown)
        const faces: NotebookFace[] = []
        for (const annotation of Object.values(doc.annotations || {})) {
            for (const note of annotation.notes || []) {
                const bot = resolveInviteBot(note.by)
                if (note.kind === 'bot' || bot) {
                    faces.push({
                        key: faceKey(note.name || note.by, note.by),
                        name: note.name || bot?.displayName || note.by,
                        avatar: note.avatar || bot?.avatarUrl,
                        role: 'philosopher',
                    })
                } else if (note.kind === 'human' && (note.name || note.by)) {
                    faces.push({
                        key: faceKey(note.name || note.by, note.by),
                        name: note.name || note.by,
                        avatar: note.avatar,
                        role: 'shared',
                    })
                }
            }
        }
        for (const node of doc.nodes) {
            if (!isDiscussionCommentNode(node) && !(node.type === 'component' && node.tagName === 'Comment')) {
                continue
            }
            for (const reply of parseDiscussionReplies(node.props.replies)) {
                if (!reply.botId) continue
                const bot = resolveInviteBot(reply.botId)
                faces.push({
                    key: faceKey(reply.author || reply.botId, reply.botId),
                    name: reply.author || bot?.displayName || reply.botId,
                    avatar: bot?.avatarUrl,
                    role: 'philosopher',
                })
            }
        }
        return mergeNotebookFaces(faces)
    } catch {
        return []
    }
}

export function facesFromCollaborators(people: NotebookCollaborator[], ownerKey?: string): NotebookFace[] {
    return mergeNotebookFaces(
        people.map((entry) => {
            const person = entry.person
            const name =
                [person?.first_name, person?.last_name].filter(Boolean).join(' ') ||
                person?.username ||
                person?.email ||
                'Member'
            const key = faceKey(name, person?.username || person?.id || entry.user_id)
            if (ownerKey && key === ownerKey) return null
            return {
                key,
                name,
                avatar: person?.avatar_url,
                role: 'shared' as const,
            }
        })
    )
}

export function facesFromPresence(
    people: NotebookPresencePerson[],
    skipKeys: Set<string>,
    currentUserId?: string | null
): NotebookFace[] {
    const activeUserId = (currentUserId ?? (typeof window !== 'undefined' ? getAuthUserId() : null)) || null
    return mergeNotebookFaces(
        people.map((peer) => {
            // If this presence belongs to the signed-in user on another tab/device, skip it
            if (activeUserId && peer.userId && peer.userId === activeUserId) {
                return null
            }
            const peerName = (peer.name || '').trim()
            const key = faceKey(peerName, peer.userId || peerName)
            if (!key) return null
            if (skipKeys.has(key)) return null
            if (skipKeys.has(peerName.toLowerCase())) return null
            if (peer.userId && skipKeys.has(peer.userId.toLowerCase())) return null
            return { key, name: peerName || 'Someone', avatar: peer.avatarUrl, role: 'here' as const }
        })
    )
}

export function collectLocalNotebookFaces(input: {
    createdBy?: NotebookPerson | null
    lastModifiedBy?: NotebookPerson | null
    markdown?: string
    currentActor?: NotebookPerson | null
}): NotebookFace[] {
    let authorPerson = input.createdBy
    let modifierPerson = input.lastModifiedBy
    const actor = input.currentActor || (typeof window !== 'undefined' ? getNotebookActor() : null)

    // Upgrade weak "You" to active logged-in actor or modifier
    if (isWeakPerson(authorPerson)) {
        if (!isWeakPerson(modifierPerson)) {
            authorPerson = modifierPerson
        } else if (!isWeakPerson(actor)) {
            authorPerson = actor
        }
    }
    if (isWeakPerson(modifierPerson)) {
        if (!isWeakPerson(authorPerson)) {
            modifierPerson = authorPerson
        } else if (!isWeakPerson(actor)) {
            modifierPerson = actor
        }
    }

    const authorFace = faceFromPerson(authorPerson, 'author')
    const modifierFace = faceFromPerson(modifierPerson, 'shared')

    // If author and modifier resolve to the same person, only show author
    const effectiveModifier =
        authorFace && modifierFace && arePersonsSame(authorPerson, modifierPerson)
            ? null
            : modifierFace

    return mergeNotebookFaces(
        authorFace,
        effectiveModifier,
        extractPhilosopherFaces(input.markdown)
    )
}

