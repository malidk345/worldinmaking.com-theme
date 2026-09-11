import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react'

import { NOTEBOOK_INVITE_BOT_IDS, resolveInviteBot } from '../../../../lib/bots/notebook-invite'
import { getNotebookActor } from '../../../../lib/notebook-actor'
import type { NotebookCollaborator } from '../../../../lib/notebook-collaborators-client'
import { splitInlineNodesAt } from './inlineContent'
import type { NotebookInlineNode } from './types'
import { normalizeInlineNodes } from './utils'

export type MentionPerson = {
    id: string
    label: string
    avatar?: string
}

export type MentionToken = {
    start: number
    query: string
}

const MentionPeopleContext = createContext<MentionPerson[] | null>(null)

export function collaboratorToMentionPerson(entry: NotebookCollaborator): MentionPerson | null {
    const person = entry.person
    const label =
        [person?.first_name, person?.last_name].filter(Boolean).join(' ') ||
        person?.username ||
        person?.email ||
        ''
    if (!label.trim()) return null
    return {
        id: person?.username || person?.id || entry.user_id,
        label: label.trim(),
        avatar: person?.avatar_url,
    }
}

export function listMentionPeople(extra: MentionPerson[] = []): MentionPerson[] {
    const actor = getNotebookActor()
    const label = [actor.first_name, actor.last_name].filter(Boolean).join(' ').trim() || 'You'
    const self: MentionPerson = {
        id: actor.username || actor.email || 'you',
        label,
        avatar: actor.avatar_url,
    }
    const seen = new Set([self.id.toLowerCase(), self.label.toLowerCase()])
    const people: MentionPerson[] = [self]
    const add = (person: MentionPerson): void => {
        const keys = [person.id, person.label].map((value) => value.trim().toLowerCase()).filter(Boolean)
        if (keys.some((key) => seen.has(key))) return
        keys.forEach((key) => seen.add(key))
        people.push(person)
    }
    for (const botId of NOTEBOOK_INVITE_BOT_IDS) {
        const bot = resolveInviteBot(botId)
        if (!bot) continue
        add({ id: bot.id, label: bot.name, avatar: bot.avatarUrl })
    }
    extra.forEach(add)
    return people
}

export function NotebookMentionPeopleProvider({
    people,
    children,
}: {
    people: MentionPerson[]
    children: ReactNode
}): JSX.Element {
    return createElement(MentionPeopleContext.Provider, { value: people }, children)
}

export function useNotebookMentionPeople(): MentionPerson[] {
    const extra = useContext(MentionPeopleContext)
    return useMemo(() => (extra ? extra : listMentionPeople()), [extra])
}

export function filterMentionPeople(people: MentionPerson[], query: string): MentionPerson[] {
    const needle = query.trim().toLowerCase()
    if (!needle) return people
    return people.filter(
        (person) => person.label.toLowerCase().includes(needle) || person.id.toLowerCase().includes(needle)
    )
}

/** `@query` at a word boundary immediately before the caret. */
export function getMentionTokenAt(text: string, caret: number = text.length): MentionToken | null {
    const index = Math.max(0, Math.min(caret, text.length))
    const head = text.slice(0, index)
    const atIndex = head.lastIndexOf('@')
    if (atIndex === -1) return null
    const query = head.slice(atIndex + 1)
    if (/\s/.test(query)) return null
    const before = text.slice(0, atIndex)
    if (before.length > 0 && !/\s$/.test(before)) return null
    return { start: atIndex, query }
}

export function insertMentionMark(
    children: NotebookInlineNode[],
    start: number,
    end: number,
    person: MentionPerson
): NotebookInlineNode[] {
    const from = Math.max(0, Math.min(start, end))
    const to = Math.max(from, end)
    const [before, rest] = splitInlineNodesAt(children, from)
    const [, after] = splitInlineNodesAt(rest, to - from)
    return normalizeInlineNodes([
        ...before,
        {
            type: 'text',
            text: `@${person.label}`,
            marks: [{ type: 'mention', id: person.id }],
        },
        ...after,
    ])
}
