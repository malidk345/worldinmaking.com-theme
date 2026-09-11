import { ScratchpadStore } from './scratchpad-store'
import { collectUserNotebooks, type NotebookBrief } from './assistant-notices'
import { DEVICE_CHAT_OWNER_KEY, getActiveOwnerKey, namespacedStorageKey } from './wim-identity'

export type WorldWindow = { path: string; title: string }
export type WorldChat = { title: string }
export type WorldForum = { title: string }
export type WorldProfile = { name?: string; username?: string; bio?: string }

type WorldExtras = {
    windows: WorldWindow[]
    profile: WorldProfile | null
    forum: WorldForum[]
}

const extras: WorldExtras = { windows: [], profile: null, forum: [] }

export function setAssistantWorldWindows(windows: WorldWindow[]): void {
    extras.windows = windows.slice(0, 12)
}

export function setAssistantWorldProfile(profile: WorldProfile | null): void {
    extras.profile = profile
}

export function setAssistantWorldForum(forum: WorldForum[]): void {
    extras.forum = forum.slice(0, 8)
}

export type UserWorld = {
    notebooks: NotebookBrief[]
    scratchpad: {
        nodes: Array<{ title?: string; content: string; type?: string }>
        tasks: Array<{ title: string; status: string }>
        memories: Array<{ fact: string }>
        documents: Array<{ name: string }>
    }
    windows: WorldWindow[]
    profile: WorldProfile | null
    chats: WorldChat[]
    forum: WorldForum[]
}

function collectChats(): WorldChat[] {
    if (typeof window === 'undefined') return []
    try {
        const key = namespacedStorageKey('claude_workspace_chats_v7', getActiveOwnerKey(DEVICE_CHAT_OWNER_KEY))
        const raw = window.localStorage.getItem(key) || window.localStorage.getItem('claude_workspace_chats_v7')
        const parsed = raw ? JSON.parse(raw) : []
        if (!Array.isArray(parsed)) return []
        return parsed
            .slice(0, 8)
            .map((item: { title?: unknown }) => ({
                title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : 'Untitled chat',
            }))
    } catch {
        return []
    }
}

export function collectUserWorld(): UserWorld {
    const pad = ScratchpadStore.getState()
    return {
        notebooks: collectUserNotebooks(),
        scratchpad: {
            nodes: pad.nodes.slice(0, 12).map((n) => ({ title: n.title, content: n.content, type: n.type })),
            tasks: pad.tasks.slice(0, 12).map((t) => ({ title: t.title, status: t.status })),
            memories: pad.memories.slice(0, 12).map((m) => ({ fact: m.fact })),
            documents: pad.documents.slice(0, 8).map((d) => ({ name: d.name })),
        },
        windows: extras.windows,
        profile: extras.profile,
        chats: collectChats(),
        forum: extras.forum,
    }
}

export function worldDigest(world: UserWorld = collectUserWorld()): string {
    const lines: string[] = []
    if (world.profile?.name || world.profile?.username) {
        lines.push(
            `User: ${world.profile.name || world.profile.username}${
                world.profile.bio ? ` — ${world.profile.bio.slice(0, 180)}` : ''
            }`
        )
    }
    if (world.windows.length) {
        lines.push(`Open windows: ${world.windows.map((w) => w.title || w.path).join(', ')}`)
    }
    if (world.notebooks.length) {
        lines.push(
            'Notebooks:\n' +
                world.notebooks
                    .slice(0, 6)
                    .map((nb) => {
                        const clip = nb.content.replace(/[#>*_`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 700)
                        return `- "${nb.title}" (id ${nb.id}): ${clip || '(empty)'}`
                    })
                    .join('\n')
        )
    } else {
        lines.push('Notebooks: none.')
    }
    const pad = world.scratchpad
    if (pad.tasks.length) lines.push(`Scratchpad tasks: ${pad.tasks.map((t) => `${t.title} [${t.status}]`).join('; ')}`)
    if (pad.memories.length) lines.push(`Scratchpad memory: ${pad.memories.map((m) => m.fact).join('; ')}`)
    if (pad.nodes.length) {
        lines.push(
            `Scratchpad notes: ${pad.nodes
                .slice(0, 6)
                .map((n) => n.title || n.content.slice(0, 80))
                .join('; ')}`
        )
    }
    if (pad.documents.length) lines.push(`Scratchpad files: ${pad.documents.map((d) => d.name).join(', ')}`)
    if (world.chats.length) lines.push(`WIM AI chats: ${world.chats.map((c) => c.title).join('; ')}`)
    if (world.forum.length) lines.push(`Forum posts: ${world.forum.map((f) => f.title).join('; ')}`)
    return lines.join('\n\n')
}

export function worldAsWorkspace(world: UserWorld = collectUserWorld()) {
    return {
        path: '/assistant',
        user: world.profile
            ? {
                  name: world.profile.name,
                  username: world.profile.username,
                  bio: world.profile.bio,
              }
            : undefined,
        windows: world.windows,
        notebooks: world.notebooks.slice(0, 12).map((nb) => ({
            id: nb.id,
            title: nb.title,
            content: nb.content.slice(0, 8000),
        })),
        notebookId: world.notebooks[0]?.id,
        notebookTitle: world.notebooks[0]?.title,
        scratchpad: {
            documents: world.scratchpad.documents.map((d) => ({ name: d.name, content: '', type: 'document' })),
            nodes: world.scratchpad.nodes.map((n) => ({ type: n.type || 'note', title: n.title, content: n.content })),
            tasks: world.scratchpad.tasks,
            memories: world.scratchpad.memories,
        },
    }
}
