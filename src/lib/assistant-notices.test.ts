// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function memoryStorage(): Storage {
    const map = new Map<string, string>()
    return {
        get length() {
            return map.size
        },
        clear() {
            map.clear()
        },
        getItem(key: string) {
            return map.has(key) ? (map.get(key) as string) : null
        },
        key(index: number) {
            return Array.from(map.keys())[index] ?? null
        },
        removeItem(key: string) {
            map.delete(key)
        },
        setItem(key: string, value: string) {
            map.set(key, value)
        },
    }
}

function installWindow() {
    const localStorage = memoryStorage()
    const sessionStorage = memoryStorage()
    const listeners = new Map<string, Set<(event: Event) => void>>()
    ;(globalThis as { window?: unknown }).window = {
        localStorage,
        sessionStorage,
        dispatchEvent(event: Event) {
            listeners.get(event.type)?.forEach((fn) => fn(event))
            return true
        },
        addEventListener(type: string, fn: (event: Event) => void) {
            if (!listeners.has(type)) listeners.set(type, new Set())
            listeners.get(type)!.add(fn)
        },
        removeEventListener(type: string, fn: (event: Event) => void) {
            listeners.get(type)?.delete(fn)
        },
    }
    return { localStorage }
}

const aliceNb = {
    id: 'nb-alice',
    title: 'Alice private diary',
    content: 'Alice wrote a long private reflection about her secrets and plans.',
    updatedAt: '2026-09-01T00:00:00.000Z',
}
const bobNb = {
    id: 'nb-bob',
    title: 'Bob research notes',
    content: 'Bob keeps research notes that must not leak into Alice AI context.',
    updatedAt: '2026-09-02T00:00:00.000Z',
}

describe('collectUserNotebooks owner scope', () => {
    beforeEach(() => {
        vi.resetModules()
    })
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
    })

    it('does not scan other owners wim_notebooks_v3:* into AI digests', async () => {
        const { localStorage } = installWindow()
        localStorage.setItem('wim_auth_user_id', 'user-aaaa-bbbb-cccc-ddddeeee')
        localStorage.setItem(
            'wim_notebooks_v3:user-bbbb-cccc-dddd-eeeeffff',
            JSON.stringify([bobNb])
        )
        localStorage.setItem(
            'wim_notebooks_v3:user-aaaa-bbbb-cccc-ddddeeee',
            JSON.stringify([aliceNb])
        )
        localStorage.setItem('wim_notebooks_v3', JSON.stringify([bobNb]))

        const { collectUserNotebooks } = await import('./assistant-notices')
        const found = collectUserNotebooks()
        expect(found.map((n) => n.id)).toEqual(['nb-alice'])
        expect(found.some((n) => n.id === 'nb-bob')).toBe(false)
    })

    it('does not migrate legacy global notebooks into signed-in AI digest', async () => {
        const { localStorage } = installWindow()
        localStorage.setItem('wim_auth_user_id', 'user-aaaa-bbbb-cccc-ddddeeee')
        localStorage.setItem('wim_notebooks_v3', JSON.stringify([bobNb]))
        localStorage.setItem('wim_notebooks_v2', JSON.stringify([bobNb]))

        const { collectUserNotebooks } = await import('./assistant-notices')
        expect(collectUserNotebooks()).toEqual([])
    })
})

describe('collectUserWorld chat titles owner scope', () => {
    beforeEach(() => {
        vi.resetModules()
    })
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
    })

    it('does not fall back to global claude_workspace_chats_v7 when signed in', async () => {
        const { localStorage } = installWindow()
        localStorage.setItem('wim_auth_user_id', 'user-aaaa-bbbb-cccc-ddddeeee')
        localStorage.setItem(
            'claude_workspace_chats_v7',
            JSON.stringify([{ id: 'c1', title: 'Prev owner secret chat', messages: [] }])
        )

        const { collectUserWorld } = await import('./assistant-world')
        const world = collectUserWorld()
        expect(world.chats.some((c) => c.title.includes('Prev owner'))).toBe(false)
        expect(world.chats).toEqual([])
    })
})
