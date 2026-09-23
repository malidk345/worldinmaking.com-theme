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

describe('archive storage owner namespace', () => {
    beforeEach(() => {
        vi.resetModules()
    })
    afterEach(() => {
        delete (globalThis as { window?: unknown }).window
    })

    it('writes under owner-namespaced key and does not leak into signed-in from global', async () => {
        const localStorage = memoryStorage()
        ;(globalThis as { window?: unknown }).window = {
            localStorage,
            sessionStorage: memoryStorage(),
            dispatchEvent() {
                return true
            },
            addEventListener() {},
            removeEventListener() {},
        }
        localStorage.setItem(
            'wim_os_archived_items_v2',
            JSON.stringify([{ url: '/notes', label: 'Alice note leak', archivedAt: '2026-01-01', note: 'secret' }])
        )
        localStorage.setItem('wim_auth_user_id', 'user-aaaa-bbbb-cccc-ddddeeee')
        const mod = await import('./archive-storage')
        expect(mod.loadArchivedItemsFromStorage()).toEqual([])
        mod.saveArchivedItemsToStorage([
            { url: '/ai', label: 'WIM AI', archivedAt: '2026-09-23', note: 'alice only' },
        ])
        expect(localStorage.getItem('wim_os_archived_items_v2')).toContain('Alice note leak')
        expect(localStorage.getItem(mod.getArchiveStorageKey())).toContain('alice only')
        expect(mod.getArchiveStorageKey()).toContain('user-aaaa-bbbb-cccc-ddddeeee')
    })

    it('guest migrates legacy global archive into namespaced key', async () => {
        const localStorage = memoryStorage()
        ;(globalThis as { window?: unknown }).window = {
            localStorage,
            sessionStorage: memoryStorage(),
            dispatchEvent() {
                return true
            },
            addEventListener() {},
            removeEventListener() {},
        }
        localStorage.setItem('wim_chat_owner_key', 'device-owner-key-12345678')
        localStorage.setItem(
            'wim_os_archived_items_v2',
            JSON.stringify([{ url: '/archive-me', label: 'Guest app', archivedAt: '2026-01-01', note: 'guest note' }])
        )
        const mod = await import('./archive-storage')
        const loaded = mod.loadArchivedItemsFromStorage()
        expect(loaded[0]?.note).toBe('guest note')
        expect(localStorage.getItem(mod.getArchiveStorageKey())).toContain('guest note')
    })
})
