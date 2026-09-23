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

describe('notebook history identity leftovers', () => {
    beforeEach(() => {
        vi.resetModules()
    })
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
    })

    function installWindow(localStorage: Storage) {
        const listeners = new Map<string, Set<(event: Event) => void>>()
        ;(globalThis as { window?: unknown }).window = {
            localStorage,
            sessionStorage: memoryStorage(),
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
    }

    it('clears wim_notebook_history_* when notebook owner identity changes', async () => {
        const localStorage = memoryStorage()
        installWindow(localStorage)
        localStorage.setItem('wim_auth_user_id', 'user-aaaa-bbbb-cccc-ddddeeee')
        const mod = await import('./notebook-history-identity')
        const { WIM_IDENTITY_EVENT } = await import('./wim-identity')
        mod.syncNotebookHistoryForIdentity()
        localStorage.setItem(
            `${mod.HISTORY_KEY_PREFIX}nb-alice`,
            JSON.stringify([{ version: 1, title: 'Secret', content: 'alice body', timestamp: '2026-01-01' }])
        )
        expect(localStorage.getItem(`${mod.HISTORY_KEY_PREFIX}nb-alice`)).toContain('alice body')

        localStorage.removeItem('wim_auth_user_id')
        window.dispatchEvent(new Event(WIM_IDENTITY_EVENT))
        expect(localStorage.getItem(`${mod.HISTORY_KEY_PREFIX}nb-alice`)).toBeNull()
    })

    it('keeps history on same-owner identity event', async () => {
        const localStorage = memoryStorage()
        installWindow(localStorage)
        localStorage.setItem('wim_auth_user_id', 'user-aaaa-bbbb-cccc-ddddeeee')
        const mod = await import('./notebook-history-identity')
        const { WIM_IDENTITY_EVENT } = await import('./wim-identity')
        mod.syncNotebookHistoryForIdentity()
        localStorage.setItem(
            `${mod.HISTORY_KEY_PREFIX}nb-keep`,
            JSON.stringify([{ version: 2, title: 'Keep', content: 'body', timestamp: '2026-01-02' }])
        )
        window.dispatchEvent(new Event(WIM_IDENTITY_EVENT))
        expect(localStorage.getItem(`${mod.HISTORY_KEY_PREFIX}nb-keep`)).toContain('body')
    })
})
